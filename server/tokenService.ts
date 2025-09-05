import { storage } from "./storage";

export class TokenService {
  // Token limits and costs - following finalized instructions exactly
  static readonly FREE_TOKEN_LIMIT = 1000;
  static readonly FREE_INPUT_LIMIT = 500;
  static readonly FREE_OUTPUT_LIMIT = 300;
  static readonly UPLOAD_COST_PER_100_WORDS = 1; // 1 token per 100 words
  static readonly MIN_UPLOAD_COST = 100;
  static readonly MAX_UPLOAD_COST = 10000; // For registered users
  static readonly MAX_FREE_UPLOAD_COST = 1000; // For free users

  // Stripe pricing tiers
  static readonly PRICING_TIERS = [
    { amount: 100, tokens: 2000, description: "$1 → 2,000 tokens" },
    { amount: 1000, tokens: 30000, description: "$10 → 30,000 tokens" },
    { amount: 10000, tokens: 600000, description: "$100 → 600,000 tokens" },
    { amount: 100000, tokens: 10000000, description: "$1,000 → 10,000,000 tokens" },
  ];

  /**
   * Estimate tokens needed for text (rough estimate)
   */
  static estimateTokens(text: string): number {
    // More conservative estimate: 1 token per 3 characters
    return Math.ceil(text.length / 3);
  }

  /**
   * Calculate upload cost based on word count
   */
  static calculateUploadCost(wordCount: number): number {
    const cost = Math.ceil(wordCount / 100) * this.UPLOAD_COST_PER_100_WORDS;
    return Math.max(cost, this.MIN_UPLOAD_COST);
  }

  /**
   * Check if free user can proceed with analysis
   */
  static async checkFreeUserLimits(sessionId: string, inputTokens: number, outputTokens: number): Promise<{
    canProceed: boolean;
    tokensUsed: number;
    message?: string;
  }> {
    // Get current session usage
    const session = await storage.getAnonymousSession(sessionId);
    const currentUsage = session?.tokens_used || 0;
    
    // Check input limit
    if (inputTokens > this.FREE_INPUT_LIMIT) {
      return {
        canProceed: false,
        tokensUsed: currentUsage,
        message: "🔒 Full results available with upgrade. [Register & Unlock Full Access]"
      };
    }

    // Check output limit
    if (outputTokens > this.FREE_OUTPUT_LIMIT) {
      return {
        canProceed: false,
        tokensUsed: currentUsage,
        message: "🔒 Full results available with upgrade. [Register & Unlock Full Access]"
      };
    }

    // Check total limit
    const totalTokens = inputTokens + outputTokens;
    if (currentUsage + totalTokens > this.FREE_TOKEN_LIMIT) {
      return {
        canProceed: false,
        tokensUsed: currentUsage,
        message: "🔒 You've reached the free usage limit. [Register & Unlock Full Access]"
      };
    }

    return { canProceed: true, tokensUsed: currentUsage };
  }

  /**
   * Check if registered user has enough tokens
   */
  static async checkRegisteredUserTokens(userId: string, requiredTokens: number): Promise<{
    canProceed: boolean;
    currentBalance: number;
    message?: string;
  }> {
    const user = await storage.getUser(userId);
    if (!user) {
      return { canProceed: false, currentBalance: 0, message: "User not found" };
    }

    // Admin user bypass - always has unlimited tokens
    const adminUsernames = ['jmkuczynski', 'jmkuczynski@yahoo.com'];
    if (adminUsernames.some(admin => admin.toLowerCase() === user.email.toLowerCase())) {
      // Ensure admin always has max tokens
      if (user.token_balance < 999999999) {
        await storage.updateUserTokenBalance(userId, 999999999);
      }
      return { canProceed: true, currentBalance: 999999999 };
    }

    const currentBalance = user.token_balance || 0;
    
    if (currentBalance < requiredTokens) {
      return {
        canProceed: false,
        currentBalance,
        message: "🔒 You've used all your credits. [Buy More Credits]"
      };
    }

    return { canProceed: true, currentBalance };
  }

  /**
   * Deduct tokens from free user session
   */
  static async deductFreeUserTokens(
    sessionId: string,
    tokensUsed: number,
    description: string
  ): Promise<void> {
    const tokensUsedInt = Math.ceil(tokensUsed); // Ensure integer
    const session = await storage.getAnonymousSession(sessionId);
    if (!session) {
      await storage.createAnonymousSession({
        session_id: sessionId,
        tokens_used: tokensUsedInt,
      });
    } else {
      const newTotal = Math.ceil((session.tokens_used || 0) + tokensUsedInt);
      await storage.updateAnonymousSessionTokens(sessionId, newTotal);
    }

    // Track usage
    await storage.createTokenUsage({
      session_id: sessionId,
      event_type: 'analysis',
      tokens_used: tokensUsedInt,
      tokens_remaining: this.FREE_TOKEN_LIMIT - (session?.tokens_used || 0) - tokensUsedInt,
      description,
    });
  }

  /**
   * Deduct tokens from registered user
   */
  static async deductRegisteredUserTokens(
    userId: string,
    tokensUsed: number,
    eventType: string,
    description: string
  ): Promise<void> {
    const tokensUsedInt = Math.ceil(tokensUsed); // Ensure integer
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");

    // Admin user bypass - never deduct tokens
    const adminUsernames = ['jmkuczynski', 'jmkuczynski@yahoo.com'];
    if (adminUsernames.some(admin => admin.toLowerCase() === user.email.toLowerCase())) {
      // Just track usage but don't deduct tokens
      await storage.createTokenUsage({
        user_id: userId,
        event_type: eventType,
        tokens_used: tokensUsedInt,
        tokens_remaining: 999999999, // Always unlimited
        description: `${description} (ADMIN - no deduction)`,
      });
      return;
    }

    const newBalance = (user.token_balance || 0) - tokensUsedInt;
    await storage.updateUserTokenBalance(userId, newBalance);

    // Track usage
    await storage.createTokenUsage({
      user_id: userId,
      event_type: eventType,
      tokens_used: tokensUsedInt,
      tokens_remaining: newBalance,
      description,
    });
  }

  /**
   * Add tokens to user account (for purchases)
   */
  static async addTokensToUser(userId: string, tokensToAdd: number): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");

    const newBalance = (user.token_balance || 0) + tokensToAdd;
    await storage.updateUserTokenBalance(userId, newBalance);

    // Track purchase
    await storage.createTokenUsage({
      user_id: userId,
      event_type: 'purchase',
      tokens_used: -tokensToAdd, // Negative for purchase
      tokens_remaining: newBalance,
      description: `Purchased ${tokensToAdd} tokens`,
    });
  }

  /**
   * Get user's token usage history
   */
  static async getUserTokenHistory(userId: string): Promise<any[]> {
    return await storage.getUserTokenUsage(userId);
  }

  /**
   * Get session's token usage history
   */
  static async getSessionTokenHistory(sessionId: string): Promise<any[]> {
    return await storage.getSessionTokenUsage(sessionId);
  }

  /**
   * Check if user can upload files
   */
  static async canUserUploadFiles(userId?: string, sessionId?: string): Promise<{
    canUpload: boolean;
    reason?: string;
  }> {
    if (userId) {
      // Registered users can always upload (will be charged)
      return { canUpload: true };
    }

    if (sessionId) {
      // Free users can upload once per session
      const session = await storage.getAnonymousSession(sessionId);
      if (!session) {
        return { canUpload: true };
      }

      // Check if they've used too many tokens
      if (session.tokens_used >= this.FREE_TOKEN_LIMIT) {
        return {
          canUpload: false,
          reason: "🔒 You've reached the free usage limit. [Register & Unlock Full Access]"
        };
      }

      return { canUpload: true };
    }

    return { canUpload: false, reason: "No valid session" };
  }

  /**
   * Calculate file upload cost for free users
   */
  static calculateFreeUploadCost(wordCount: number): number {
    const cost = Math.ceil(wordCount / 100) * this.UPLOAD_COST_PER_100_WORDS;
    return Math.min(Math.max(cost, this.MIN_UPLOAD_COST), this.MAX_FREE_UPLOAD_COST);
  }

  /**
   * Calculate file upload cost for registered users
   */
  static calculateRegisteredUploadCost(wordCount: number): number {
    const cost = Math.ceil(wordCount / 100) * this.UPLOAD_COST_PER_100_WORDS;
    return Math.min(Math.max(cost, this.MIN_UPLOAD_COST), this.MAX_UPLOAD_COST);
  }
}