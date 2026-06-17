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

    // Ανάκτηση user
    let userId = null
    try {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (user) userId = user.id
      }
    } catch (_) {}

    // Ανάκτηση artist από Supabase (για φωτογραφία, ημερομηνία, venue, τιμή)
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

    const generatedCodes: string[] = []
    const ticketsRows = []
    const pricePerTicket = Number(total) / quantity
    const orderDate = new Date().toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const orderTime = new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })
    const orderId = `ORD-${Date.now().toString().slice(-8)}`

    for (let i = 0; i < quantity; i++) {
      const uniqueTicketCode = `${artistSlug.toUpperCase()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}-${Date.now().toString().slice(-4)}`
      generatedCodes.push(uniqueTicketCode)
      ticketsRows.push({
        user_id: userId,
        artist_id: artistSlug,
        artist_name: artistName,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        price: pricePerTicket,
        ticket_code: uniqueTicketCode,
        status: 'pending',
        event_date: eventDate,
        event_venue: eventVenue,
      })
    }

    await supabase.from('tickets').insert(ticketsRows)

    // ── Χτίσιμο των ticket cards ──────────────────────────────────
    const ticketCardsHtml = generatedCodes.map((code, i) => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=111111&margin=10`

      return `
      <!-- TICKET CARD ${i + 1} -->
      <div style="
        width: 560px;
        max-width: 100%;
        margin: 0 auto 40px auto;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 25px 60px rgba(0,0,0,0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">

        <!-- HERO: Artist Photo + Overlay -->
        <div style="
          position: relative;
          height: 220px;
          background-image: url('${artistImage}');
          background-size: cover;
          background-position: center top;
          background-color: #1a1a2e;
        ">
          <!-- Dark gradient overlay -->
          <div style="
            position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%);
          "></div>

          <!-- Event badge top-left -->
          <div style="
            position: absolute; top: 16px; left: 16px;
            background: ${accentColor};
            color: white; font-size: 10px; font-weight: 800;
            padding: 4px 12px; border-radius: 20px;
            letter-spacing: 1px; text-transform: uppercase;
          ">HERAKLION IS ALIVE</div>

          <!-- Ticket number top-right -->
          <div style="
            position: absolute; top: 16px; right: 16px;
            color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 600;
          ">${i + 1} / ${quantity}</div>

          <!-- Artist name bottom -->
          <div style="position: absolute; bottom: 16px; left: 20px; right: 20px;">
            <div style="color: white; font-size: 30px; font-weight: 900; line-height: 1; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">${artistName}</div>
            <div style="color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 4px;">${eventVenue}</div>
          </div>
        </div>

        <!-- TICKET BODY -->
        <div style="background: #0f0f1a; padding: 0;">

          <!-- Event details row -->
          <div style="
            display: flex; justify-content: space-between;
            padding: 18px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          ">
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

          <!-- Dashed separator (torn ticket effect) -->
          <div style="
            display: flex; align-items: center;
            padding: 0 20px;
            position: relative;
          ">
            <div style="
              width: 22px; height: 22px; border-radius: 50%;
              background: #111827;
              margin-left: -30px; flex-shrink: 0;
            "></div>
            <div style="
              flex: 1; border-top: 2px dashed rgba(255,255,255,0.1);
              margin: 0 8px;
            "></div>
            <div style="
              width: 22px; height: 22px; border-radius: 50%;
              background: #111827;
              margin-right: -30px; flex-shrink: 0;
            "></div>
          </div>

          <!-- QR Code section -->
          <div style="
            text-align: center;
            padding: 24px 20px 20px;
          ">
            <div style="
              display: inline-block;
              background: white;
              padding: 12px;
              border-radius: 16px;
              box-shadow: 0 8px 30px rgba(0,0,0,0.4);
            ">
              <img src="${qrUrl}" width="160" height="160" alt="QR Code" style="display: block;" />
            </div>
            <div style="margin-top: 14px;">
              <div style="color: rgba(255,255,255,0.3); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">ΚΩΔΙΚΟΣ ΕΙΣΙΤΗΡΙΟΥ</div>
              <div style="
                color: rgba(255,255,255,0.7);
                font-family: 'Courier New', monospace;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 1px;
                background: rgba(255,255,255,0.05);
                padding: 6px 14px;
                border-radius: 8px;
                display: inline-block;
              ">${code}</div>
            </div>
          </div>

          <!-- Footer -->
          <div style="
            padding: 14px 20px;
            background: rgba(255,255,255,0.02);
            border-top: 1px solid rgba(255,255,255,0.04);
            text-align: center;
          ">
            <div style="color: rgba(255,255,255,0.25); font-size: 10px; letter-spacing: 0.5px;">
              Παρουσιάστε το QR code στην είσοδο. Σκανάρεται μόνο μία φορά.
            </div>
          </div>

        </div>
      </div>
      `
    }).join('')

    // ── Απόδειξη ──────────────────────────────────────────────────
    const receiptHtml = `
    <div style="
      width: 560px; max-width: 100%;
      margin: 0 auto 40px auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      <!-- Receipt header -->
      <div style="
        background: #1a1a2e;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px 16px 0 0;
        padding: 20px 24px 16px;
        display: flex; justify-content: space-between; align-items: flex-start;
      ">
        <div>
          <div style="color: rgba(255,255,255,0.4); font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">ΑΠΟΔΕΙΞΗ ΑΓΟΡΑΣ</div>
          <div style="color: white; font-size: 18px; font-weight: 800; margin-top: 4px;">#${orderId}</div>
        </div>
        <div style="text-align: right;">
          <div style="color: rgba(255,255,255,0.4); font-size: 11px;">${orderDate}</div>
          <div style="color: rgba(255,255,255,0.4); font-size: 11px;">${orderTime}</div>
        </div>
      </div>

      <!-- Receipt body -->
      <div style="
        background: #13131f;
        border: 1px solid rgba(255,255,255,0.08);
        border-top: none;
        padding: 0 24px;
      ">

        <!-- Buyer info -->
        <div style="padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="color: rgba(255,255,255,0.35); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">ΣΤΟΙΧΕΙΑ ΑΓΟΡΑΣΤΗ</div>
          <div style="color: white; font-size: 14px; font-weight: 600;">${buyerName}</div>
          <div style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 2px;">${buyerEmail}</div>
        </div>

        <!-- Event info -->
        <div style="padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="color: rgba(255,255,255,0.35); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">ΣΤΟΙΧΕΙΑ EVENT</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: rgba(255,255,255,0.5); font-size: 12px;">Καλλιτέχνης</span>
            <span style="color: white; font-size: 12px; font-weight: 700;">${artistName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: rgba(255,255,255,0.5); font-size: 12px;">Ημερομηνία</span>
            <span style="color: white; font-size: 12px;">${eventDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: rgba(255,255,255,0.5); font-size: 12px;">Ώρα</span>
            <span style="color: white; font-size: 12px;">${eventTime}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: rgba(255,255,255,0.5); font-size: 12px;">Venue</span>
            <span style="color: white; font-size: 12px;">${eventVenue}</span>
          </div>
        </div>

        <!-- Line items -->
        <div style="padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="color: rgba(255,255,255,0.35); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">ΑΝΑΛΥΣΗ</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: rgba(255,255,255,0.5); font-size: 12px;">Εισιτήριο × ${quantity}</span>
            <span style="color: rgba(255,255,255,0.7); font-size: 12px;">${ticketPrice} ${currency} × ${quantity}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: rgba(255,255,255,0.5); font-size: 12px;">Χρεώσεις υπηρεσίας</span>
            <span style="color: rgba(255,255,255,0.7); font-size: 12px;">—</span>
          </div>
        </div>

        <!-- Total -->
        <div style="padding: 16px 0; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: white; font-size: 15px; font-weight: 700;">Σύνολο</span>
          <span style="color: ${accentColor}; font-size: 20px; font-weight: 900;">${total} ${currency}</span>
        </div>

      </div>

      <!-- Receipt footer -->
      <div style="
        background: #0f0f1a;
        border: 1px solid rgba(255,255,255,0.08);
        border-top: none;
        border-radius: 0 0 16px 16px;
        padding: 14px 24px;
        display: flex; justify-content: space-between; align-items: center;
      ">
        <div style="
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 20px; padding: 5px 12px;
        ">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></div>
          <span style="color: #10b981; font-size: 11px; font-weight: 700;">ΠΛΗΡΩΘΗΚΕ</span>
        </div>
        <div style="color: rgba(255,255,255,0.2); font-size: 10px;">Heraklion is Alive</div>
      </div>
    </div>
    `

    // ── Full email HTML ───────────────────────────────────────────
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Τα εισιτήριά σου — ${artistName}</title>
    </head>
    <body style="margin: 0; padding: 0; background: #111827;">

      <!-- Wrapper -->
      <div style="background: #111827; padding: 40px 16px; min-height: 100vh;">

        <!-- Header -->
        <div style="
          text-align: center;
          margin-bottom: 36px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">
          <div style="
            display: inline-block;
            color: white; font-size: 13px; font-weight: 800;
            letter-spacing: 3px; text-transform: uppercase;
            padding: 8px 20px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 30px;
            margin-bottom: 20px;
          ">HERAKLION IS ALIVE</div>
          <h1 style="
            color: white; font-size: 26px; font-weight: 900;
            margin: 0 0 8px 0; letter-spacing: -0.5px;
          ">Τα εισιτήριά σου είναι έτοιμα! 🎉</h1>
          <p style="color: rgba(255,255,255,0.4); font-size: 14px; margin: 0;">
            Γεια σου ${buyerName}, παρακάτω βρίσκεις ${quantity > 1 ? `τα ${quantity} εισιτήριά σου` : 'το εισιτήριό σου'} για τον <strong style="color: rgba(255,255,255,0.7);">${artistName}</strong>.
          </p>
        </div>

        <!-- Ticket Cards -->
        ${ticketCardsHtml}

        <!-- Divider -->
        <div style="
          width: 560px; max-width: 100%; margin: 0 auto 36px auto;
          display: flex; align-items: center; gap: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">
          <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.06);"></div>
          <div style="color: rgba(255,255,255,0.2); font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap;">Αποδεικτικό Αγοράς</div>
          <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.06);"></div>
        </div>

        <!-- Receipt -->
        ${receiptHtml}

        <!-- Footer -->
        <div style="
          text-align: center; margin-top: 40px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">
          <p style="color: rgba(255,255,255,0.2); font-size: 11px; line-height: 1.6; margin: 0;">
            Αυτό το email εστάλη αυτόματα. Μην απαντάς σε αυτό το μήνυμα.<br>
            © ${new Date().getFullYear()} Artist Hub Heraklion. All rights reserved.
          </p>
        </div>

      </div>
    </body>
    </html>
    `

    // ── Αποστολή με Resend ────────────────────────────────────────
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Heraklion is Alive <onboarding@resend.dev>',
        to: 'manosmark42@gmail.com',
        subject: `🎫 ${quantity > 1 ? `${quantity} εισιτήρια` : 'Εισιτήριο'} για ${artistName} — Heraklion is Alive`,
        html: emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      const err = await resendResponse.json()
      throw new Error(`Resend error: ${JSON.stringify(err)}`)
    }

    return new Response(JSON.stringify({ success: true, orderId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Edge Function error:', error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})