import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { artistSlug, quantity, buyerName, buyerEmail } = await req.json();

    // Validation
    if (!artistSlug || typeof artistSlug !== "string") throw new Error("Invalid artistSlug");
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw new Error("Quantity must be 1-10");
    if (!buyerName || typeof buyerName !== "string" || buyerName.trim().length < 2 || buyerName.length > 100)
      throw new Error("Invalid buyer name");
    if (!buyerEmail || typeof buyerEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail) || buyerEmail.length > 255)
      throw new Error("Invalid buyer email");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up artist + price
    const { data: artist, error: artistErr } = await supabase
      .from("artists")
      .select("slug, name, ticket_price, event_date, venue")
      .eq("slug", artistSlug)
      .maybeSingle();

    if (artistErr || !artist) throw new Error("Artist not found");

    const unitAmountCents = Math.round(Number(artist.ticket_price) * 100);
    const totalAmount = (Number(artist.ticket_price) * qty).toFixed(2);

    // Create order (pending)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        artist_slug: artist.slug,
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim().toLowerCase(),
        quantity: qty,
        total_amount: totalAmount,
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderErr) throw new Error("Failed to create order: " + orderErr.message);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
    });

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: buyerEmail.trim().toLowerCase(),
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${artist.name} — Live Ticket`,
              description: `${qty} ticket(s) for ${artist.name} in ${artist.venue}`,
            },
            unit_amount: unitAmountCents,
          },
          quantity: qty,
        },
      ],
      metadata: {
        order_id: order.id,
        artist_slug: artist.slug,
      },
      success_url: `${origin}/artist/${artist.slug}?payment=success&order_id=${order.id}`,
      cancel_url: `${origin}/artist/${artist.slug}?payment=cancelled`,
    });

    // Save session id
    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
