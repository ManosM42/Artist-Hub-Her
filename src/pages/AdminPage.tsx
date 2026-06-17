import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  Shield, LogOut, Plus, Edit3, Trash2, Eye, EyeOff,
  Save, X, Search, Ticket, Calendar, Clock, MapPin,
  Link, Instagram, Image, ChevronUp, ChevronDown,
  Users, TrendingUp, Music, AlertCircle, Check, Loader2, Map, Scan
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  ticket_url: string;
  instagram_url: string;
  event_date: string;
  event_time: string;
  event_venue: string;
  venue_lat: number | null;
  venue_lng: number | null;
  ticket_price: number | null;
  ticket_currency: string;
  tickets_available: number | null;
  tickets_sold: number;
  is_published: boolean;
  sort_order: number;
}

const EMPTY_ARTIST: Omit<Artist, 'id'> = {
  name: '', slug: '', label: 'Live in Heraklion', tag: 'Fan Favorite',
  tag_color: 'from-purple-500 to-violet-500',
  gradient: 'from-purple-900 via-purple-800 to-indigo-900',
  accent: '#a855f7', description: '',
  image: '', ticket_url: '', instagram_url: '',
  event_date: 'TBA', event_time: 'TBA', event_venue: 'Heraklion, Crete',
  venue_lat: 35.3387, venue_lng: 25.1442,
  ticket_price: null, ticket_currency: 'EUR',
  tickets_available: null, tickets_sold: 0,
  is_published: true, sort_order: 0,
};

const TAG_COLORS = [
  { label: 'Purple', value: 'from-purple-500 to-violet-500' },
  { label: 'Pink', value: 'from-pink-500 to-rose-500' },
  { label: 'Yellow', value: 'from-yellow-500 to-orange-500' },
  { label: 'Cyan', value: 'from-cyan-500 to-blue-500' },
  { label: 'Green', value: 'from-emerald-500 to-teal-500' },
  { label: 'Red', value: 'from-red-500 to-orange-500' },
  { label: 'Amber', value: 'from-amber-500 to-yellow-500' },
];

const GRADIENTS = [
  { label: 'Purple', value: 'from-purple-900 via-purple-800 to-indigo-900' },
  { label: 'Pink', value: 'from-pink-950 via-rose-900 to-purple-950' },
  { label: 'Blue', value: 'from-blue-950 via-indigo-900 to-purple-950' },
  { label: 'Teal', value: 'from-teal-950 via-emerald-900 to-slate-900' },
  { label: 'Red', value: 'from-red-950 via-orange-900 to-purple-950' },
  { label: 'Amber', value: 'from-amber-950 via-yellow-900 to-slate-900' },
  { label: 'Violet', value: 'from-violet-950 via-purple-900 to-slate-900' },
];

// ── LOGIN ─────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError('Λάθος email ή κωδικός.'); setLoading(false); return; }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('Δεν έχεις δικαιώματα admin.'); setLoading(false); return;
    }
    onLogin();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Heraklion is Alive</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1.5 block">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1.5 block">Κωδικός</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition" />
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-400" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Σύνδεση
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ── QR SCANNER COMPONENT ──────────────────────────────────────────
function QrTicketScanner({ onScanSuccess }: { onScanSuccess: (msg: string, type: 'success' | 'error') => void }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ message: string; success: boolean } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (scanning) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(
        async (decodedText) => {
          // 1. Σταματάμε αμέσως το scanner για να μην ξανασκανάρει κατά την επεξεργασία
          setScanning(false);
          if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
          }

          try {
            // 2. Καθαρισμός του κειμένου. Αν είναι URL, παίρνουμε μόνο το τελευταίο κομμάτι μετά το τελευταίο /
            let cleanCode = decodedText.trim();
            if (cleanCode.includes('/')) {
              const parts = cleanCode.split('/');
              cleanCode = parts[parts.length - 1] || cleanCode;
            }
            
            console.log("🔍 Αναζήτηση στη βάση για το ticket_code:", cleanCode);

            // 3. Έλεγχος αν το εισιτήριο υπάρχει στον πίνακα tickets
            const { data: ticket, error: fetchError } = await supabase
              .from('tickets')
              .select('*')
              .eq('ticket_code', cleanCode)
              .maybeSingle(); // Χρησιμοποιούμε maybeSingle για να αποφύγουμε crash αν δεν βρεθεί τίποτα

            if (fetchError || !ticket) {
              console.error("Σφάλμα ή δεν βρέθηκε εισιτήριο:", fetchError);
              setScanResult({ 
                message: `❌ Άκυρο Εισιτήριο!\nΟ κωδικός [ ${cleanCode} ] δεν υπάρχει στη βάση δεδομένων.`, 
                success: false 
              });
              onScanSuccess("Άκυρο εισιτήριο!", "error");
              return;
            }

            // 4. Εφόσον βρέθηκε, το ΔΙΑΓΡΑΦΟΥΜΕ αμέσως για να μην ξαναχρησιμοποιηθεί
            const { error: deleteError } = await supabase
              .from('tickets')
              .delete()
              .eq('id', ticket.id);

            if (deleteError) throw deleteError;

            // 5. Εμφάνιση μηνύματος επιτυχούς εισόδου
            setScanResult({
              message: `✅ ΕΓΚΥΡΟ ΕΙΣΙΤΗΡΙΟ! ΚΑΛΗ ΔΙΑΣΚΕΔΑΣΗ!\n\n👤 Κάτοχος: ${ticket.buyer_name || '—'}\n🎫 Event: ${ticket.artist_name || '—'}\n🔑 Code: ${ticket.ticket_code}\n\nΤο εισιτήριο αφαιρέθηκε οριστικά από το σύστημα.`,
              success: true
            });
            onScanSuccess("✓ Έγκυρο εισιτήριο! Διαγράφηκε.", "success");

          } catch (err: any) {
            console.error("Κρίσιμο σφάλμα κατά το σκανάρισμα:", err);
            setScanResult({ message: `❌ Σφάλμα συστήματος: ${err.message}`, success: false });
            onScanSuccess("Σφάλμα επεξεργασίας", "error");
          }
        },
        (error) => {
          // Αγνοούμε τα warning ανάγνωσης κατά την κίνηση της κάμερας
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [scanning]);

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
        <Scan size={24} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white">Σκανάρισμα QR Code</h3>
        <p className="text-gray-500 text-xs mt-1">Χρησιμοποίησε την κάμερα για να ελέγξεις και να διαγράψεις τα έγκυρα εισιτήρια στην είσοδο.</p>
      </div>

      {!scanning && !scanResult && (
        <button onClick={() => setScanning(true)}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition">
          Άνοιγμα Κάμερας
        </button>
      )}

      {scanning && (
        <div className="w-full bg-black border border-white/10 rounded-xl overflow-hidden p-2">
          <div id="qr-reader" className="w-full"></div>
          <button onClick={() => setScanning(false)}
            className="mt-2 w-full bg-white/5 hover:bg-white/10 text-gray-400 py-2 rounded-lg text-xs transition">
            Κλείσιμο Κάμερας
          </button>
        </div>
      )}

      {scanResult && (
        <div className={`w-full p-4 border rounded-xl text-sm whitespace-pre-line text-left ${scanResult.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <p className="font-bold mb-3">{scanResult.message}</p>
          <button onClick={() => { setScanResult(null); setScanning(true); }}
            className="w-full bg-white/10 hover:bg-white/15 text-white py-2 rounded-lg text-xs font-bold transition text-center block">
            Σκανάρισμα Επόμενου
          </button>
        </div>
      )}
    </div>
  );
}

// ── ARTIST FORM ───────────────────────────────────────────────────
function ArtistForm({ initial, onSave, onCancel }: {
  initial: Partial<Artist>;
  onSave: (data: Partial<Artist>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Artist>>({ ...EMPTY_ARTIST, ...initial });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'basic' | 'event' | 'tickets' | 'visual'>('basic');

  const set = (k: keyof Artist, v: any) => setForm(f => ({ ...f, [k]: v }));
  const autoSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const tabs = [
    { key: 'basic', label: 'Βασικά', icon: Music },
    { key: 'event', label: 'Event & Map', icon: Calendar },
    { key: 'tickets', label: 'Εισιτήρια', icon: Ticket },
    { key: 'visual', label: 'Εμφάνιση', icon: Image },
  ] as const;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-white font-black text-lg">
            {initial.id ? `Επεξεργασία: ${initial.name}` : 'Νέος Artist'}
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-white transition"><X size={20} /></button>
        </div>

        <div className="flex border-b border-white/8">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition ${tab === t.key ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}>
                <Icon size={14} />{t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'basic' && (
            <>
              <Field label="Όνομα Artist *">
                <input value={form.name || ''} onChange={e => { set('name', e.target.value); if (!initial.id) set('slug', autoSlug(e.target.value)); }}
                  className={input} placeholder="π.χ. SNIK" />
              </Field>
              <Field label="Slug (URL) *">
                <input value={form.slug || ''} onChange={e => set('slug', e.target.value)}
                  className={input} placeholder="π.χ. snik" />
              </Field>
              <Field label="Περιγραφή">
                <textarea value={form.description || ''} onChange={e => set('description', e.target.value)}
                  rows={3} className={input + ' resize-none'} placeholder="Σύντομη περιγραφή..." />
              </Field>
              <Field label="Tag">
                <input value={form.tag || ''} onChange={e => set('tag', e.target.value)}
                  className={input} placeholder="π.χ. Headliner, Fan Favorite" />
              </Field>
              <Field label="Label">
                <input value={form.label || ''} onChange={e => set('label', e.target.value)}
                  className={input} placeholder="π.χ. Live in Heraklion" />
              </Field>
              <Field label="Instagram URL">
                <input value={form.instagram_url || ''} onChange={e => set('instagram_url', e.target.value)}
                  className={input} placeholder="https://instagram.com/username" />
              </Field>
              <Field label="Εικόνα URL">
                <input value={form.image || ''} onChange={e => set('image', e.target.value)}
                  className={input} placeholder="https://..." />
                {form.image && <img src={form.image} className="mt-2 w-20 h-20 rounded-xl object-cover border border-white/10" />}
              </Field>
            </>
          )}

          {tab === 'event' && (
            <>
              <Field label="Ημερομηνία">
                <input value={form.event_date || ''} onChange={e => set('event_date', e.target.value)}
                  className={input} placeholder="π.χ. 15 Αυγούστου 2026" />
              </Field>
              <Field label="Ώρα">
                <input value={form.event_time || ''} onChange={e => set('event_time', e.target.value)}
                  className={input} placeholder="π.χ. 22:00" />
              </Field>
              <Field label="Όνομα Τοποθεσίας (Venue)">
                <input value={form.event_venue || ''} onChange={e => set('event_venue', e.target.value)}
                  className={input} placeholder="π.χ. Πύλη Βηθλεέμ, Ηράκλειο" />
              </Field>
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <Field label="Venue Latitude">
                  <input type="number" step="any" value={form.venue_lat ?? ''} onChange={e => set('venue_lat', e.target.value ? Number(e.target.value) : null)}
                    className={input} placeholder="35.3387" />
                </Field>
                <Field label="Venue Longitude">
                  <input type="number" step="any" value={form.venue_lng ?? ''} onChange={e => set('venue_lng', e.target.value ? Number(e.target.value) : null)}
                    className={input} placeholder="25.1442" />
                </Field>
              </div>
            </>
          )}

          {tab === 'tickets' && (
            <>
              <Field label="Τιμή Εισιτηρίου (€)">
                <input type="number" value={form.ticket_price ?? ''} onChange={e => set('ticket_price', e.target.value ? Number(e.target.value) : null)}
                  className={input} placeholder="25" min={0} />
              </Field>
              <Field label="Διαθέσιμα Εισιτήρια">
                <input type="number" value={form.tickets_available ?? ''} onChange={e => set('tickets_available', e.target.value ? Number(e.target.value) : null)}
                  className={input} placeholder="500" min={0} />
              </Field>
              <Field label="Πωλήθηκαν">
                <input type="number" value={form.tickets_sold || 0} onChange={e => set('tickets_sold', Number(e.target.value))}
                  className={input} min={0} />
              </Field>
              <Field label="Ticket URL">
                <input value={form.ticket_url || ''} onChange={e => set('ticket_url', e.target.value)}
                  className={input} placeholder="https://..." />
              </Field>
            </>
          )}

          {tab === 'visual' && (
            <>
              <Field label="Accent Color">
                <div className="flex items-center gap-3">
                  <input type="color" value={form.accent || '#a855f7'} onChange={e => set('accent', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                  <input value={form.accent || ''} onChange={e => set('accent', e.target.value)}
                    className={input + ' flex-1'} placeholder="#a855f7" />
                </div>
              </Field>
              <Field label="Tag Color">
                <div className="grid grid-cols-4 gap-2">
                  {TAG_COLORS.map(c => (
                    <button key={c.value} onClick={() => set('tag_color', c.value)}
                      className={`h-8 rounded-lg bg-gradient-to-r ${c.value} text-[10px] font-bold text-white relative transition ${form.tag_color === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-950' : 'opacity-70 hover:opacity-100'}`}>
                      {form.tag_color === c.value && <Check size={10} className="absolute inset-0 m-auto" />}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Background Gradient">
                <div className="grid grid-cols-2 gap-2">
                  {GRADIENTS.map(g => (
                    <button key={g.value} onClick={() => set('gradient', g.value)}
                      className={`h-12 rounded-xl bg-gradient-to-br ${g.value} text-xs font-bold text-white/70 relative transition ${form.gradient === g.value ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-950' : 'opacity-60 hover:opacity-90'}`}>
                      {g.label}
                      {form.gradient === g.value && <Check size={12} className="absolute top-2 right-2" />}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Sort Order">
                <input type="number" value={form.sort_order || 0} onChange={e => set('sort_order', Number(e.target.value))}
                  className={input} />
              </Field>
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-zinc-950">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-bold">Δημοσίευση</span>
            <button onClick={() => set('is_published', !form.is_published)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.is_published ? 'bg-purple-600' : 'bg-white/10'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_published ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-5 py-2 rounded-xl bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition">Ακύρωση</button>
            <button onClick={handleSave} disabled={saving || !form.name || !form.slug}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40 transition">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Αποθήκευση
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const input = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition placeholder:text-gray-600";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

// ── MAIN ADMIN PAGE ───────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentView, setCurrentView] = useState<'artists' | 'scanner'>('artists');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingArtist, setEditingArtist] = useState<Partial<Artist> | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const totalTickets = artists.reduce((s, a) => s + (a.tickets_sold || 0), 0);
  const totalRevenue = artists.reduce((s, a) => s + ((a.tickets_sold || 0) * (a.ticket_price || 0)), 0);
  const published = artists.filter(a => a.is_published).length;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single();
        if (profile?.role === 'admin') { 
          setAuthed(true); 
          fetchArtists(); 
        } else {
          await supabase.auth.signOut();
        }
      }
      setCheckingAuth(false);
    });
  }, []);

  const fetchArtists = async () => {
    setLoading(true);
    const { data } = await supabase.from('artists').select('*').order('sort_order').order('name');
    setArtists(data ?? []);
    setLoading(false);
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (data: Partial<Artist>) => {
    setLoading(true);
    const { id, ...cleanData } = data;
    const payload = {
      ...cleanData,
      venue_lat: data.venue_lat ? Number(data.venue_lat) : null,
      venue_lng: data.venue_lng ? Number(data.venue_lng) : null,
      ticket_price: data.ticket_price ? Number(data.ticket_price) : null,
      tickets_available: data.tickets_available ? Number(data.tickets_available) : null,
      tickets_sold: data.tickets_sold ? Number(data.tickets_sold) : 0,
      sort_order: data.sort_order ? Number(data.sort_order) : 0,
    };

    if (id) {
      const { error } = await supabase.from('artists').update(payload).eq('id', id);
      if (error) { 
        showToast('Σφάλμα αποθήκευσης: ' + error.message, 'error'); 
        setLoading(false);
        return; 
      }
      showToast(`✓ ${data.name} ενημερώθηκε`);
    } else {
      const { error } = await supabase.from('artists').insert([payload]);
      if (error) { 
        showToast('Σφάλμα δημιουργίας: ' + error.message, 'error'); 
        setLoading(false);
        return; 
      }
      showToast(`✓ ${data.name} δημιουργήθηκε`);
    }
    setEditingArtist(null);
    fetchArtists();
  };

  const handleDelete = async (artist: Artist) => {
    if (!confirm(`Διαγραφή "${artist.name}"; Δεν αναιρείται.`)) return;
    await supabase.from('artists').delete().eq('id', artist.id);
    showToast(`${artist.name} διαγράφηκε`);
    fetchArtists();
  };

  const handleTogglePublish = async (artist: Artist) => {
    await supabase.from('artists').update({ is_published: !artist.is_published }).eq('id', artist.id);
    fetchArtists();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthed(false);
  };

  const filtered = artists.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.tag?.toLowerCase().includes(search.toLowerCase())
  );

  if (checkingAuth) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-purple-500" />
    </div>
  );

  if (!authed) return <AdminLogin onLogin={() => { setAuthed(true); fetchArtists(); }} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-sm">Admin Panel</h1>
              <p className="text-gray-500 text-[10px]">Heraklion is Alive</p>
            </div>
          </div>
          {/* VIEW SWITCHER TABS */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button onClick={() => setCurrentView('artists')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${currentView === 'artists' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Music size={12} /> Artists
            </button>
            <button onClick={() => setCurrentView('scanner')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${currentView === 'scanner' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Scan size={12} /> Έλεγχος QR
            </button>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-white text-xs transition">
          <LogOut size={14} /> Αποσύνδεση
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Artists', value: artists.length, icon: Music, color: 'text-purple-400' },
            { label: 'Δημοσιευμένα', value: published, icon: Eye, color: 'text-green-400' },
            { label: 'Εισιτήρια', value: totalTickets, icon: Ticket, color: 'text-blue-400' },
            { label: 'Έσοδα', value: `€${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-yellow-400' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <Icon size={18} className={s.color + ' mb-2'} />
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* MAIN VIEWS */}
        {currentView === 'scanner' ? (
          <QrTicketScanner onScanSuccess={(msg, type) => showToast(msg, type)} />
        ) : (
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="font-black text-white">Artists</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Αναζήτηση..." className="bg-white/5 border border-white/8 rounded-xl pl-8 pr-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500 w-40" />
                </div>
                <button onClick={() => setEditingArtist({})}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition">
                  <Plus size={14} /> Νέος Artist
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-purple-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <Music size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Δεν βρέθηκαν artists</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map(artist => (
                  <motion.div key={artist.id} layout className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition group">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                      {artist.image
                        ? <img src={artist.image} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">{artist.name[0]}</div>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white truncate">{artist.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${artist.tag_color} text-white`}>
                          {artist.tag}
                        </span>
                        {!artist.is_published && <span className="text-[10px] text-gray-600 font-bold">[hidden]</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Calendar size={10} />{artist.event_date || 'TBA'}
                        </span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <MapPin size={10} />{artist.event_venue || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => handleTogglePublish(artist)}
                        className={`p-2 rounded-lg transition ${artist.is_published ? 'text-green-400 hover:bg-green-400/10' : 'text-gray-600 hover:bg-white/5'}`}>
                        {artist.is_published ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <button onClick={() => setEditingArtist(artist)}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDelete(artist)}
                        className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS & TOAST */}
      <AnimatePresence>
        {editingArtist !== null && (
          <ArtistForm initial={editingArtist} onSave={handleSave} onCancel={() => setEditingArtist(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl z-50 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}