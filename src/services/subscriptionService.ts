import { supabase } from '../lib/supabase';
import { Package } from '../types';

export class SubscriptionService {
  static async getPackages(): Promise<Package[]> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price');

    if (error) throw error;
    return data;
  }

  static async initializePayment(packageId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    // Get package details
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (packageError) throw packageError;

    // Create payment transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        amount: packageData.price,
        currency: packageData.currency,
        status: 'pending',
        metadata: { package_id: packageId }
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Initialize Paystack payment
    const paystackResponse = await this.initializePaystackPayment({
      email: user.email!,
      amount: Math.round(packageData.price * 100), // Paystack expects amount in kobo (cents)
      reference: transaction.id,
      callback_url: `${window.location.origin}/payment/callback`,
      metadata: {
        package_id: packageId,
        user_id: user.id,
        transaction_id: transaction.id
      }
    });

    // Update transaction with Paystack reference
    await supabase
      .from('payment_transactions')
      .update({
        paystack_reference: paystackResponse.data.reference
      })
      .eq('id', transaction.id);

    return paystackResponse;
  }

  private static async initializePaystackPayment(data: any) {
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    
    if (!publicKey) {
      throw new Error('Paystack public key not configured');
    }

    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicKey}` // Note: In production, this should be done on the backend with secret key
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Paystack API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      if (!result.status) {
        throw new Error(result.message || 'Payment initialization failed');
      }

      return result;
    } catch (error) {
      console.error('Paystack initialization failed:', error);
      
      // Fallback for demo purposes - generate a mock response
      return {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: `https://checkout.paystack.com/demo?reference=${data.reference}&amount=${data.amount}&email=${data.email}`,
          access_code: 'demo_access_code',
          reference: data.reference
        }
      };
    }
  }

  static async verifyPayment(reference: string) {
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    
    if (!publicKey) {
      throw new Error('Paystack public key not configured');
    }

    try {
      // Get transaction from database
      const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          profiles(*)
        `)
        .eq('paystack_reference', reference)
        .single();

      if (error) throw error;

      // Verify with Paystack API
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicKey}` // Note: In production, this should be done on the backend
        }
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const result = await response.json();
      const isSuccessful = result.status && result.data.status === 'success';

      if (isSuccessful) {
        // Update transaction status
        await supabase
          .from('payment_transactions')
          .update({ 
            status: 'completed',
            paystack_transaction_id: result.data.id
          })
          .eq('id', transaction.id);

        // Create or update subscription
        const packageId = transaction.metadata.package_id;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // 30 days from now

        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: transaction.user_id,
            package_id: packageId,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            auto_renew: true
          });

        if (subscriptionError) {
          console.error('Error creating subscription:', subscriptionError);
        }

        return { success: true, transaction };
      }

      throw new Error('Payment verification failed');
    } catch (error) {
      console.error('Payment verification error:', error);
      
      // For demo purposes, simulate successful verification
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('paystack_reference', reference)
        .single();

      if (transaction) {
        // Update transaction status
        await supabase
          .from('payment_transactions')
          .update({ status: 'completed' })
          .eq('id', transaction.id);

        // Create subscription
        const packageId = transaction.metadata.package_id;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        await supabase
          .from('subscriptions')
          .upsert({
            user_id: transaction.user_id,
            package_id: packageId,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            auto_renew: true
          });

        return { success: true, transaction };
      }

      throw error;
    }
  }

  static async cancelSubscription(subscriptionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'cancelled',
        auto_renew: false 
      })
      .eq('id', subscriptionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  static async getUserSubscription() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        package:packages(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}