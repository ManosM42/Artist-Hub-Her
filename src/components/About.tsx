import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { MapPin, Headphones, Users, Calendar } from 'lucide-react';

const features = [
  { icon: MapPin, title: 'Born in Heraklion', text: 'Rooted in the heart of Crete, we live and breathe the culture of this island.' },
  { icon: Headphones, title: 'Authentic Sound', text: 'We curate only the most impactful Greek rap and urban artists for our stages.' },
  { icon: Users, title: 'Community First', text: 'Built by fans, for fans — a movement that unites generations of music lovers.' },
  { icon: Calendar, title: 'Year-Round Events', text: 'From intimate club nights to massive open-air festivals across Crete.' },
];

export default function About() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="about" className="relative py-28 bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-1/3 h-px opacity-20" style={{ background: 'linear-gradient(90deg, transparent, #7c3aed, transparent)' }} />
        <div className="absolute top-1/2 right-0 w-1/3 h-px opacity-20" style={{ background: 'linear-gradient(90deg, transparent, #ec4899, transparent)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <span className="inline-block text-xs font-bold tracking-[0.3em] text-purple-400 uppercase mb-4">Our Story</span>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              Where Greek Rap{' '}
              <span className="text-transparent bg-clip-text block" style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>Meets the Med</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              Heraklion is Alive brings the biggest Greek rap artists to Crete, transforming the island's nights into unforgettable cultural experiences. We are more than an events brand — we are a movement.
            </p>
            <p className="text-gray-500 leading-relaxed mb-8">
              From underground club nights in the old city to massive open-air concerts under the Mediterranean sky, we create moments that last a lifetime.
            </p>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }} className="flex items-center gap-6">
              <div className="flex -space-x-3">
                {['https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=80', 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=80', 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=80'].map((src, i) => (
                  <img key={i} src={src} alt="fan" className="w-10 h-10 rounded-full border-2 border-black object-cover" />
                ))}
              </div>
              <div>
                <p className="text-white font-bold text-sm">50,000+ fans</p>
                <p className="text-gray-500 text-xs">trust Heraklion is Alive</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div ref={ref} className="grid grid-cols-2 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -4 }} className="group p-5 rounded-2xl transition-all duration-300" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.2))', border: '1px solid rgba(124,58,237,0.3)' }}>
                    <Icon size={18} className="text-purple-400" />
                  </div>
                  <h3 className="text-white font-bold text-sm mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-xs leading-relaxed">{feature.text}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
