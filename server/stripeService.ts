import Stripe from 'stripe';
import { storage } from './storage';
import { TokenService } from './tokenService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
  apiVersion: '2024-11-20.acacia',
});

export interface PaymentIntentData {
  amount: number;
  tokens: number;
  userId: string;
}

export class StripeService {
  /**
   * Create a payment intent for token purchase
   */
  static async createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount, // Amount in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: data.userId,
        tokens: data.tokens.toString(),
      },
    });

    // Store payment record
    await storage.createPayment({
      user_id: data.userId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: data.amount,
      tokens_purchased: data.tokens,
      status: 'pending',
    });

    return paymentIntent;
  }

  /**
   * Handle successful payment (webhook or confirmation)
   */
  static async handleSuccessfulPayment(paymentIntentId: string): Promise<void> {
    try {
      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const userId = paymentIntent.metadata.userId;
        const tokens = parseInt(paymentIntent.metadata.tokens || '0');
        
        if (userId && tokens > 0) {
          // Add tokens to user account
          await TokenService.addTokensToUser(userId, tokens, paymentIntentId);
          
          // Update payment status
          await storage.updatePaymentStatus(paymentIntentId, 'succeeded');
        }
      }
    } catch (error) {
      console.error('Error handling successful payment:', error);
      await storage.updatePaymentStatus(paymentIntentId, 'failed');
    }
  }

  /**
   * Handle failed payment
   */
  static async handleFailedPayment(paymentIntentId: string): Promise<void> {
    await storage.updatePaymentStatus(paymentIntentId, 'failed');
  }

  /**
   * Get token pricing options
   */
  static getTokenPricing(): Array<{ amount: number; tokens: number; description: string }> {
    return TokenService.PRICING_TIERS;
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(body: string, signature: string): Stripe.Event {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...';
    
    return stripe.webhooks.constructEvent(body, signature, endpointSecret);
  }
}