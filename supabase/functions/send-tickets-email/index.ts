// Placeholder: this function will be replaced once email infrastructure is set up.
// For now it logs the order so payments still complete cleanly.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order } = await supabase
      .from("orders")
      .select("*, artists:artist_slug(name, event_date, venue)")
      .eq("id", orderId)
      .maybeSingle();

    const { data: tickets } = await supabase
      .from("tickets")
      .select("*")
      .eq("order_id", orderId);

    console.log("📧 [send-tickets-email] Would send email:", {
      to: order?.buyer_email,
      buyer: order?.buyer_name,
      artist: (order?.artists as any)?.name,
      ticketCount: tickets?.length,
      codes: tickets?.map((t) => t.ticket_code),
    });
    console.log("⚠️ Email infrastructure not yet configured. Set up an email domain to enable real ticket delivery.");

    return new Response(JSON.stringify({ ok: true, logged: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-tickets-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
