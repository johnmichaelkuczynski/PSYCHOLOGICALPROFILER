import bcrypt from 'bcryptjs';
import { storage } from './storage';
import type { User } from '@shared/schema';

export interface AuthResult {
  user: User;
  isNewUser: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  token_balance: number;
  is_registered: boolean;
  free_tokens_used: number;
}

export class AuthService {
  // Admin usernames with unlimited access
  static readonly ADMIN_USERNAMES = ['jmkuczynski', 'jmkuczynski@yahoo.com'];
  
  /**
   * Check if user is admin
   */
  static isAdminUser(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim();
    return this.ADMIN_USERNAMES.some(adminEmail => adminEmail.toLowerCase() === normalizedEmail);
  }

  /**
   * Register a new user
   */
  static async register(email: string, password: string): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user with registered status
    // Admin gets unlimited tokens (999,999,999)
    const tokenBalance = this.isAdminUser(email) ? 999999999 : 0;
    
    const newUser = await storage.createUser({
      email,
      password_hash,
      token_balance: tokenBalance,
      is_registered: true,
    });

    return {
      user: newUser,
      isNewUser: true,
    };
  }

  /**
   * Login user with email and password
   */
  static async login(email: string, password: string): Promise<AuthResult> {
    // Special admin bypass: jmkuczynski can login with any password
    if (this.isAdminUser(email)) {
      let user = await storage.getUserByEmail(email.toLowerCase().trim());
      
      // Auto-create admin user if doesn't exist
      if (!user) {
        const password_hash = await bcrypt.hash(password, 10);
        user = await storage.createUser({
          email: email.toLowerCase().trim(),
          password_hash,
          token_balance: 999999999, // Unlimited tokens
          is_registered: true,
        });
        return { user, isNewUser: true };
      }
      
      // Ensure admin always has unlimited tokens
      const currentBalance = user.token_balance || 0;
      if (currentBalance < 999999999) {
        await storage.updateUserTokenBalance(user.id, 999999999);
        user.token_balance = 999999999;
      }
      
      return { user, isNewUser: false };
    }

    // Regular user authentication
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return {
      user,
      isNewUser: false,
    };
  }

  /**
   * Convert user to session format
   */
  static toSessionUser(user: User): SessionUser {
    return {
      id: user.id,
      email: user.email,
      token_balance: user.token_balance || 0,
      is_registered: user.is_registered || false,
      free_tokens_used: 0, // This field doesn't exist on User type
    };
  }

  /**
   * Get or create anonymous session for free users
   */
  static async getOrCreateAnonymousSession(sessionId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    let session = await storage.getAnonymousSession(sessionId);
    
    if (!session) {
      session = await storage.createAnonymousSession({
        session_id: sessionId,
        tokens_used: 0,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    }

    return session.session_id;
  }

  /**
   * Check if anonymous user has exceeded free limits
   */
  static async checkAnonymousLimits(sessionId: string): Promise<{ canProceed: boolean; tokensUsed: number }> {
    const session = await storage.getAnonymousSession(sessionId);
    const tokensUsed = session?.tokens_used || 0;
    
    return {
      canProceed: tokensUsed < 1000, // 1000 token lifetime limit
      tokensUsed,
    };
  }

  /**
   * Generate session ID for anonymous users
   */
  static generateSessionId(): string {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}