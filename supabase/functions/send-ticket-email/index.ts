import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Διαχείριση CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { buyerEmail, buyerName, artistSlug, artistName, quantity, total, ticketCode } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. UPDATE στη βάση δεδομένων
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'confirmed' })
      .eq('stripe_payment_intent_id', ticketCode)

    if (updateError) {
      console.error("❌ Supabase DB Update Error:", updateError)
      // Επιστρέφουμε 200 με success: false για να μην κρασάρει το fetch του frontend
      return new Response(
        JSON.stringify({ success: false, message: `Αποτυχία έκδοσης (DB Error): ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 2. Ανάκτηση στοιχείων του artist για το email
    const { data: artist } = await supabase
      .from('artists')
      .select('image, event_date, event_time, event_venue, ticket_price, ticket_currency, accent')
      .eq('slug', artistSlug)
      .single()

    const artistImage = artist?.image || ''
    const eventDate = artist?.event_date || 'TBA'
    const eventTime = artist?.event_time || 'TBA'
    const eventVenue = artist?.event_venue || 'Heraklion, Crete'
    const ticketPrice = artist?.ticket_price ?? (Number(total) / quantity)
    const currency = artist?.ticket_currency || 'EUR'
    const accentColor = artist?.accent || '#a855f7'

    // 3. QR Code και HTML Template
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticketCode)}&bgcolor=ffffff&color=111111&margin=10`

    const ticketCardsHtml = `
      <div style="width: 560px; max-width: 100%; margin: 0 auto 40px auto; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.5); font-family: sans-serif;">
        <div style="position: relative; height: 220px; background-image: url('${artistImage}'); background-size: cover; background-position: center top;">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%);"></div>
          <div style="position: absolute; top: 16px; left: 16px; background: ${accentColor}; color: white; font-size: 10px; font-weight: 800; padding: 4px 12px; border-radius: 20px;">Artist Hub Heraklion</div>
          <div style="position: absolute; bottom: 16px; left: 20px; right: 20px;">
            <div style="color: white; font-size: 30px; font-weight: 900;">${artistName}</div>
            <div style="color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 4px;">${eventVenue}</div>
          </div>
        </div>
        <div style="background: #0f0f1a; padding: 20px; text-align: center;">
          <div style="color: white; font-size: 14px; margin-bottom: 10px;">ΗΜΕΡΟΜΗΝΙΑ: ${eventDate} | ΩΡΑ: ${eventTime}</div>
          <div style="display: inline-block; background: white; padding: 12px; border-radius: 16px;">
            <img src="${qrUrl}" width="160" height="160" alt="QR Code" style="display: block;" />
          </div>
          <div style="color: rgba(255,255,255,0.7); font-family: monospace; margin-top: 10px;">${ticketCode}</div>
        </div>
      </div>
    `

    // 4. Αποστολή με Resend (Κλειδωμένο στο δικό σου email για τα τεστ)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Heraklion is Alive <onboarding@resend.dev>',
        to: 'manosmark42@gmail.com', // Πάντα εδώ για να μην τρως 403 από το Resend Sandbox
        subject: `🎫 Εισιτήριο για ${artistName} — Heraklion is Alive`,
        html: `<html><body>${ticketCardsHtml}</body></html>`,
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      console.error("❌ Resend API Error:", errorData)
      // Επιστρέφουμε 200 με success: false και το μήνυμα λάθους
      return new Response(
        JSON.stringify({ success: false, message: `Επιτυχής έκδοση, αλλά αποτυχία αποστολής email (Resend Sandbox).` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 5. ΟΛΑ ΠΕΤΥΧΑΝ
    return new Response(
      JSON.stringify({ success: true, message: "Επιτυχής έκδοση εισητήριου και sent email" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Κρίσιμο σφάλμα Function:', error.message)
    return new Response(
      JSON.stringify({ success: false, message: `Κρίσιμο σφάλμα: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})