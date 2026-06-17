import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ticket, Loader2, Minus, Plus, Mail, User } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Artist } from '@/data/artists';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface BuyTicketModalProps {
  open: boolean;
  onClose: () => void;
  artist: Artist;
}

interface ArtistPricing {
  ticket_price: number;
  event_date: string | null;
  event_venue: string | null;
}

async function sendTicketEmail(
  buyerEmail: string, 
  buyerName: string, 
  artistSlug: string, 
  artistName: string, 
  quantity: number, 
  total: string,
  ticketCode: string,
  setStep: (step: string) => void, // Πρόσθεσε αυτά τα states αν θέλεις να αλλάζεις την οθόνη
  setCustomMessage: (msg: string) => void 
) {
  try {
    console.log("⏳ Κλήση της Edge Function send-ticket-email...");
    
    const { data, error } = await supabase.functions.invoke('send-ticket-email', {
      body: { buyerEmail, buyerName, artistSlug, artistName, quantity, total, ticketCode }
    });

    // 1. Έλεγχος αν απέτυχε η κλήση HTTP ή αν η function επέστρεψε success: false
    if (error || !data || data.success === false) {
      console.log("❌ Αποτυχία έκδοσης εισιτηρίου");
      console.error("Λεπτομέρειες σφάλματος:", error || data?.message);
      
      setCustomMessage(data?.message || "Αποτυχία έκδοσης εισιτήριου");
      setStep('error'); // Ή το αντίστοιχο state που έχεις για το error screen
      return;
    }

    // 2. Αν όλα πήγαν καλά (success: true)
    console.log("🎉", data.message); // Θα τυπώσει: "Επιτυχής έκδοση εισιτήριου και sent email"
    
    setCustomMessage(data.message);
    setStep('success'); // Αλλάζει το modal στην οθόνη επιτυχίας
    
  } catch (error: any) {
    console.log("❌ Αποτυχία έκδοσης εισιτηρίου");
    console.error("❌ Κρίσιμο σφάλμα κατά την επικοινωνία με την Function:", error);
    setCustomMessage("Κρίσιμο σφάλμα κατά την επικοινωνία με τον server.");
    setStep('error');
  }
}

// ── Inner form (Stripe Context) ──
function CheckoutForm({ artist, pricing, quantity, onSuccess }: {
  artist: Artist;
  pricing: ArtistPricing;
  quantity: number;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements || !isReady) return;
    setLoading(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'Payment failed');
      setLoading(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed');
      setLoading(false);
    } else {
      onSuccess(); // Πυροδοτεί το βήμα επιτυχίας
    }
  };

  return (
    <div className="mt-5">
      <PaymentElement options={{ layout: 'tabs' }} onReady={() => setIsReady(true)} />
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm text-red-400 text-center">
          {error}
        </motion.p>
      )}
      <motion.button
        onClick={handleSubmit}
        disabled={loading || !stripe || !elements || !isReady}
        whileHover={{ scale: (loading || !isReady) ? 1 : 1.02 }}
        whileTap={{ scale: (loading || !isReady) ? 1 : 0.98 }}
        className="mt-5 w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 text-white disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${artist.accent}, ${artist.accent}cc)` }}
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> Επεξεργασία...</>
        ) : !isReady ? (
          <><Loader2 size={18} className="animate-spin" /> Φόρτωση φόρμας...</>
        ) : (
          <><Ticket size={18} /> Πληρωμή €{(pricing.ticket_price * quantity).toFixed(2)}</>
        )}
      </motion.button>
      <p className="text-center text-gray-600 text-xs mt-3 mb-2">
        Ασφαλής πληρωμή μέσω Stripe. Το εισιτήριο αποστέλλεται αμέσως.
      </p>
    </div>
  );
}

// ── Main Modal ──
export default function BuyTicketModal({ open, onClose, artist }: BuyTicketModalProps) {
  const { user, session } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pricing, setPricing] = useState<ArtistPricing | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState<string | null>(null); // Κρατάει τον κωδικό που φτιάχνει η Edge Function
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  useEffect(() => {
    if (!open) { 
      setStep('info'); 
      setClientSecret(null); 
      setTicketCode(null); 
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('artists')
      .select('ticket_price, event_date, event_venue')
      .eq('slug', artist.slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPricing({ ...data, ticket_price: Number(data.ticket_price) });
      });
  }, [open, artist.slug]);

  const handleProceedToPayment = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Εισάγετε το πλήρες όνομά σας');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Εισάγετε έγκυρο email');
    if (!pricing) return;

    setLoadingIntent(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          artistId: artist.slug,
          artistName: artist.name,
          eventDate: pricing.event_date ?? '',
          eventVenue: pricing.event_venue || 'Heraklion, Crete',
          price: pricing.ticket_price * quantity,
          buyerEmail: email.trim().toLowerCase(),
          buyerName: name.trim(),
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (fnError) throw fnError;
      
      setClientSecret(data.clientSecret);
      setTicketCode(data.ticketCode); // Αποθήκευση του μοναδικού κωδικού
      setStep('payment');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Σφάλμα. Δοκιμάστε ξανά.');
    } finally {
      setLoadingIntent(false);
    }
  };

  const price = pricing?.ticket_price ?? 0;
  const total = (price * quantity).toFixed(2);

  // Αυτό τρέχει ΜΟΛΙΣ η πληρωμή ολοκληρωθεί με επιτυχία
  const handlePaymentSuccess = async () => {
    setStep('success');
    if (ticketCode) {
      await sendTicketEmail(email.trim(), name.trim(), artist.slug, artist.name, quantity, total, ticketCode);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
            style={{
              background: 'linear-gradient(180deg, rgba(15,10,30,0.98), rgba(0,0,0,0.98))',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 z-20" style={{ background: `linear-gradient(90deg, ${artist.accent}, transparent)` }} />

            <button onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors z-20"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <X size={18} />
            </button>

            <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${artist.accent}20`, border: `1px solid ${artist.accent}40` }}>
                  <Ticket size={18} style={{ color: artist.accent }} />
                </div>
                <span className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: artist.accent }}>
                  {step === 'success' ? 'Επιτυχία!' : 'Αγορά Εισιτηρίου'}
                </span>
              </div>
              <h2 className="text-3xl font-black text-white mt-3 leading-tight truncate">{artist.name}</h2>
              <p className="text-gray-500 text-sm mt-1">{pricing?.event_venue || 'Heraklion, Crete'}</p>

              {step === 'info' && (
                <>
                  <div className="mt-6">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ποσότητα</label>
                    <div className="flex items-center justify-between mt-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1} className="w-10 h-10 rounded-lg flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/5 transition"><Minus size={16} /></button>
                      <span className="text-2xl font-black text-white tabular-nums">{quantity}</span>
                      <button onClick={() => setQuantity(q => Math.min(10, q + 1))} disabled={quantity >= 10} className="w-10 h-10 rounded-lg flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/5 transition"><Plus size={16} /></button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ονοματεπώνυμο</label>
                    <div className="relative mt-2">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Το όνομά σου" className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                    <div className="relative mt-2">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition" />
                    </div>
                  </div>

                  <div className="mt-6 p-4 rounded-xl flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Σύνολο</p>
                      <p className="text-gray-400 text-xs mt-0.5">€{price.toFixed(2)} × {quantity}</p>
                    </div>
                    <p className="text-3xl font-black text-white tabular-nums">€{total}</p>
                  </div>

                  {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm text-red-400 text-center">{error}</motion.p>}

                  <motion.button onClick={handleProceedToPayment} disabled={loadingIntent || !pricing} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-5 w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 text-white disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${artist.accent}, ${artist.accent}cc)` }}>
                    {loadingIntent ? <><Loader2 size={18} className="animate-spin" /> Φόρτωση...</> : <><Ticket size={18} /> Συνέχεια στην Πληρωμή</>}
                  </motion.button>
                </>
              )}

              {step === 'payment' && clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: artist.accent, borderRadius: '12px' } } }}>
                  <CheckoutForm artist={artist} pricing={pricing!} quantity={quantity} onSuccess={handlePaymentSuccess} onClose={onClose} />
                </Elements>
              )}

              {step === 'success' && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎫</div>
                  <h3 className="text-2xl font-black text-white mb-2">Η πληρωμή ολοκληρώθηκε!</h3>
                  <p className="text-gray-400 text-sm">Το εισιτήριό σου στάλθηκε στο <span className="text-white">{email}</span></p>
                  <motion.button onClick={onClose} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-6 w-full py-3 rounded-xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${artist.accent}, ${artist.accent}cc)` }}>
                    Κλείσιμο
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}