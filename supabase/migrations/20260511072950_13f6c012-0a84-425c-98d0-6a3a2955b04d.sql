
-- Artists table (keyed by slug to match existing frontend data)
CREATE TABLE public.artists (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ,
  venue TEXT NOT NULL DEFAULT 'Heraklion, Crete',
  ticket_price NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  tickets_available INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_slug TEXT NOT NULL REFERENCES public.artists(slug),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 10),
  total_amount NUMERIC(10,2) NOT NULL,
  stripe_session_id TEXT UNIQUE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  artist_slug TEXT NOT NULL REFERENCES public.artists(slug),
  ticket_code TEXT NOT NULL UNIQUE,
  qr_code_data TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_session ON public.orders(stripe_session_id);
CREATE INDEX idx_tickets_order ON public.tickets(order_id);

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Public can read artists (needed for ticket pricing on artist page)
CREATE POLICY "Artists are publicly readable"
  ON public.artists FOR SELECT
  USING (true);

-- Orders & tickets: no client access. All writes/reads happen via edge functions
-- using the service role key, which bypasses RLS. No policies = no access for anon/authenticated.

-- Seed artists
INSERT INTO public.artists (slug, name, ticket_price) VALUES
  ('snik', 'SNIK', 35.00),
  ('light', 'LIGHT', 25.00),
  ('trannos', 'TRANNOS', 30.00),
  ('daima', 'DAIMA', 25.00),
  ('rack', 'RACK', 22.00),
  ('mente-fuerte', 'MENTE FUERTE', 28.00),
  ('toquel', 'TOQUEL', 30.00),
  ('fy', 'FY', 22.00),
  ('hawk', 'HAWK', 22.00),
  ('sidarta', 'SIDARTA', 22.00),
  ('saske', 'SASKE', 22.00),
  ('fly-lo', 'FLY LO', 25.00),
  ('strat', 'STRAT', 22.00),
  ('hermes', 'HERMES', 22.00),
  ('yung-kapa', 'YUNG KAPA', 22.00),
  ('xrs', 'XRS', 22.00),
  ('bossikan', 'BOSSIKAN', 22.00),
  ('ivan-greco', 'IVAN GRECO', 22.00),
  ('kidd', 'KIDD', 22.00),
  ('roi-6-12', 'ROI 6/12', 22.00);
