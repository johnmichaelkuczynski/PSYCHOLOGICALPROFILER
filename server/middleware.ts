import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { TokenService } from './tokenService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    token_balance: number;
  };
  sessionId?: string;
}

/**
 * Middleware to handle authentication and session management
 */
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Check if user is logged in via session
    if (req.session && req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          token_balance: user.token_balance || 0,
        };
      }
    }

    // If no user, create or get anonymous session
    if (!req.user) {
      let sessionId = req.session?.sessionId;
      
      if (!sessionId) {
        sessionId = generateSessionId();
        if (req.session) {
          req.session.sessionId = sessionId;
        }
      }
      
      req.sessionId = sessionId;
      
      // Ensure anonymous session exists
      const existingSession = await storage.getAnonymousSession(sessionId);
      if (!existingSession) {
        await storage.createAnonymousSession({
          session_id: sessionId,
          tokens_used: 0,
          ip_address: req.ip,
          user_agent: req.get('User-Agent') || '',
        });
      }
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(error);
  }
}

/**
 * Middleware to check if user is registered
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'authentication_required',
      message: 'Please register or log in to access this feature.' 
    });
  }
  next();
}

/**
 * Middleware to check token limits for free users
 */
export async function checkFreeTokenLimits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Skip if user is registered
    if (req.user) {
      return next();
    }

    // Get text from request
    const text = req.body.text || '';
    const inputTokens = TokenService.estimateTokens(text);
    const outputTokens = Math.ceil(TokenService.estimateTokens(text) * 0.5); // Rough estimate

    const sessionId = req.sessionId;
    if (!sessionId) {
      return res.status(400).json({ 
        error: 'session_required',
        message: 'Session required' 
      });
    }

    const { canProceed, tokensUsed, message } = await TokenService.checkFreeUserLimits(
      sessionId,
      inputTokens,
      outputTokens
    );

    if (!canProceed) {
      return res.status(402).json({
        error: 'token_limit_exceeded',
        message: message || 'Free token limit exceeded',
        tokensUsed,
        limit: TokenService.FREE_TOKEN_LIMIT,
      });
    }

    next();
  } catch (error) {
    console.error('Token limit check error:', error);
    next(error);
  }
}

/**
 * Middleware to check token limits for registered users
 */
export async function checkRegisteredTokenLimits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Skip if user is not registered
    if (!req.user) {
      return next();
    }

    // Get text from request
    const text = req.body.text || '';
    const estimatedTokens = TokenService.estimateTokens(text);

    const { canProceed, currentBalance, message } = await TokenService.checkRegisteredUserTokens(
      req.user.id,
      estimatedTokens
    );

    if (!canProceed) {
      return res.status(402).json({
        error: 'insufficient_tokens',
        message: message || 'Insufficient tokens',
        currentBalance,
        requiredTokens: estimatedTokens,
      });
    }

    next();
  } catch (error) {
    console.error('Registered token limit check error:', error);
    next(error);
  }
}

/**
 * Middleware to check file upload permissions
 */
export async function checkFileUploadPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { canUpload, reason } = await TokenService.canUserUploadFiles(req.user?.id, req.sessionId);
    
    if (!canUpload) {
      return res.status(403).json({
        error: 'upload_not_allowed',
        message: reason || 'Upload not allowed',
      });
    }

    next();
  } catch (error) {
    console.error('File upload permission check error:', error);
    next(error);
  }
}

/**
 * Generate session ID for anonymous users
 */
function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}