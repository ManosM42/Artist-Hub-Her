import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Παίρνουμε τα στοιχεία. Το ticketCode εδώ είναι το stripe_payment_intent_id που έρχεται από το frontend
    const { buyerEmail, buyerName, artistSlug, artistName, quantity, total, ticketCode } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. UPDATE: Κάνουμε update χρησιμοποιώντας τη σωστή στήλη (stripe_payment_intent_id)
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'confirmed' })
      .eq('stripe_payment_intent_id', ticketCode) // <- Εδώ έγινε η διόρθωση!

    if (updateError) {
      console.error("❌ Supabase DB Update Error:", updateError)
      throw new Error(`Database update failed: ${updateError.message}`)
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

    const orderDate = new Date().toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const orderTime = new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })
    const orderId = `ORD-${Date.now().toString().slice(-8)}`

    // 3. QR Code βασισμένο στο μοναδικό ID της πληρωμής
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticketCode)}&bgcolor=ffffff&color=111111&margin=10`

    const ticketCardsHtml = `
      <div style="width: 560px; max-width: 100%; margin: 0 auto 40px auto; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <div style="position: relative; height: 220px; background-image: url('${artistImage}'); background-size: cover; background-position: center top; background-color: #1a1a2e;">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%);"></div>
          <div style="position: absolute; top: 16px; left: 16px; background: ${accentColor}; color: white; font-size: 10px; font-weight: 800; padding: 4px 12px; border-radius: 20px; letter-spacing: 1px; text-transform: uppercase;">Artist Hub Heraklion</div>
          <div style="position: absolute; bottom: 16px; left: 20px; right: 20px;">
            <div style="color: white; font-size: 30px; font-weight: 900; line-height: 1; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">${artistName}</div>
            <div style="color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 4px;">${eventVenue}</div>
          </div>
        </div>
        <div style="background: #0f0f1a; padding: 0;">
          <div style="display: flex; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <div style="text-align: center; flex: 1;">
              <div style="color: rgba(255,255,255,0.4); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">ΗΜΕΡΟΜΗΝΙΑ</div>
              <div style="color: white; font-size: 14px; font-weight: 700;">${eventDate}</div>
            </div>
            <div style="width: 1px; background: rgba(255,255,255,0.08); margin: 0 4px;"></div>
            <div style="text-align: center; flex: 1;">
              <div style="color: rgba(255,255,255,0.4); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">ΩΡΑ</div>
              <div style="color: white; font-size: 14px; font-weight: 700;">${eventTime}</div>
            </div>
            <div style="width: 1px; background: rgba(255,255,255,0.08); margin: 0 4px;"></div>
            <div style="text-align: center; flex: 1;">
              <div style="color: rgba(255,255,255,0.4); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">ΤΙΜΗ</div>
              <div style="color: ${accentColor}; font-size: 14px; font-weight: 800;">${ticketPrice} ${currency}</div>
            </div>
          </div>
          <div style="text-align: center; padding: 24px 20px 20px;">
            <div style="display: inline-block; background: white; padding: 12px; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.4);">
              <img src="${qrUrl}" width="160" height="160" alt="QR Code" style="display: block;" />
            </div>
            <div style="margin-top: 14px;">
              <div style="color: rgba(255,255,255,0.3); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">ΚΩΔΙΚΟΣ ΕΙΣΙΤΗΡΙΟΥ</div>
              <div style="color: rgba(255,255,255,0.7); font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; letter-spacing: 1px; background: rgba(255,255,255,0.05); padding: 6px 14px; border-radius: 8px; display: inline-block;">${ticketCode}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const receiptHtml = `
    <div style="width: 560px; max-width: 100%; margin: 0 auto 40px auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px 16px 0 0; padding: 20px 24px 16px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="color: rgba(255,255,255,0.4); font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">ΑΠΟΔΕΙΞΗ ΑΓΟΡΑΣ</div>
          <div style="color: white; font-size: 18px; font-weight: 800; margin-top: 4px;">#${orderId}</div>
        </div>
      </div>
      <div style="background: #13131f; border: 1px solid rgba(255,255,255,0.08); border-top: none; padding: 0 24px;">
        <div style="padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="color: rgba(255,255,255,0.35); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">ΣΤΟΙΧΕΙΑ ΑΓΟΡΑΣΤΗ</div>
          <div style="color: white; font-size: 14px; font-weight: 600;">${buyerName}</div>
          <div style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 2px;">${buyerEmail}</div>
        </div>
        <div style="padding: 16px 0; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: white; font-size: 15px; font-weight: 700;">Σύνολο</span>
          <span style="color: ${accentColor}; font-size: 20px; font-weight: 900;">${total} ${currency}</span>
        </div>
      </div>
    </div>
    `;

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background: #111827;">
      <div style="background: #111827; padding: 40px 16px; min-height: 100vh;">
        ${ticketCardsHtml}
        ${receiptHtml}
      </div>
    </body>
    </html>
    `;

    // 4. Αποστολή με Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Heraklion is Alive <onboarding@resend.dev>',
        to: buyerEmail, 
        subject: `🎫 Εισιτήριο για ${artistName} — Heraklion is Alive`,
        html: emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      throw new Error(`Resend Failed: ${JSON.stringify(errorData)}`)
    }

    return new Response(JSON.stringify({ success: true, orderId }), {
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