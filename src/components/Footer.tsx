import { motion } from 'framer-motion';
import { Zap, Instagram, Twitter, Youtube, MessageCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const links = [
  { label: 'Home', href: '#home' },
  { label: 'Events', href: '#events' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

const socials = [
  { icon: Instagram, href: '#' },
  { icon: Twitter, href: '#' },
  { icon: Youtube, href: '#' },
  { icon: MessageCircle, href: '#' },
];

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (href: string) => {
    if (location.pathname !== '/') {
      navigate('/' + href);
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative bg-black border-t border-white/5 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-700/50 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="flex items-center gap-2">
            <div className="relative">
              <Zap size={18} className="text-purple-400" fill="currentColor" />
              <div className="absolute inset-0 blur-md bg-purple-500 opacity-50" />
            </div>
            <span className="text-white font-black text-base">Artist Hub<span className="text-purple-400"> Heaklion</span></span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="flex items-center gap-6">
            {links.map((link) => (
              <button key={link.href} onClick={() => handleNav(link.href)} className="text-gray-600 hover:text-purple-400 text-sm transition-colors duration-200">{link.label}</button>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }} className="flex items-center gap-3">
            {socials.map(({ icon: Icon, href }, i) => (
              <motion.a key={i} href={href} whileHover={{ scale: 1.1, y: -2 }} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Icon size={14} className="text-gray-600 hover:text-purple-400 transition-colors" />
              </motion.a>
            ))}
          </motion.div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-gray-700 text-xs">&copy; {new Date().getFullYear()} . All rights reserved.</p>
          <p className="text-gray-800 text-xs">Made for the Vibe, in Crete, Greece</p>
        </div>
      </div>
    </footer>
  );
}
