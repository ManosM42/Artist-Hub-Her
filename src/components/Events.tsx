import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { artists } from '@/data/artists';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 60, scale: 0.92 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function Events() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="events" className="relative py-28 bg-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/5 to-black pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-purple-600 to-transparent opacity-40" />

      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7 }} className="text-center mb-16">
          <span className="inline-block text-xs font-bold tracking-[0.3em] text-purple-400 uppercase mb-4">The Lineup</span>
          <h2 className="text-4xl sm:text-6xl font-black text-white mb-4 leading-tight">
            Artists &{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>Events</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">Greece's most iconic voices, performing live on the island of Crete</p>
        </motion.div>

        <motion.div ref={ref} variants={container} initial="hidden" animate={inView ? 'show' : 'hidden'} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {artists.map((artist) => (
            <ArtistCard key={artist.name} artist={artist} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function ArtistCard({ artist }: { artist: typeof artists[0] }) {
  const Icon = artist.icon;
  const navigate = useNavigate();

  return (
    <motion.div
      variants={cardVariant}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="relative h-52 overflow-hidden">
        <img src={artist.image} alt={artist.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-50 group-hover:brightness-[0.6]" />
        <div className={`absolute inset-0 bg-gradient-to-t ${artist.gradient} opacity-70`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${artist.tagColor} text-white`}>{artist.tag}</span>
        </div>

        <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover:scale-110" style={{ background: `${artist.accent}30`, border: `1px solid ${artist.accent}50` }}>
          <Icon size={14} style={{ color: artist.accent }} />
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-black text-xl tracking-wide leading-tight">{artist.name}</h3>
          <p className="text-gray-300 text-xs font-medium mt-0.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: artist.accent }} />
            {artist.label}
          </p>
        </div>
      </div>

      <div className="p-4">
        <p className="text-gray-500 text-sm leading-relaxed">{artist.description}</p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(`/artist/${artist.slug}`)}
          className="mt-4 w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 border"
          style={{ color: artist.accent, borderColor: `${artist.accent}40`, background: `${artist.accent}10` }}
        >
          Get Tickets
        </motion.button>
      </div>

      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: `0 0 30px ${artist.accent}20, inset 0 0 30px ${artist.accent}05` }} />
    </motion.div>
  );
}
