import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, MapPin, Ticket, Instagram, ExternalLink, CheckCircle2, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ParticleBackground from '@/components/ParticleBackground';
import BuyTicketModal from '@/components/BuyTicketModal';

interface Artist {
  id: string;
  name: string;
  slug: string;
  label: string;
  tag: string;
  tag_color: string;
  gradient: string;
  accent: string;
  description: string;
  image: string;
  ticket_url: string | null;
  instagram_url: string | null;
  event_date: string | null;
  event_time: string | null;
  event_venue: string | null;
  ticket_price: number | null;
  ticket_currency: string;
  tickets_available: number | null;
  tickets_sold: number;
  is_published: boolean;
}

export default function ArtistPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  // Φόρτωση artist από Supabase
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    supabase
      .from('artists')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()
      .then(({ data, error }) => {
        if (data) setArtist(data);
        else setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  // Payment status από URL params
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      setShowSuccess(true);
      const t = setTimeout(() => {
        searchParams.delete('payment');
        searchParams.delete('order_id');
        setSearchParams(searchParams, { replace: true });
      }, 100);
      return () => clearTimeout(t);
    }
    if (payment === 'cancelled') {
      setShowCancelled(true);
      const t = setTimeout(() => {
        searchParams.delete('payment');
        setSearchParams(searchParams, { replace: true });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-500" />
      </div>
    );
  }

  // Not found state
  if (notFound || !artist) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-white mb-4">Artist Not Found</h1>
          <button onClick={() => navigate('/')} className="text-purple-400 hover:text-purple-300 transition-colors">
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  const ticketsSoldPct = artist.tickets_available
    ? Math.min(100, Math.round((artist.tickets_sold / artist.tickets_available) * 100))
    : null;

  return (
    <div className="bg-black min-h-screen overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-end overflow-hidden">
        <ParticleBackground />
        <div className="absolute inset-0">
          <img src={artist.image} alt={artist.name} className="w-full h-full object-cover brightness-[0.2]" />
          <div className={`absolute inset-0 bg-gradient-to-t ${artist.gradient} opacity-80`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pb-16 pt-32 w-full">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Lineup</span>
          </motion.button>

          <div className="flex flex-col md:flex-row items-start gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden flex-shrink-0"
              style={{ border: `2px solid ${artist.accent}40` }}
            >
              <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-t ${artist.gradient} opacity-40`} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex-1"
            >
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${artist.tag_color} text-white mb-4`}>
                {artist.tag}
              </span>
              <h1 className="text-5xl sm:text-7xl font-black text-white leading-none mb-3">{artist.name}</h1>
              <p className="text-gray-400 text-lg max-w-xl leading-relaxed">{artist.description}</p>
              <div className="flex items-center gap-2 mt-4">
                <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: artist.accent }} />
                <span className="text-sm font-medium" style={{ color: artist.accent }}>{artist.label}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="relative py-20 bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/5 to-black pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">

            {/* Event Info Box */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl p-8 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
                style={{ backgroundImage: `linear-gradient(90deg, ${artist.accent}, transparent)` }} />

              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${artist.accent}20`, border: `1px solid ${artist.accent}30` }}>
                  <Calendar size={18} style={{ color: artist.accent }} />
                </div>
                Event Details
              </h2>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Calendar size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Date</p>
                    <p className="text-white font-semibold">{artist.event_date || 'TBA'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Clock size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Time</p>
                    <p className="text-white font-semibold">{artist.event_time || 'TBA'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <MapPin size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Venue</p>
                    <p className="text-white font-semibold">{artist.event_venue || 'Heraklion, Crete'}</p>
                  </div>
                </div>

                {/* Τιμή εισιτηρίου */}
                {artist.ticket_price != null && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Ticket size={16} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Τιμή</p>
                      <p className="text-white font-semibold">
                        {artist.ticket_price} {artist.ticket_currency}
                      </p>
                    </div>
                  </div>
                )}

                {/* Progress bar εισιτηρίων */}
                {ticketsSoldPct !== null && (
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>{artist.tickets_sold} πουλήθηκαν</span>
                      <span>{artist.tickets_available! - artist.tickets_sold} διαθέσιμα</span>
                    </div>
                    <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${ticketsSoldPct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: artist.accent }}
                      />
                    </div>
                    {ticketsSoldPct >= 90 && (
                      <p className="text-xs text-red-400 font-bold mt-1.5">⚠ Τελευταία εισιτήρια!</p>
                    )}
                  </div>
                )}
              </div>

              <motion.button
                onClick={() => setModalOpen(true)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="mt-8 w-full py-4 rounded-xl font-bold text-base tracking-wide flex items-center justify-center gap-2 text-white relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${artist.accent}, ${artist.accent}cc)` }}
              >
                <motion.span
                  animate={{ x: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 opacity-20"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
                />
                <Ticket size={18} className="relative z-10" />
                <span className="relative z-10">
                  {artist.ticket_price != null ? `Αγορά — ${artist.ticket_price} ${artist.ticket_currency}` : 'Buy Tickets'}
                </span>
              </motion.button>
            </motion.div>

            {/* Social & Links Box */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl p-8 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500" />

              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.3)' }}>
                  <ExternalLink size={18} className="text-pink-400" />
                </div>
                Follow & Connect
              </h2>

              <p className="text-gray-400 leading-relaxed mb-8">
                Stay connected with {artist.name} for the latest updates, new music drops, and exclusive behind-the-scenes content.
              </p>

              <div className="space-y-3">
                {artist.instagram_url && (
                  <motion.a
                    href={artist.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 4, scale: 1.01 }}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
                      <Instagram size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">Instagram</p>
                      <p className="text-gray-500 text-xs">@{artist.name.toLowerCase().replace(/\s+/g, '')}</p>
                    </div>
                    <ExternalLink size={14} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                  </motion.a>
                )}

                {artist.ticket_url && (
                  <motion.a
                    href={artist.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 4, scale: 1.01 }}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${artist.accent}20`, border: `1px solid ${artist.accent}30` }}>
                      <Ticket size={18} style={{ color: artist.accent }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">Ticket Store</p>
                      <p className="text-gray-500 text-xs">Get your tickets now</p>
                    </div>
                    <ExternalLink size={14} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                  </motion.a>
                )}
              </div>
            </motion.div>
          </div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-8 rounded-2xl p-8 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h2 className="text-2xl font-black text-white mb-4">About {artist.name}</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              {artist.description}. Performing live in Heraklion as part of the{' '}
              <span className="text-purple-400 font-semibold">Heraklion is Alive</span> series — Crete's premier
              nightlife experience bringing Greece's biggest rap and urban artists to the island. Don't miss this
              unforgettable night of music, energy, and Mediterranean vibes.
            </p>
          </motion.div>

          {/* Map Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-8"
          >
            <div className="rounded-2xl overflow-hidden relative"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="p-6 flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <MapPin size={18} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg">Event Location</h3>
                  <p className="text-gray-500 text-sm">{artist.event_venue || 'Heraklion, Crete, Greece'}</p>
                </div>
              </div>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d51264.65744026695!2d25.09719131318359!3d35.33874479999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x149a5a5ba06c40e1%3A0x400bd2ce2b98c20!2sHeraklion%2C%20Greece!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s"
                width="100%"
                height="400"
                style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(0.8) contrast(1.2)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Event Location"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />

      <BuyTicketModal open={modalOpen} onClose={() => setModalOpen(false)} artist={artist} />

      {/* Success / Cancelled toasts */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] max-w-md w-[90%]"
          >
            <div className="rounded-2xl p-5 flex items-start gap-3 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(0,0,0,0.95))', border: '1px solid rgba(16,185,129,0.3)', backdropFilter: 'blur(20px)' }}>
              <CheckCircle2 size={22} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Payment confirmed! 🎟️</p>
                <p className="text-gray-400 text-xs mt-1">Your tickets for {artist.name} are on their way to your inbox.</p>
              </div>
              <button onClick={() => setShowSuccess(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
          </motion.div>
        )}
        {showCancelled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] max-w-md w-[90%]"
          >
            <div className="rounded-2xl p-5 flex items-start gap-3 shadow-2xl"
              style={{ background: 'rgba(0,0,0,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
              <X size={22} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Payment cancelled</p>
                <p className="text-gray-400 text-xs mt-1">No worries — try again whenever you're ready.</p>
              </div>
              <button onClick={() => setShowCancelled(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}