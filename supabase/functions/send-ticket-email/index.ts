import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Διαχείριση CORS για το Frontend
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { buyerEmail, buyerName, artistSlug, artistName, quantity, total, ticketCode } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. UPDATE: Ενημερώνουμε το εισιτήριο σε confirmed στη βάση
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'confirmed' })
      .eq('stripe_payment_intent_id', ticketCode)

    if (updateError) {
      console.error("❌ Supabase DB Update Error:", updateError)
      throw new Error(`Αποτυχία ενημέρωσης βάσης: ${updateError.message}`)
    }

    // 2. Ανάκτηση στοιχείων του artist για το email template
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

    const orderId = `ORD-${Date.now().toString().slice(-8)}`

    // 3. QR Code URL και HTML Template
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticketCode)}&bgcolor=ffffff&color=111111&margin=10`

    const ticketCardsHtml = `
      <div style="width: 560px; max-width: 100%; margin: 0 auto 40px auto; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
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
    `;

    // 4. Αποστολή με Resend - ΚΛΕΙΔΩΜΕΝΟ ΣΤΟ ΔΙΚΟ ΣΟΥ EMAIL ΓΙΑ ΤΑ ΤΕΣΤ
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Heraklion is Alive <onboarding@resend.dev>',
        to: 'manosmark42@gmail.com', // Στέλνει ΠΑΝΤΑ εδώ λόγω test phase
        subject: `🎫 Εισιτήριο για ${artistName} — Heraklion is Alive`,
        html: `<html><body>${ticketCardsHtml}</body></html>`,
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      console.error("❌ Resend API Error:", errorData)
      throw new Error("Αποτυχία αποστολής email μέσω Resend")
    }

    // 5. ΕΠΙΤΥΧΙΑ: Επιστρέφουμε θετική απάντηση στο Frontend
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Επιτυχής έκδοση εισιτήριου και sent email", 
        orderId 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    // 6. ΑΠΟΤΥΧΙΑ: Επιστρέφουμε το αρνητικό μήνυμα στο Frontend
    console.error('❌ Edge Function Error:', error.message)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Αποτυχία έκδοσης εισιτηρίου ή αποστολής email: ${error.message}` 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})