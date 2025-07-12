import { storage } from './storage';

export class TokenService {
  // Token costs and limits
  static readonly FREE_TOKEN_LIMIT = 1000;
  static readonly REGISTRATION_BONUS = 5000;
  static readonly UPLOAD_COST_PER_WORD = 0.1;
  static readonly MIN_UPLOAD_COST = 10;
  
  /**
   * Estimate tokens needed for text analysis
   */
  static estimateTokens(text: string): number {
    // Rough estimate: 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate upload cost based on word count
   */
  static calculateUploadCost(wordCount: number): number {
    return Math.max(
      Math.ceil(wordCount * this.UPLOAD_COST_PER_WORD),
      this.MIN_UPLOAD_COST
    );
  }

  /**
   * Check if anonymous user can proceed with analysis
   */
  static async checkAnonymousUserTokens(sessionId: string, requiredTokens: number): Promise<{
    canProceed: boolean;
    tokensUsed: number;
    remainingTokens: number;
  }> {
    const session = await storage.getAnonymousSession(sessionId);
    const tokensUsed = session?.tokens_used || 0;
    const remainingTokens = this.FREE_TOKEN_LIMIT - tokensUsed;
    
    return {
      canProceed: remainingTokens >= requiredTokens,
      tokensUsed,
      remainingTokens,
    };
  }

  /**
   * Check if registered user has enough tokens
   */
  static async checkRegisteredUserTokens(userId: string, requiredTokens: number): Promise<{
    canProceed: boolean;
    currentBalance: number;
  }> {
    const user = await storage.getUser(userId);
    const currentBalance = user?.token_balance || 0;
    
    return {
      canProceed: currentBalance >= requiredTokens,
      currentBalance,
    };
  }

  /**
   * Deduct tokens from anonymous user session
   */
  static async deductAnonymousTokens(
    sessionId: string,
    tokensUsed: number,
    operation: string,
    description: string
  ): Promise<void> {
    const session = await storage.getAnonymousSession(sessionId);
    const currentUsage = session?.tokens_used || 0;
    
    await storage.updateAnonymousSessionTokens(sessionId, currentUsage + tokensUsed);
    
    // Record token usage
    await storage.createTokenUsage({
      session_id: sessionId,
      tokens_used: tokensUsed,
      operation,
      description,
    });
  }

  /**
   * Deduct tokens from registered user
   */
  static async deductRegisteredUserTokens(
    userId: string,
    tokensUsed: number,
    operation: string,
    description: string
  ): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const newBalance = user.token_balance - tokensUsed;
    await storage.updateUserTokenBalance(userId, newBalance);
    
    // Record token usage
    await storage.createTokenUsage({
      user_id: userId,
      tokens_used: tokensUsed,
      operation,
      description,
    });
  }

  /**
   * Add tokens to user account (for purchases)
   */
  static async addTokensToUser(userId: string, tokensToAdd: number): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const newBalance = user.token_balance + tokensToAdd;
    await storage.updateUserTokenBalance(userId, newBalance);
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
    // Anonymous users cannot upload files
    if (!userId) {
      return {
        canUpload: false,
        reason: 'File uploads require registration',
      };
    }

    // Registered users can upload files
    return {
      canUpload: true,
    };
  }
}