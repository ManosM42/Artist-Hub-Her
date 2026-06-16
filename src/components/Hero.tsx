import { motion } from 'framer-motion';
import ParticleBackground from './ParticleBackground';

export default function Hero() {
  const scrollToEvents = () => {
    const el = document.querySelector('#events');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      <ParticleBackground />
      <div className="absolute inset-0 bg-gradient-radial from-purple-950/30 via-black/60 to-black pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-[0.08] blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mb-6">
          <span className="inline-block text-xs font-bold tracking-[0.3em] text-purple-400 uppercase border border-purple-800/60 rounded-full px-5 py-2 bg-purple-950/30 backdrop-blur-sm">
          </span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }} className="text-5xl sm:text-7xl md:text-8xl font-black leading-none tracking-tight mb-6">
          <span className="block text-white">Heraklion</span>
          <span className="block relative">
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)' }}>Nightlife</span>
          </span>
          <span className="block text-white">
            is{' '}
            <span className="relative inline-block text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #ec4899 0%, #a855f7 100%)' }}>
              Alive
              <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="absolute -inset-2 blur-2xl -z-10 rounded-lg" style={{ background: 'linear-gradient(90deg, #ec489940, #a855f740)' }} />
            </span>
          </span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.8 }} className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Greece's hottest rap artists and festivals land on Crete. Unforgettable nights, electric energy, and the pulse of the underground — all in Heraklion.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1 }} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <motion.button onClick={scrollToEvents} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="relative group px-8 py-4 rounded-full text-white font-bold text-base tracking-wide overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)' }}>
            <motion.span animate={{ x: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
            <span className="relative z-10">Explore Events</span>
            <div className="absolute inset-0 blur-xl group-hover:opacity-80 opacity-0 transition-opacity duration-300 rounded-full" style={{ background: 'linear-gradient(135deg, #7c3aed80, #ec489980)' }} />
          </motion.button>
          <motion.button onClick={() => document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' })} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="px-8 py-4 rounded-full text-gray-300 font-bold text-base tracking-wide border border-white/10 hover:border-purple-500/50 backdrop-blur-sm transition-all duration-300 hover:text-white">
            Learn More
          </motion.button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }} className="mt-16 flex items-center justify-center gap-8 text-center">
          {[{ value: '7+', label: 'Artists' }, { value: '100+', label: 'Events' }, { value: '50K+', label: 'Fans' }].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-white">{stat.value}</span>
              <span className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <span className="text-xs text-gray-500 uppercase tracking-widest">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-purple-500 to-transparent" />
      </motion.div>
    </section>
  );
}
