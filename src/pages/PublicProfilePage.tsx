import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Grid, MessageSquare, UserMinus, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });

  useEffect(() => {
    if (userId) {
      if (userId === user?.id) {
        navigate('/profile/edit'); // Αν πατήσει κατά λάθος το δικό του ID
        return;
      }
      fetchProfileData();
    }
  }, [userId, user]);

  const fetchProfileData = async () => {
    setLoading(true);
    
    // Get profile
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!prof) { setLoading(false); return; }
    setProfile(prof);

    // Get posts
    const { data: userPosts } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setPosts(userPosts ?? []);

    // Get Counts SAFE
    const [postsCount, followersCount, followingCount] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('follows').select('follower_id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('follower_id', { count: 'exact' }).eq('follower_id', userId),
    ]);

    setStats({
      posts: postsCount.count ?? 0,
      followers: followersCount.count ?? 0,
      following: followingCount.count ?? 0,
    });

    // Check follow state
    if (user) {
      const { data: follow } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();
      setIsFollowing(!!follow);
    }
    setLoading(false);
  };

  const handleFollowToggle = async () => {
    if (!user || !profile) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id);
      setIsFollowing(false);
      setStats(s => ({ ...s, followers: s.followers - 1 }));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id });
      setIsFollowing(true);
      setStats(s => ({ ...s, followers: s.followers + 1 }));
    }
  };

  // ΔΙΟΡΘΩΣΗ: Στέλνει το state στο CommunityPage με το σωστό key (openChatWith)
  const handleSendMessage = () => {
    if (!profile) return;
    navigate('/community', { state: { openChatWith: profile } });
  };

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );

  if (!profile) return (
    <div className="bg-black min-h-screen flex items-center justify-center text-gray-400">Το προφίλ δεν βρέθηκε.</div>
  );

  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6 text-sm">
          <ArrowLeft size={16} /> Πίσω
        </button>

        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-purple-500/30 flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold">{profile.username?.[0].toUpperCase()}</div>
                )}
              </div>
              <div className="text-left">
                <h1 className="text-xl font-black">{profile.full_name || profile.username}</h1>
                <p className="text-gray-500 text-sm">@{profile.username}</p>
              </div>
            </div>

            {user && (
              <div className="flex gap-2">
                <button
                  onClick={handleFollowToggle}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    isFollowing ? 'bg-white/10 text-gray-300 hover:bg-red-950/40 hover:text-red-400 border border-white/10' : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isFollowing ? <><UserMinus size={14} /> Unfollow</> : <><UserPlus size={14} /> Follow</>}
                </button>
                
                {/* ΔΙΟΡΘΩΣΗ: Συνδέθηκε η συνάρτηση handleSendMessage στο onClick */}
                <button 
                  onClick={handleSendMessage} 
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-full text-xs font-bold transition"
                >
                  <MessageSquare size={14} /> Μήνυμα
                </button>
              </div>
            )}
          </div>

          {profile.bio && <p className="text-gray-300 text-sm mt-4 bg-white/5 p-3 rounded-xl border border-white/5 text-left">{profile.bio}</p>}

          <div className="flex gap-6 border-t border-white/5 mt-6 pt-4 text-left">
            {[
              { label: 'Posts', value: stats.posts },
              { label: 'Followers', value: stats.followers },
              { label: 'Following', value: stats.following },
            ].map(s => (
              <div key={s.label}>
                <p className="text-lg font-black text-white">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
            <Grid size={16} className="text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Δημοσιεύσεις Χρήστη</span>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">Ο χρήστης δεν έχει ανεβάσει posts ακόμα.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {posts.map(p => (
                <div key={p.id} className="aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-white/5 relative group flex items-center justify-center">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <p className="p-3 text-center text-xs text-gray-400 italic line-clamp-3">{p.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}