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
    const newUser = await storage.createUser({
      email,
      password_hash,
      token_balance: 0,
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
      free_tokens_used: user.free_tokens_used || 0,
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