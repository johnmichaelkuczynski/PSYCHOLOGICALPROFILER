import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeText, analyzeTextWithAllProviders, type ModelProvider } from "./ai";
import { parseDocument } from "./documentParser";
import { generateWordDocument, generatePdfDocument } from "./documentGenerator";
import { sendEmail } from "./emailService";
import { generateComprehensiveReport } from "./ai/comprehensiveReport";
import { generateComprehensivePsychologicalReport } from "./ai/psychologicalComprehensiveReport";
import { AuthService } from "./auth";
import { TokenService } from "./tokenService";
import { StripeService } from "./stripeService";
import { authMiddleware, requireAuth, checkTokenLimits, checkFileUploadPermissions, type AuthenticatedRequest } from "./middleware";
import multer from "multer";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import session from "express-session";
import cookieParser from "cookie-parser";

const analyzeRequestSchema = z.object({
  text: z.string().min(100, "Text must be at least 100 characters long"),
  modelProvider: z.enum(["openai", "anthropic", "perplexity"]).default("openai"),
  analysisType: z.enum(["cognitive", "psychological"]).default("cognitive")
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  }));

  // Apply auth middleware to all routes
  app.use(authMiddleware);

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB file size limit
    },
  });

  // Authentication routes
  app.post("/api/auth/register", async (req: AuthenticatedRequest, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const authResult = await AuthService.register(email, password);
      const sessionUser = AuthService.toSessionUser(authResult.user);
      
      // Store user in session
      req.session!.user = sessionUser;
      
      res.json({ 
        user: sessionUser,
        message: 'Registration successful' 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Registration failed' 
      });
    }
  });

  app.post("/api/auth/login", async (req: AuthenticatedRequest, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const authResult = await AuthService.login(email, password);
      const sessionUser = AuthService.toSessionUser(authResult.user);
      
      // Store user in session
      req.session!.user = sessionUser;
      
      res.json({ 
        user: sessionUser,
        message: 'Login successful' 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ 
        error: error instanceof Error ? error.message : 'Login failed' 
      });
    }
  });

  app.post("/api/auth/logout", (req: AuthenticatedRequest, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logout successful' });
    });
  });

  app.get("/api/auth/me", (req: AuthenticatedRequest, res) => {
    if (req.user) {
      res.json({ user: req.user });
    } else {
      res.json({ user: null });
    }
  });

  // Payment routes
  app.post("/api/payments/create-intent", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { amount, tokens } = req.body;
      
      if (!amount || !tokens || !req.user) {
        return res.status(400).json({ error: 'Amount and tokens are required' });
      }

      const paymentIntent = await StripeService.createPaymentIntent({
        amount,
        tokens,
        userId: req.user.id,
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id 
      });
    } catch (error) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Payment creation failed' 
      });
    }
  });

  app.get("/api/payments/pricing", (req, res) => {
    res.json({ pricing: StripeService.getTokenPricing() });
  });

  app.post("/api/payments/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    
    try {
      const event = StripeService.verifyWebhookSignature(req.body, sig);
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          await StripeService.handleSuccessfulPayment(event.data.object.id);
          break;
        case 'payment_intent.payment_failed':
          await StripeService.handleFailedPayment(event.data.object.id);
          break;
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  });

  // Analysis endpoint - using all providers
  app.post("/api/analyze-all", async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body
      const { text, analysisType } = analyzeRequestSchema.omit({ modelProvider: true }).parse(req.body);
      
      // Call all AI APIs and get combined results
      const analyses = await analyzeTextWithAllProviders(text, analysisType);
      
      // Return all analysis results
      res.json(analyses);
    } catch (error) {
      console.error(`Error analyzing text with all providers (${req.body.analysisType || 'cognitive'}):`, error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: fromZodError(error).message 
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze text. Please try again.";
      res.status(500).json({ 
        message: errorMessage 
      });
    }
  });
  
  // Analysis endpoint - single provider
  app.post("/api/analyze", async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body
      const { text, modelProvider, analysisType } = analyzeRequestSchema.parse(req.body);
      
      // Get estimated tokens
      const estimatedTokens = req.estimatedTokens!;
      
      // Call appropriate AI API based on selected provider and analysis type
      const analysis = await analyzeText(text, modelProvider, analysisType);
      
      // Check if we need to truncate results for free users who exceeded input limits
      let finalAnalysis = analysis;
      const isPartialResult = req.body.allowPartial === true;
      
      if (isPartialResult && !req.user) {
        finalAnalysis = TokenService.truncateResult(analysis);
      }
      
      // Deduct tokens after successful analysis
      if (req.user) {
        await TokenService.deductRegisteredUserTokens(
          req.user.id,
          estimatedTokens,
          'analysis',
          `${modelProvider} ${analysisType} analysis`
        );
      } else {
        await TokenService.deductAnonymousTokens(
          req.sessionId!,
          estimatedTokens,
          `${modelProvider} ${analysisType} analysis`
        );
      }
      
      // Return the analysis result
      res.json(finalAnalysis);
    } catch (error) {
      console.error(`Error analyzing text (${req.body.analysisType || 'cognitive'}):`, error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: fromZodError(error).message 
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze text. Please try again.";
      res.status(500).json({ 
        message: errorMessage 
      });
    }
  });

  // File upload endpoint for document analysis with all providers
  app.post("/api/upload-document-all", upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Get analysis type (defaults to cognitive)
      const analysisType = req.body.analysisType || 'cognitive';
      
      // Parse the document to extract text based on file type
      const extractedText = await parseDocument(req.file);
      
      // Check the text length
      if (extractedText.length < 100) {
        return res.status(400).json({ 
          message: "The extracted text is too short. Please upload a document with more content (minimum 100 characters)." 
        });
      }

      // Analyze the extracted text using all AI providers
      const analyses = await analyzeTextWithAllProviders(extractedText, analysisType);
      
      // Return all analysis results
      res.json(analyses);
    } catch (error) {
      console.error(`Error processing document with all providers (${req.body.analysisType || 'cognitive'}):`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process document. Please try again.";
      res.status(500).json({ message: errorMessage });
    }
  });

  // File upload endpoint for document analysis (single provider)
  app.post("/api/upload-document", upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get model provider and analysis type
      const modelProvider = req.body.modelProvider || 'openai';
      const analysisType = req.body.analysisType || 'cognitive';
      
      // Parse the document to extract text based on file type
      const extractedText = await parseDocument(req.file);
      
      // Check the text length
      if (extractedText.length < 100) {
        return res.status(400).json({ 
          message: "The extracted text is too short. Please upload a document with more content (minimum 100 characters)." 
        });
      }

      // Calculate upload cost and check user tokens
      const wordCount = extractedText.split(/\s+/).length;
      const uploadCost = TokenService.calculateUploadCost(wordCount);
      const analysisTokens = TokenService.estimateTokens(extractedText);
      const totalCost = uploadCost + analysisTokens;

      // Check if user has enough tokens
      const { canProceed, currentBalance } = await TokenService.checkRegisteredUserTokens(
        req.user!.id,
        totalCost
      );

      if (!canProceed) {
        return res.status(402).json({
          error: 'insufficient_tokens',
          message: "You've used all your credits. [Buy More Credits]",
          currentBalance,
          requiredTokens: totalCost,
          breakdown: {
            uploadCost,
            analysisTokens,
            wordCount,
          }
        });
      }

      // Deduct upload cost first
      await TokenService.deductRegisteredUserTokens(
        req.user!.id,
        uploadCost,
        'upload',
        `Document upload: ${req.file.originalname} (${wordCount} words)`
      );

      // Store document in database
      await storage.createDocument({
        user_id: req.user!.id,
        filename: req.file.originalname,
        content: extractedText,
        word_count: wordCount,
      });
      
      // Analyze the extracted text using the selected AI provider and analysis type
      const analysis = await analyzeText(extractedText, modelProvider as ModelProvider, analysisType);

      // Deduct analysis tokens
      await TokenService.deductRegisteredUserTokens(
        req.user!.id,
        analysisTokens,
        'analysis',
        `${modelProvider} document analysis: ${req.file.originalname}`
      );
      
      // Return the analysis result
      res.json(analysis);
    } catch (error) {
      console.error(`Error processing document (${req.body.analysisType || 'cognitive'}):`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process document. Please try again.";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Export analysis as document (PDF or Word)
  app.post("/api/export-document", async (req, res) => {
    try {
      const { analysis, provider, analysisType, format } = req.body;
      
      if (!analysis || !provider || !analysisType || !format) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      let buffer: Buffer;
      let contentType: string;
      let fileName: string;
      
      // Generate the appropriate document format
      if (format === 'pdf') {
        buffer = await generatePdfDocument(analysis, provider, analysisType);
        contentType = 'application/pdf';
        fileName = `${analysisType}-analysis-${provider}-${Date.now()}.pdf`;
      } else if (format === 'docx') {
        buffer = await generateWordDocument(analysis, provider, analysisType);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileName = `${analysisType}-analysis-${provider}-${Date.now()}.docx`;
      } else {
        return res.status(400).json({ message: "Invalid format specified" });
      }
      
      // Set the appropriate headers for file download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Length', buffer.length);
      
      // Send the file
      res.send(buffer);
    } catch (error) {
      console.error('Error generating document:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate document";
      res.status(500).json({ message: errorMessage });
    }
  });
  
  // Share analysis via email
  app.post("/api/share-email", async (req, res) => {
    try {
      const { analysis, provider, analysisType, format, recipientEmail, senderName } = req.body;
      
      if (!analysis || !provider || !analysisType || !format || !recipientEmail) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      // Generate the document for attachment
      let buffer: Buffer;
      let attachmentType: string;
      let fileName: string;
      
      if (format === 'pdf') {
        buffer = await generatePdfDocument(analysis, provider, analysisType);
        attachmentType = 'application/pdf';
        fileName = `${analysisType}-analysis-${provider}.pdf`;
      } else if (format === 'docx') {
        buffer = await generateWordDocument(analysis, provider, analysisType);
        attachmentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileName = `${analysisType}-analysis-${provider}.docx`;
      } else {
        return res.status(400).json({ message: "Invalid format specified" });
      }
      
      // Convert buffer to base64 for email attachment
      const attachment = buffer.toString('base64');
      
      // Create email content
      const subject = `${senderName || 'Someone'} shared a ${analysisType} analysis with you`;
      const fromName = senderName || 'Cognitive Profile App';
      
      // Create HTML email body with more details
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a69bd;">${fromName} shared a ${analysisType} analysis with you</h2>
          <p>Hello,</p>
          <p>${fromName} has shared a ${analysisType} analysis with you, generated using the ${getProviderName(provider)} AI model.</p>
          <p>This analysis examines ${analysisType === 'cognitive' ? 'thinking patterns, reasoning style, and intellectual tendencies' : 'emotional patterns, motivational structure, and interpersonal dynamics'} based on text analysis.</p>
          <p>You can find the complete analysis in the attached document (${format.toUpperCase()} format).</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #4a69bd;">
            <p style="margin: 0; font-style: italic;">This analysis is for informational purposes only and should not be used for clinical diagnosis or treatment decisions.</p>
          </div>
          <p>Thank you for using Cognitive Profile App!</p>
        </div>
      `;
      
      // Send a simple text email that's more likely to deliver successfully
      const plainTextContent = `
${fromName} shared a ${analysisType} analysis with you.

This analysis was generated using the ${getProviderName(provider)} AI model.

The analysis examines ${analysisType === 'cognitive' ? 'thinking patterns, reasoning style, and intellectual tendencies' : 'emotional patterns, motivational structure, and interpersonal dynamics'} based on text analysis.

Thank you for using Cognitive Profile App!
      `;

      const emailSent = await sendEmail({
        to: recipientEmail,
        subject,
        text: plainTextContent,
        html: htmlContent
      });
      
      if (emailSent) {
        res.json({ success: true, message: "Analysis shared successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error('Error sharing analysis:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to share analysis";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Combine analyses from multiple providers and export
  app.post("/api/export-combined", async (req, res) => {
    try {
      const { analyses, analysisType, format } = req.body;
      
      if (!analyses || !analysisType || !format) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      // TODO: Implement combined document generation
      res.status(501).json({ message: "Combined export not yet implemented" });
    } catch (error) {
      console.error('Error generating combined document:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate combined document";
      res.status(500).json({ message: errorMessage });
    }
  });
  
  // Generate comprehensive cognitive report
  app.post("/api/comprehensive-report", async (req, res) => {
    try {
      const { text, provider } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      if (text.length < 100) {
        return res.status(400).json({ 
          message: "Text is too short. Please provide at least 100 characters for analysis."
        });
      }
      
      // Generate the comprehensive report
      const report = await generateComprehensiveReport(text, provider as ModelProvider);
      
      res.json(report);
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate comprehensive report";
      res.status(500).json({ message: errorMessage });
    }
  });
  
  // Generate comprehensive psychological report
  app.post("/api/comprehensive-psychological-report", async (req, res) => {
    try {
      const { text, provider } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      if (text.length < 100) {
        return res.status(400).json({ 
          message: "Text is too short. Please provide at least 100 characters for analysis."
        });
      }
      
      // Generate the comprehensive psychological report
      const report = await generateComprehensivePsychologicalReport(text, provider as ModelProvider);
      
      res.json(report);
    } catch (error) {
      console.error('Error generating comprehensive psychological report:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate comprehensive psychological report";
      res.status(500).json({ message: errorMessage });
    }
  });

  /**
   * Helper to get a friendly provider name
   */
  function getProviderName(provider: ModelProvider): string {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Claude';
      case 'perplexity':
        return 'Perplexity';
      default:
        return provider;
    }
  }

  const httpServer = createServer(app);

  return httpServer;
}
