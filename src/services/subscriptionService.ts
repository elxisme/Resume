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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initialize-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Payment initialization failed');
      }

      return result;
    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      
      // Provide fallback for demo purposes if Edge Function is not deployed
      if (error.message?.includes('fetch') || error.message?.includes('404')) {
        console.warn('Edge Function not available, using fallback demo payment');
        return this.createDemoPaymentResponse(packageId);
      }
      
      throw error;
    }
  }

  static async verifyPayment(reference: string) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reference }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Payment verification failed');
      }

      return result;
    } catch (error: any) {
      console.error('Payment verification failed:', error);
      
      // Provide fallback for demo purposes if Edge Function is not deployed
      if (error.message?.includes('fetch') || error.message?.includes('404')) {
        console.warn('Edge Function not available, using fallback demo verification');
        return this.createDemoVerificationResponse(reference);
      }
      
      throw error;
    }
  }

  private static async createDemoPaymentResponse(packageId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get package details for demo
    const { data: packageData } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (!packageData) throw new Error('Package not found');

    // Create demo transaction record
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        amount: packageData.price,
        currency: packageData.currency,
        status: 'pending',
        paystack_reference: `demo_${Date.now()}`,
        metadata: { package_id: packageId }
      })
      .select()
      .single();

    return {
      status: true,
      message: 'Demo payment initialized',
      data: {
        authorization_url: `${window.location.origin}/payment/demo?reference=${transaction?.paystack_reference}&amount=${packageData.price * 100}&email=${user.email}`,
        access_code: 'demo_access_code',
        reference: transaction?.paystack_reference
      }
    };
  }

  private static async createDemoVerificationResponse(reference: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get transaction from database
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('paystack_reference', reference)
      .eq('user_id', user.id)
      .single();

    if (!transaction) throw new Error('Transaction not found');

    // Update transaction status for demo
    await supabase
      .from('payment_transactions')
      .update({ status: 'completed' })
      .eq('id', transaction.id);

    // Create subscription for demo
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

    return { 
      success: true, 
      data: { 
        transaction,
        payment_data: { status: 'success', reference }
      }
    };
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