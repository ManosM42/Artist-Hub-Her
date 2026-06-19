import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Instagram, Twitter, Youtube, MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase.ts'; // Adjust this import path to match your client file layout

const socials = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
  { icon: MessageCircle, label: 'TikTok', href: '#' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setStatus({ type: 'error', msg: 'Please fill out all fields.' });
      return;
    }

    setLoading(true);
    setStatus({ type: null, msg: '' });

    try {
      const { error } = await supabase
        .from('contacts')
        .insert([{ name: form.name, email: form.email, message: form.message }]);

      if (error) throw error;

      setStatus({ type: 'success', msg: 'Message sent successfully!' });
      setForm({ name: '', email: '', message: '' });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    // FIX 1: Transparent background layout
    <section id="contact" className="relative py-28 bg-transparent overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-5 blur-3xl" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
          <span className="inline-block text-xs font-bold tracking-[0.3em] text-purple-400 uppercase mb-4">Get in Touch</span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Contact{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>Us</span>
          </h2>
        </motion.div>

        {/* FIX 2: Wrapped layout components into custom unified fluid liquid-glass wrapper modules */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          
          {/* LIQUID GLASS FORM HOLDER */}
          <motion.form 
            initial={{ opacity: 0, x: -30 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }} 
            transition={{ duration: 0.6 }} 
            className="space-y-4 p-8 rounded-2xl backdrop-blur-xl border border-white/5" 
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,0,0,0.2))' }}
            onSubmit={handleSubmit}
          >
            {[{ name: 'name', placeholder: 'Your Name', type: 'text' }, { name: 'email', placeholder: 'Your Email', type: 'email' }].map(({ name, placeholder, type }) => (
              <input 
                key={name} 
                type={type} 
                placeholder={placeholder} 
                value={form[name as keyof typeof form]} 
                onChange={(e) => setForm({ ...form, [name]: e.target.value })} 
                disabled={loading}
                className="w-full px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50 transition-colors backdrop-blur-md" 
              />
            ))}
            <textarea 
              placeholder="Your Message" 
              value={form.message} 
              onChange={(e) => setForm({ ...form, message: e.target.value })} 
              disabled={loading}
              rows={4} 
              className="w-full px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none backdrop-blur-md" 
            />
            
            {status.type && (
              <p className={`text-xs font-semibold ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {status.msg}
              </p>
            )}

            <motion.button 
              whileHover={!loading ? { scale: 1.02 } : {}} 
              whileTap={!loading ? { scale: 0.98 } : {}} 
              disabled={loading}
              type="submit"
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50" 
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
              {loading ? 'Sending...' : 'Send Message'}
            </motion.button>
          </motion.form>

          {/* LIQUID GLASS SOCIAL INFOHOLDER */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }} 
            transition={{ duration: 0.6 }} 
            className="flex flex-col justify-between p-8 rounded-2xl backdrop-blur-xl border border-white/5"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,0,0,0.2))' }}
          >
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Join the Community</h3>
              <p className="text-gray-300 text-sm leading-relaxed">Follow us on social media for the latest updates on events, artist announcements, and exclusive content streaming straight out of Crete.</p>
            </div>
            
            <div className="flex gap-3 mt-6 md:mt-0">
              {socials.map(({ icon: Icon, label, href }) => (
                <motion.a 
                  key={label} 
                  href={href} 
                  whileHover={{ scale: 1.1, y: -2 }} 
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-md" 
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Icon size={18} className="text-gray-400 hover:text-purple-400 transition-colors" />
                </motion.a>
              ))}
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}