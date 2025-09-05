import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { User, CreditCard, LogOut, Zap, Plus } from 'lucide-react';

interface UserAccountBarProps {
  user: {
    id: string;
    email: string;
    token_balance: number;
    is_registered: boolean;
    free_tokens_used: number;
  } | null;
  onLogin: () => void;
  onLogout: () => void;
  onBuyCredits: () => void;
}

export default function UserAccountBar({ user, onLogin, onLogout, onBuyCredits }: UserAccountBarProps) {
  if (!user) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Free User</p>
                <p className="text-sm text-gray-700">Limited to 1,000 tokens</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-orange-600">
                <Zap className="h-3 w-3 mr-1" />
                Free Trial
              </Badge>
              <Button onClick={onLogin} size="sm">
                Register & Unlock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{user.email}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-green-700 bg-green-100 border-green-200">
                  <Zap className="h-3 w-3 mr-1" />
                  {user.token_balance.toLocaleString()} tokens
                </Badge>
                {user.token_balance === 0 && (
                  <Badge variant="destructive" className="text-xs">
                    No credits
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={onBuyCredits} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Buy Credits
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onBuyCredits}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Buy Credits
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}