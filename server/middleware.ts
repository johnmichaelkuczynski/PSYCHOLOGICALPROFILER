import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth';
import { TokenService } from './tokenService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    token_balance: number;
    is_registered: boolean;
    free_tokens_used: number;
  };
  sessionId?: string;
}

/**
 * Middleware to handle authentication and session management
 */
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Check for user session (registered users)
    const userSession = req.session?.user;
    
    if (userSession) {
      req.user = userSession;
    } else {
      // Handle anonymous users with session ID
      let sessionId = req.session?.anonymousId;
      
      if (!sessionId) {
        sessionId = AuthService.generateSessionId();
        req.session!.anonymousId = sessionId;
      }
      
      req.sessionId = sessionId;
      
      // Create or get anonymous session
      await AuthService.getOrCreateAnonymousSession(
        sessionId,
        req.ip,
        req.get('User-Agent')
      );
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
      error: 'Authentication required',
      message: 'Please register or login to access this feature'
    });
  }
  next();
}

/**
 * Middleware to check token limits for anonymous users
 */
export async function checkTokenLimits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { text } = req.body;
    
    if (req.user) {
      // Registered user - check token balance
      const requiredTokens = TokenService.estimateTokens(text);
      const { canProceed, currentBalance } = await TokenService.checkRegisteredUserTokens(
        req.user.id,
        requiredTokens
      );
      
      if (!canProceed) {
        return res.status(402).json({
          error: 'insufficient_tokens',
          message: "You've used all your credits. [Buy More Credits]",
          currentBalance,
          requiredTokens,
        });
      }
      
      req.estimatedTokens = requiredTokens;
    } else {
      // Anonymous user - check free limits
      const sessionId = req.sessionId!;
      const estimate = await TokenService.checkAnonymousLimits(sessionId, text);
      
      if (estimate.exceedsLimit) {
        let message = '';
        if (estimate.limitType === 'total') {
          message = "You've reached the free usage limit. [Register & Unlock Full Access]";
        } else {
          message = "Full results available with upgrade. [Register & Unlock Full Access]";
        }
        
        return res.status(402).json({
          error: 'free_limit_exceeded',
          message,
          limitType: estimate.limitType,
          tokens: estimate.tokens,
          allowPartial: estimate.limitType !== 'total',
        });
      }
      
      req.estimatedTokens = estimate.tokens;
    }
    
    next();
  } catch (error) {
    console.error('Token limit check error:', error);
    next(error);
  }
}

/**
 * Middleware to check file upload permissions
 */
export async function checkFileUploadPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { canUpload, reason } = await TokenService.canUploadFiles(req.user?.id);
    
    if (!canUpload) {
      return res.status(403).json({
        error: 'upload_not_allowed',
        message: reason,
      });
    }
    
    next();
  } catch (error) {
    console.error('File upload permission check error:', error);
    next(error);
  }
}

// Extend the global Express namespace to include our custom properties
declare global {
  namespace Express {
    interface Request {
      estimatedTokens?: number;
    }
  }
}