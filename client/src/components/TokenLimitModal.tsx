import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lock, CreditCard, Zap, AlertTriangle } from 'lucide-react';

interface TokenLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  onBuyCredits: () => void;
  limitType: 'free_limit' | 'insufficient_tokens' | 'upload_blocked';
  message: string;
  currentBalance?: number;
  requiredTokens?: number;
  isRegistered?: boolean;
}

export default function TokenLimitModal({
  isOpen,
  onClose,
  onRegister,
  onBuyCredits,
  limitType,
  message,
  currentBalance,
  requiredTokens,
  isRegistered = false,
}: TokenLimitModalProps) {
  const getIcon = () => {
    switch (limitType) {
      case 'free_limit':
        return <Lock className="h-8 w-8 text-orange-500" />;
      case 'insufficient_tokens':
        return <CreditCard className="h-8 w-8 text-red-500" />;
      case 'upload_blocked':
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
      default:
        return <Lock className="h-8 w-8 text-gray-500" />;
    }
  };

  const getTitle = () => {
    switch (limitType) {
      case 'free_limit':
        return 'Free Limit Reached';
      case 'insufficient_tokens':
        return 'Insufficient Credits';
      case 'upload_blocked':
        return 'Upload Restricted';
      default:
        return 'Access Restricted';
    }
  };

  const getDescription = () => {
    switch (limitType) {
      case 'free_limit':
        return 'You\'ve reached the free usage limit. Register for an account to get full access with token credits.';
      case 'insufficient_tokens':
        return 'You don\'t have enough credits to complete this action. Purchase more credits to continue.';
      case 'upload_blocked':
        return 'File uploads require registration and credits. Create an account to unlock this feature.';
      default:
        return 'This action requires authentication or additional credits.';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          
          <div className="text-sm text-gray-600">
            <p>{getDescription()}</p>
          </div>
          
          {limitType === 'free_limit' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Free Usage Limits</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Input: 500 tokens maximum</li>
                <li>• Output: 300 tokens maximum</li>
                <li>• Total lifetime: 1,000 tokens</li>
                <li>• No file uploads</li>
              </ul>
            </div>
          )}
          
          {limitType === 'insufficient_tokens' && currentBalance !== undefined && requiredTokens !== undefined && (
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-900">Current Balance:</span>
                <Badge variant="outline" className="text-red-700">
                  <Zap className="h-3 w-3 mr-1" />
                  {currentBalance.toLocaleString()} tokens
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-900">Required:</span>
                <Badge variant="destructive">
                  {requiredTokens.toLocaleString()} tokens
                </Badge>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            {!isRegistered && (
              <Button onClick={onRegister} className="flex-1">
                <Lock className="mr-2 h-4 w-4" />
                Register & Unlock
              </Button>
            )}
            
            <Button 
              onClick={onBuyCredits} 
              className={`${!isRegistered ? 'flex-1' : 'w-full'}`}
              variant={!isRegistered ? 'outline' : 'default'}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Buy Credits
            </Button>
          </div>
          
          {limitType === 'free_limit' && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>✓ Unlimited usage with credits</p>
              <p>✓ File upload support</p>
              <p>✓ All AI providers available</p>
              <p>✓ Export to PDF/Word</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}