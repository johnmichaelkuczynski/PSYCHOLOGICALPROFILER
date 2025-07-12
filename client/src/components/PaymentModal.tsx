import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Check, Zap } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Get Stripe publishable key from environment
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';
const stripePromise = loadStripe(stripePublishableKey);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

interface TokenPackage {
  amount: number;
  tokens: number;
  description: string;
  popular?: boolean;
}

const tokenPackages: TokenPackage[] = [
  { amount: 100, tokens: 2000, description: '$1 → 2,000 tokens' },
  { amount: 1000, tokens: 30000, description: '$10 → 30,000 tokens', popular: true },
  { amount: 10000, tokens: 600000, description: '$100 → 600,000 tokens' },
  { amount: 100000, tokens: 10000000, description: '$1,000 → 10,000,000 tokens' },
];

function PaymentForm({ selectedPackage, onSuccess, onError }: {
  selectedPackage: TokenPackage;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedPackage.amount,
          tokens: selectedPackage.tokens,
        }),
      });

      const { clientSecret } = await response.json();

      // Confirm payment
      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (error) {
      onError('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ${(selectedPackage.amount / 100).toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

export default function PaymentModal({ isOpen, onClose, onSuccess, currentBalance }: PaymentModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage>(tokenPackages[1]);
  const [error, setError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    setTimeout(() => {
      onSuccess();
      onClose();
      setPaymentSuccess(false);
    }, 2000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Buy Credits
          </DialogTitle>
        </DialogHeader>
        
        {paymentSuccess ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
            <p className="text-gray-600">Your credits have been added to your account.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Zap className="h-4 w-4" />
                <span>Current Balance: {currentBalance.toLocaleString()} tokens</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Select a Package</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tokenPackages.map((pkg) => (
                  <Card
                    key={pkg.amount}
                    className={`cursor-pointer transition-all ${
                      selectedPackage.amount === pkg.amount
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          ${(pkg.amount / 100).toFixed(2)}
                        </CardTitle>
                        {pkg.popular && (
                          <Badge variant="secondary">Popular</Badge>
                        )}
                      </div>
                      <CardDescription>
                        {pkg.tokens.toLocaleString()} tokens
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        ${((pkg.amount / 100) / (pkg.tokens / 1000)).toFixed(3)} per 1K tokens
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Payment Details</h3>
              
              <Elements stripe={stripePromise}>
                <PaymentForm
                  selectedPackage={selectedPackage}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Tokens never expire</p>
              <p>• Used for analysis and file uploads</p>
              <p>• Secure payment processing via Stripe</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}