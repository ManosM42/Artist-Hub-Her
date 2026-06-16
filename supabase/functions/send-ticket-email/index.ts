import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { buyerEmail, buyerName, artistSlug, artistName, quantity, total } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Δημιουργούμε την εγγραφή της παραγγελίας (Order)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        artist_slug: artistSlug,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        quantity: quantity,
        total_amount: Number(total),
        payment_status: 'completed'
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 2. Δημιουργούμε unique εισιτήρια με βάση την ποσότητα (Quantity)
    const ticketsRows = []
    for (let i = 0; i < quantity; i++) {
      // Παράγουμε έναν τυχαίο μοναδικό κωδικό για το QR
      const uniqueTicketCode = `${artistSlug}-${Math.random().toString(36).substring(2, 11).toUpperCase()}-${Date.now().toString().slice(-4)}`
      
      ticketsRows.push({
        order_id: order.id,
        artist_slug: artistSlug,
        ticket_code: uniqueTicketCode,
        qr_code_data: uniqueTicketCode, // Αυτό το string θα διαβάζει το σκανερ στο Admin Panel
        is_used: false
      })
    }

    const { data: insertedTickets, error: ticketsError } = await supabase
      .from('tickets')
      .insert(ticketsRows)
      .select()

    if (ticketsError) throw ticketsError

    // 3. Φτιάχνουμε τα QR Code Images χρησιμοποιώντας ένα δωρεάν API (goqr.me)
    let ticketsHtml = ''
    insertedTickets.forEach((ticket, index) => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.ticket_code}`
      
      ticketsHtml += `
        <div style="border: 2px dashed #4F46E5; padding: 15px; margin-bottom: 15px; text-align: center; border-radius: 8px; background-color: #f9f9f9;">
          <h4 style="margin: 0 0 10px 0; color: #111;">Εισιτήριο ${index + 1} από ${quantity}</h4>
          <img src="${qrUrl}" alt="QR Code" style="width: 150px; height: 150px; display: block; margin: 0 auto 10px auto;" />
          <p style="font-family: monospace; font-size: 12px; color: #666; margin: 0;">CODE: ${ticket.ticket_code}</p>
        </div>
      `
    })

    // 4. Αποστολή του Email σταθερά στο manosmark42@gmail.com για το test
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Tickets <onboarding@resend.dev>',
        to: 'manosmark42@gmail.com', // Σταθερός παραλήπτης για τις δοκιμές
        subject: `🎫 Τα εισιτήριά σου για: ${artistName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #111; max-width: 500px; margin: auto;">
            <h2 style="color: #4F46E5; text-align: center;">Ευχαριστούμε, ${buyerName}! 👋</h2>
            <p style="text-align: center;">Η πληρωμή ολοκληρώθηκε. Παρακάτω θα βρεις τα unique εισιτήριά σου. Αποθήκευσε τα QR codes στο κινητό σου για την είσοδο.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
            
            ${ticketsHtml}
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
            <p style="font-size: 11px; color: #999; text-align: center;">Κάθε QR code μπορεί να σκαναριστεί μόνο μία φορά στην είσοδο.</p>
          </div>
        `,
      }),
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})