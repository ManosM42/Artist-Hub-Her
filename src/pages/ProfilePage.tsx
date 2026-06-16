import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Grid, Settings, UserMinus, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getBadge } from '@/lib/badges';
import Navbar from '@/components/Navbar';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  concerts_attended: number;
}

interface Stats {
  posts: number;
  followers: number;
  following: number;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ posts: 0, followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetchProfile();
  }, [username, user]);

  const fetchProfile = async () => {
    setLoading(true);

    // ΕΛΕΓΧΟΣ: Είναι το "username" UUID (δηλαδή ID χρήστη) ή κανονικό κείμενο;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username || '');
    
    // Επιλέγουμε τη σωστή στήλη για το φιλτράρισμα
    const targetColumn = isUUID ? 'id' : 'username';

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq(targetColumn, username)
      .maybeSingle(); // Χρησιμοποιούμε maybeSingle για να αποφύγουμε το σφάλμα 406 αν δεν βρεθεί τίποτα

    if (error || !profileData) { 
      console.error("Profile fetch error:", error);
      setProfile(null);
      setLoading(false); 
      return; 
    }
    
    setProfile(profileData);
    setIsOwner(user?.id === profileData.id);

    // Stats
    const [postsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', profileData.id),
      supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', profileData.id),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', profileData.id),
    ]);

    setStats({
      posts: postsRes.count ?? 0,
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    });

    // Is following?
    if (user && user.id !== profileData.id) {
      const { data: followData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', profileData.id)
        .maybeSingle();
      setIsFollowing(!!followData);
    }

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user || !profile) return;
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', user.id).eq('following_id', profile.id);
      setIsFollowing(false);
      setStats(s => ({ ...s, followers: s.followers - 1 }));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id });
      setIsFollowing(true);
      setStats(s => ({ ...s, followers: s.followers + 1 }));
    }
  };

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Το profile δεν βρέθηκε.</p>
    </div>
  );

  const badge = getBadge(profile.concerts_attended);

  return (
    <div className="bg-black min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        {/* Back button */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6">
          <ArrowLeft size={18} /> Πίσω
        </button>

        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden border border-white/5"
          style={{ background: 'linear-gradient(180deg, rgba(15,10,30,0.98), rgba(0,0,0,0.98))' }}>

          {/* Banner */}
          <div className="h-32 w-full" style={{
            background: `linear-gradient(135deg, ${badge.color}40, transparent)`
          }} />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-black overflow-hidden bg-gray-800">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white">
                      {profile.username ? profile.username[0].toUpperCase() : '?'}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {isOwner ? (
                  <button onClick={() => navigate('/profile/edit')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white border border-white/20 hover:border-white/40 transition">
                    <Settings size={15} /> Επεξεργασία
                  </button>
                ) : user ? (
                  <button onClick={handleFollow}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
                      isFollowing
                        ? 'bg-white/10 text-gray-300 hover:bg-red-900/30 hover:text-red-400 border border-white/20'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}>
                    {isFollowing ? <><UserMinus size={15} /> Unfollow</> : <><UserPlus size={15} /> Follow</>}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Name & badge */}
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-white">
                {profile.full_name || profile.username}
              </h1>
              <span className="text-lg" title={badge.name}>{badge.emoji}</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">@{profile.username}</p>

            {/* Badge pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
              style={{ background: `${badge.color}20`, color: badge.color, border: `1px solid ${badge.color}40` }}>
              {badge.emoji} {badge.name} · {profile.concerts_attended} συναυλίες
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex gap-6 border-t border-white/5 pt-4">
              {[
                { label: 'Posts', value: stats.posts },
                { label: 'Followers', value: stats.followers },
                { label: 'Following', value: stats.following },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-xl font-black text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Posts grid placeholder */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Grid size={16} className="text-gray-400" />
            <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Posts</span>
          </div>
          {stats.posts === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="text-4xl mb-3">📸</p>
              <p>Δεν υπάρχουν posts ακόμα.</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Posts coming soon...</p>
          )}
        </div>

      </div>
    </div>
  );
}