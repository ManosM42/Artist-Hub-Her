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

    // Ανάκτησης του User ID από το Auth Header
    let userId = null
    try {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (user) userId = user.id
      }
    } catch (_) {
      console.log("No authenticated user found");
    }

    const generatedCodes: string[] = []
    const ticketsRows = []

    // Υπολογισμός τιμής ανά εισιτήριο
    const pricePerTicket = Number(total) / quantity

    for (let i = 0; i < quantity; i++) {
      // Παραγωγή Μοναδικού Κωδικού Εισιτηρίου
      const uniqueTicketCode = `${artistSlug.toUpperCase()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}-${Date.now().toString().slice(-4)}`
      generatedCodes.push(uniqueTicketCode)
      
      ticketsRows.push({
        user_id: userId,
        artist_id: artistSlug, // Κρατάμε το slug ή ID του καλλιτέχνη
        artist_name: artistName,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        price: pricePerTicket,
        ticket_code: uniqueTicketCode,
        status: 'pending', // Ξεκινάει ως pending και γίνεται completed στο σκανάρισμα
        event_date: new Date().toISOString(), // Ή όποια ημερομηνία περνάς
        event_venue: 'Συναυλιακός Χώρος'
      })
    }

    console.log("Εισαγωγή των εισιτηρίων στον πίνακα tickets...");
    const { data: insertedTickets, error: ticketsError } = await supabase
      .from('tickets')
      .insert(ticketsRows)
      .select()

    if (ticketsError) {
      console.error("Σφάλμα Supabase κατά το insert:", ticketsError)
      throw ticketsError
    }

    // Δημιουργία των QR Codes για το Email
    let ticketsHtml = ''
    generatedCodes.forEach((code, index) => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${code}`
      
      ticketsHtml += `
        <div style="border: 2px dashed #4F46E5; padding: 15px; margin-bottom: 15px; text-align: center; border-radius: 8px; background-color: #f9f9f9;">
          <h4 style="margin: 0 0 10px 0; color: #111;">Εισιτήριο ${index + 1} από ${quantity}</h4>
          <img src="${qrUrl}" alt="QR Code" style="width: 150px; height: 150px; display: block; margin: 0 auto 10px auto;" />
          <p style="font-family: monospace; font-size: 12px; color: #666; margin: 0;">ΚΩΔΙΚΟΣ: ${code}</p>
        </div>
      `
    })

    // Αποστολή Email μέσω Resend στο manosmark42@gmail.com
    console.log("Αποστολή email μέσω Resend...")
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Tickets <onboarding@resend.dev>',
        to: 'manosmark42@gmail.com', // Δοκιμή στο δικό σου email
        subject: `🎫 Τα εισιτήριά σου για: ${artistName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #111; max-width: 500px; margin: auto;">
            <h2 style="color: #4F46E5; text-align: center;">Ευχαριστούμε, ${buyerName}! 👋</h2>
            <p style="text-align: center;">Η πληρωμή σου ολοκληρώθηκε επιτυχώς. Παρακάτω θα βρεις τα QR Codes των εισιτηρίων σου για την είσοδο.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
            
            ${ticketsHtml}
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
            <p style="font-size: 11px; color: #999; text-align: center;">Κάθε QR code σκανάρεται μόνο μία φορά στην είσοδο.</p>
          </div>
        `,
      }),
    })

    if (!resendResponse.ok) {
      const resendData = await resendResponse.json()
      throw new Error(`Resend API Error: ${JSON.stringify(resendData)}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("❌ Κρίσιμο σφάλμα στην Edge Function:", error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})