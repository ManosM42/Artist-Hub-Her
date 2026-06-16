import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { artistId, artistName, eventDate, eventVenue, price, buyerEmail, buyerName } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    const { data: ticket } = await supabase
      .from('tickets')
      .insert({
        user_id: user!.id,
        artist_id: artistId,
        artist_name: artistName,
        event_date: eventDate,
        event_venue: eventVenue,
        price,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        status: 'pending',
      })
      .select()
      .single()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price * 100,
      currency: 'eur',
      metadata: {
        ticketId: ticket.id,
        artistId,
        buyerEmail,
      },
    })

    await supabase
      .from('tickets')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', ticket.id)

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, ticketId: ticket.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
