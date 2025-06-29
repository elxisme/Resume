import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface VerifyRequest {
  reference: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Parse request body
    const { reference }: VerifyRequest = await req.json()
    if (!reference) {
      throw new Error('Payment reference is required')
    }

    // Get transaction from database
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('payment_transactions')
      .select(`
        *,
        profiles(*)
      `)
      .eq('paystack_reference', reference)
      .eq('user_id', user.id) // Ensure user can only verify their own transactions
      .single()

    if (transactionError || !transaction) {
      throw new Error('Transaction not found')
    }

    // Verify with Paystack API
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured')
    }

    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`
      }
    })

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json().catch(() => ({}))
      throw new Error(`Paystack verification failed: ${paystackResponse.status} - ${errorData.message || 'Unknown error'}`)
    }

    const paystackData = await paystackResponse.json()
    const isSuccessful = paystackData.status && paystackData.data.status === 'success'

    if (isSuccessful) {
      // Update transaction status
      await supabaseClient
        .from('payment_transactions')
        .update({ 
          status: 'completed',
          paystack_transaction_id: paystackData.data.id
        })
        .eq('id', transaction.id)

      // Create or update subscription
      const packageId = transaction.metadata.package_id
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30) // 30 days from now

      const { error: subscriptionError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: transaction.user_id,
          package_id: packageId,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: true
        })

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError)
        throw new Error('Failed to create subscription')
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transaction,
            payment_data: paystackData.data
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      // Update transaction status to failed
      await supabaseClient
        .from('payment_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id)

      throw new Error('Payment verification failed - transaction was not successful')
    }

  } catch (error) {
    console.error('Payment verification error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment verification failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})