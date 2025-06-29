import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PaymentRequest {
  packageId: string
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
    const { packageId }: PaymentRequest = await req.json()
    if (!packageId) {
      throw new Error('Package ID is required')
    }

    // Get user profile for email
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    // Get package details
    const { data: packageData, error: packageError } = await supabaseClient
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (packageError || !packageData) {
      throw new Error('Package not found')
    }

    // Create payment transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        amount: packageData.price,
        currency: packageData.currency,
        status: 'pending',
        metadata: { package_id: packageId }
      })
      .select()
      .single()

    if (transactionError) {
      throw new Error(`Failed to create transaction: ${transactionError.message}`)
    }

    // Initialize Paystack payment
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured')
    }

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paystackSecretKey}`
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(packageData.price * 100), // Convert to kobo/cents
        reference: transaction.id,
        callback_url: `${req.headers.get('origin')}/payment/callback`,
        metadata: {
          package_id: packageId,
          user_id: user.id,
          transaction_id: transaction.id
        }
      })
    })

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json().catch(() => ({}))
      throw new Error(`Paystack API error: ${paystackResponse.status} - ${errorData.message || 'Unknown error'}`)
    }

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Payment initialization failed')
    }

    // Update transaction with Paystack reference
    await supabaseClient
      .from('payment_transactions')
      .update({
        paystack_reference: paystackData.data.reference
      })
      .eq('id', transaction.id)

    return new Response(
      JSON.stringify({
        success: true,
        data: paystackData.data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Payment initialization error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment initialization failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})