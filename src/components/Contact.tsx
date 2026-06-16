import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Instagram, Twitter, Youtube, MessageCircle } from 'lucide-react';

const socials = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
  { icon: MessageCircle, label: 'TikTok', href: '#' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  return (
    <section id="contact" className="relative py-28 bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-5 blur-3xl" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      </div>

      <div className="max-w-4xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
          <span className="inline-block text-xs font-bold tracking-[0.3em] text-purple-400 uppercase mb-4">Get in Touch</span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Contact{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>Us</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          <motion.form initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {[{ name: 'name', placeholder: 'Your Name', type: 'text' }, { name: 'email', placeholder: 'Your Email', type: 'email' }].map(({ name, placeholder, type }) => (
              <input key={name} type={type} placeholder={placeholder} value={form[name as keyof typeof form]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} className="w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50 transition-colors" />
            ))}
            <textarea placeholder="Your Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} className="w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none" />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
              <Send size={16} /> Send Message
            </motion.button>
          </motion.form>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex flex-col justify-center gap-6">
            <p className="text-gray-400 leading-relaxed">Follow us on social media for the latest updates on events, artist announcements, and exclusive content.</p>
            <div className="flex gap-3">
              {socials.map(({ icon: Icon, label, href }) => (
                <motion.a key={label} href={href} whileHover={{ scale: 1.1, y: -2 }} className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Icon size={18} className="text-gray-500 hover:text-purple-400 transition-colors" />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
