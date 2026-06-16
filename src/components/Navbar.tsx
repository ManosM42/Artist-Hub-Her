import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap, LogIn, LogOut, User, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { signInWithGoogle, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';


const links = [
  { label: 'Home', href: '#home' },
  { label: 'Events', href: '#events' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  // Scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch username from profiles table safely
  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setUsername(null);
      return;
    }

    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (isMounted) {
          setUsername(data?.username ?? null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleNav = (href: string) => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/' + href);
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleProfileNav = () => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    // Safe guard fallback: if username hasn't loaded or doesn't exist, route to id or a safe route
    if (username) {
      navigate(`/profile/${username}`);
    } else if (user) {
      navigate(`/profile/${user.id}`);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUserMenuOpen(false);
      setMobileOpen(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-xl border-b border-purple-900/40 shadow-lg shadow-purple-950/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
          <div className="relative">
            <Zap size={22} className="text-purple-400 group-hover:text-pink-400 transition-colors duration-300" fill="currentColor" />
            <div className="absolute inset-0 blur-md bg-purple-500 opacity-60 group-hover:opacity-90 transition-opacity" />
          </div>
          <span className="text-white font-black text-lg tracking-tight leading-none">
            Artist Hub<span className="text-purple-400 group-hover:text-pink-400 transition-colors duration-300"> Heraklion</span>
          </span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNav(link.href)}
              className="relative text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200 py-1 group"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-purple-500 group-hover:w-full transition-all duration-300" />
            </button>
          ))}

          {/* Community link */}
          <button
            onClick={() => { navigate('/community'); setUserMenuOpen(false); }}
            className="relative text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200 py-1 group flex items-center gap-1.5"
          >
            <Users size={14} />
            Community
            <span className="absolute bottom-0 left-0 w-0 h-px bg-purple-500 group-hover:w-full transition-all duration-300" />
          </button>

          {/* Auth */}
          {!loading && (
            user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 bg-purple-900/40 hover:bg-purple-800/50 border border-purple-700/50 hover:border-purple-500/70 text-white text-sm font-medium px-4 py-2 rounded-full transition-all duration-200"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="avatar"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-purple-300" />
                  )}
                  <span className="max-w-[100px] truncate">
                    {user.user_metadata?.full_name?.split(' ')[0] ?? user.email}
                  </span>
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 bg-black/90 backdrop-blur-xl border border-purple-900/50 rounded-xl shadow-xl shadow-purple-950/30 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-purple-900/30">
                        <p className="text-xs text-gray-500">Συνδεδεμένος ως</p>
                        <p className="text-sm text-white truncate">{user.email}</p>
                      </div>

                      {/* Profile link */}
                      <button
                        onClick={handleProfileNav}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:text-purple-400 hover:bg-purple-950/20 transition-colors duration-200 border-b border-purple-900/20"
                      >
                        <User size={15} />
                        Το Profile μου
                      </button>

                      {/* Community link */}
                      <button
                        onClick={() => { navigate('/community'); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:text-purple-400 hover:bg-purple-950/20 transition-colors duration-200 border-b border-purple-900/20"
                      >
                        <Users size={15} />
                        Community
                      </button>

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:text-red-400 hover:bg-red-950/20 transition-colors duration-200"
                      >
                        <LogOut size={15} />
                        Αποσύνδεση
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200 shadow-md shadow-purple-900/40 hover:shadow-purple-700/40"
              >
                <LogIn size={15} />
                Σύνδεση
              </button>
            )
          )}
        </div>

        {/* Mobile: hamburger + auth */}
        <div className="md:hidden flex items-center gap-3">
          {!loading && !user && (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200"
            >
              <LogIn size={13} />
              Σύνδεση
            </button>
          )}
          {!loading && user && (
            <button
              onClick={handleProfileNav}
              className="flex items-center gap-1.5"
            >
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="avatar" className="w-7 h-7 rounded-full object-cover border border-purple-500/50" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-purple-900/60 border border-purple-500/50 flex items-center justify-center">
                  <User size={14} className="text-purple-300" />
                </div>
              )}
            </button>
          )}
          <button className="text-white p-1" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-black/90 backdrop-blur-xl border-t border-purple-900/30 overflow-hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {links.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNav(link.href)}
                  className="text-gray-300 hover:text-purple-400 py-3 text-left text-base font-medium transition-colors duration-200 border-b border-white/5"
                >
                  {link.label}
                </button>
              ))}

              <button
                onClick={() => { navigate('/community'); setMobileOpen(false); }}
                className="flex items-center gap-2 text-gray-300 hover:text-purple-400 py-3 text-left text-base font-medium transition-colors duration-200 border-b border-white/5"
              >
                <Users size={16} /> Community
              </button>

              {user && (
                <>
                  <button
                    onClick={handleProfileNav}
                    className="flex items-center gap-2 text-gray-300 hover:text-purple-400 py-3 text-left text-base font-medium transition-colors duration-200 border-b border-white/5"
                  >
                    <User size={16} /> Το Profile μου
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-gray-300 hover:text-red-400 py-3 text-left text-base font-medium transition-colors duration-200"
                  >
                    <LogOut size={16} /> Αποσύνδεση
                  </button>
                </>
              )}

              {user && (
                <div className="pt-3 border-t border-purple-900/30 mt-1">
                  <p className="text-xs text-gray-500 mb-1">Συνδεδεμένος ως</p>
                  <p className="text-sm text-purple-300 truncate">{user.email}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}