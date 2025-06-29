import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-paystack-signature, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature')
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    
    if (!signature || !paystackSecretKey) {
      throw new Error('Invalid webhook signature or missing secret key')
    }

    const body = await req.text()
    
    // Verify the signature
    const hash = await crypto.subtle.digest(
      'SHA-512',
      new TextEncoder().encode(paystackSecretKey + body)
    )
    const expectedSignature = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature')
    }

    // Parse webhook payload
    const payload = JSON.parse(body)
    const { event, data } = payload

    // Create Supabase client with service role key for webhook operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle different webhook events
    switch (event) {
      case 'charge.success':
        await handleChargeSuccess(supabaseClient, data)
        break
      
      case 'charge.failed':
        await handleChargeFailed(supabaseClient, data)
        break
      
      case 'subscription.create':
        await handleSubscriptionCreate(supabaseClient, data)
        break
      
      case 'subscription.disable':
        await handleSubscriptionDisable(supabaseClient, data)
        break
      
      default:
        console.log(`Unhandled webhook event: ${event}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Webhook processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function handleChargeSuccess(supabaseClient: any, data: any) {
  const reference = data.reference
  
  // Find and update transaction
  const { data: transaction, error } = await supabaseClient
    .from('payment_transactions')
    .update({
      status: 'completed',
      paystack_transaction_id: data.id
    })
    .eq('paystack_reference', reference)
    .select()
    .single()

  if (error || !transaction) {
    console.error('Failed to update transaction:', error)
    return
  }

  // Create or update subscription
  const packageId = transaction.metadata.package_id
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 30)

  await supabaseClient
    .from('subscriptions')
    .upsert({
      user_id: transaction.user_id,
      package_id: packageId,
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
      auto_renew: true
    })
}

async function handleChargeFailed(supabaseClient: any, data: any) {
  const reference = data.reference
  
  await supabaseClient
    .from('payment_transactions')
    .update({ status: 'failed' })
    .eq('paystack_reference', reference)
}

async function handleSubscriptionCreate(supabaseClient: any, data: any) {
  // Handle subscription creation events
  console.log('Subscription created:', data)
}

async function handleSubscriptionDisable(supabaseClient: any, data: any) {
  // Handle subscription cancellation events
  const subscriptionCode = data.subscription_code
  
  await supabaseClient
    .from('subscriptions')
    .update({ 
      status: 'cancelled',
      auto_renew: false 
    })
    .eq('paystack_subscription_code', subscriptionCode)
}