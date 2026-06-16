import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getBadge } from '@/lib/badges';

export interface PostData {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    concerts_attended: number;
  };
  likes: { user_id: string }[] | null;   // ← null αντί για []
  comments: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: { username: string; avatar_url: string | null };
  }[] | null;
}

interface PostCardProps {
  post: PostData;
  onDelete?: (id: string) => void;
}

export default function PostCard({ post, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [liked, setLiked] = useState((post.likes ?? []).some(l => l.user_id === user?.id));
  const [likeCount, setLikeCount] = useState((post.likes ?? []).length);
  const [comments, setComments] = useState(post.comments ?? []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const badge = getBadge(post.profiles.concerts_attended);
  const isOwner = user?.id === post.user_id;

  const handleLike = async () => {
    if (!user) return;
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', post.id);
      setLiked(false);
      setLikeCount(c => c - 1);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: post.id });
      setLiked(true);
      setLikeCount(c => c + 1);
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    setSubmittingComment(true);
    const { data } = await supabase
      .from('comments')
      .insert({ user_id: user.id, post_id: post.id, content: commentText.trim() })
      .select('id, content, created_at, user_id, profiles(username, avatar_url)')
      .single();
    if (data) {
      setComments(c => [...c, data as any]);
      setCommentText('');
    }
    setSubmittingComment(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    await supabase.from('posts').delete().eq('id', post.id);
    onDelete?.(post.id);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'μόλις τώρα';
    if (m < 60) return `${m}λ`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}ω`;
    return `${Math.floor(h / 24)}μ`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-white/8"
      style={{ background: 'linear-gradient(180deg, rgba(15,10,30,0.98), rgba(5,5,10,0.98))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(`/profile/${post.profiles.username}`)}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border border-white/10 flex-shrink-0">
            {post.profiles.avatar_url ? (
              <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {post.profiles.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-white text-sm font-bold group-hover:text-purple-400 transition-colors">
                {post.profiles.full_name || post.profiles.username}
              </span>
              <span className="text-sm" title={badge.name}>{badge.emoji}</span>
            </div>
            <span className="text-gray-500 text-xs">@{post.profiles.username} · {timeAgo(post.created_at)}</span>
          </div>
        </button>

        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white rounded-full hover:bg-white/5 transition"
            >
              <MoreHorizontal size={18} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute right-0 mt-1 w-36 bg-black/95 border border-white/10 rounded-xl overflow-hidden shadow-xl z-10"
                >
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-950/20 transition"
                  >
                    <Trash2 size={14} /> Διαγραφή
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Image */}
      {post.image_url && (
        <div className="w-full aspect-square overflow-hidden bg-gray-900">
          <img src={post.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-5 border-t border-white/5">
        {/* Like */}
        <button onClick={handleLike} className="flex items-center gap-1.5 group">
          <motion.div whileTap={{ scale: 1.3 }}>
            <Heart
              size={20}
              className={`transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-gray-500 group-hover:text-red-400'}`}
            />
          </motion.div>
          <span className={`text-sm font-medium ${liked ? 'text-red-500' : 'text-gray-500'}`}>
            {likeCount}
          </span>
        </button>

        {/* Comment */}
        <button
          onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-1.5 group"
        >
          <MessageCircle size={20} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
          <span className="text-sm font-medium text-gray-500">{comments.length}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex items-center gap-1.5 group">
          <Share2 size={20} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
          {copied && <span className="text-xs text-blue-400">Αντιγράφηκε!</span>}
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5 overflow-hidden"
          >
            {/* Comment list */}
            <div className="px-4 pt-3 space-y-3 max-h-60 overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-2">Δεν υπάρχουν σχόλια ακόμα.</p>
              )}
              {(comments ?? []).map(c => (

                <div key={c.id} className="flex gap-2">
                  <button
                    onClick={() => navigate(`/profile/${c.profiles.username}`)}
                    className="w-7 h-7 rounded-full overflow-hidden bg-gray-800 flex-shrink-0"
                  >
                    {c.profiles.avatar_url ? (
                      <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                        {c.profiles.username[0].toUpperCase()}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 bg-white/5 rounded-xl px-3 py-2">
                    <span className="text-purple-400 text-xs font-bold">@{c.profiles.username} </span>
                    <span className="text-gray-300 text-sm">{c.content}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input */}
            {user && (
              <div className="px-4 py-3 flex gap-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment()}
                  placeholder="Γράψε σχόλιο..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition"
                />
                <button
                  onClick={handleComment}
                  disabled={submittingComment || !commentText.trim()}
                  className="w-9 h-9 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-xl flex items-center justify-center transition"
                >
                  <Send size={15} className="text-white" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}