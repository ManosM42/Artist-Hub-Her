import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
})

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: ticket } = await supabase
      .from('tickets')
      .update({ status: 'paid' })
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .select()
      .single()

    if (ticket) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Heraklion is Alive <onboarding@resend.dev>',
          to: ticket.buyer_email,
          subject: `🎫 Το εισητήριό σου για ${ticket.artist_name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px; border-radius: 16px;">
              <h1 style="color: #a855f7;">🎫 Το εισητήριό σου</h1>
              <h2>${ticket.artist_name}</h2>
              <p>📅 ${ticket.event_date}</p>
              <p>📍 ${ticket.event_venue}</p>
              <div style="background: #1a1a1a; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
                <p style="color: #a855f7; font-size: 12px; margin-bottom: 8px;">ΚΩΔΙΚΟΣ ΕΙΣΗΤΗΡΙΟΥ</p>
                <h2 style="letter-spacing: 4px; font-size: 32px;">${ticket.ticket_code}</h2>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticket.ticket_code}" 
                     alt="QR Code" style="margin-top: 16px;" />
              </div>
              <p style="color: #666; font-size: 12px;">Αυτό το εισητήριο είναι προσωπικό και μπορεί να χρησιμοποιηθεί μόνο μία φορά.</p>
            </div>
          `,
        }),
      })
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
