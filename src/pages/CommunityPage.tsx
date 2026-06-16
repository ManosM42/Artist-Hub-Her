import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MessageCircle, ChevronLeft, Users, Loader2, Plus, Image, Mic, Trash2, Phone, Video } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import CreatePost from '@/components/CreatePost';
import CallManager from '@/components/CallManager';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url: string | null; };
}

interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: { id: string; username: string; full_name: string | null; avatar_url: string | null; };
  likes: { user_id: string }[];
  comments_count: number;
}

interface Conversation {
  profile: { id: string; username: string; avatar_url: string | null; full_name: string | null };
  lastMessage: string;
  lastTime: string;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}

const timeAgo = (date: string) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'τώρα';
  if (m < 60) return `${m}λ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ω`;
  return `${Math.floor(h / 24)}μ`;
};

// ── INBOX PANEL COMPONENT (INSTAGRAM STYLE) ────────────────────────
function InboxPanel({ onClose, initialChat, onStartCall }: { 
  onClose: () => void; 
  initialChat: any;
  onStartCall?: (userId: string, username: string, avatar: string | null, type: 'video' | 'audio') => void;
}) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Conversation['profile'][]>([]);

  const [sendingMedia, setSendingMedia] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchConversations().then((allConvs) => {
      if (initialChat) {
        const existing = allConvs.find(c => c.profile.id === initialChat.id);
        if (existing) {
          setActiveConv(existing);
        } else {
          const newConv: Conversation = {
            profile: initialChat,
            lastMessage: 'Ξεκινήστε μια νέα συνομιλία...',
            lastTime: new Date().toISOString(),
            unread: 0
          };
          setConversations(prev => [newConv, ...prev]);
          setActiveConv(newConv);
        }
      }
    });
  }, [initialChat, user]);

  useEffect(() => { if (activeConv) fetchMessages(activeConv.profile.id); }, [activeConv]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingSeconds(p => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  useEffect(() => {
    if (!user || !activeConv) return;
    const channel = supabase
      .channel(`chat-${activeConv.profile.id}-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new as Message;
        if (
          (msg.sender_id === activeConv.profile.id && msg.receiver_id === user.id) ||
          (msg.sender_id === user.id && msg.receiver_id === activeConv.profile.id)
        ) {
          setMessages(m => m.some(e => e.id === msg.id) ? m : [...m, msg]);
        }
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeConv]);

  const fetchConversations = async (): Promise<Conversation[]> => {
    if (!user) return [];
    const { data: allMsgs, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error || !allMsgs) return [];

    const contactIds = new Set<string>();
    allMsgs.forEach(m => {
      if (m.sender_id !== user.id) contactIds.add(m.sender_id);
      if (m.receiver_id !== user.id) contactIds.add(m.receiver_id);
    });
    if (contactIds.size === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, full_name')
      .in('id', Array.from(contactIds));

    const convs: Conversation[] = (profiles ?? []).map(p => {
      const userMsgs = allMsgs.filter(m => m.sender_id === p.id || m.receiver_id === p.id);
      const lastMsg = userMsgs[0];
      let textSummary = '';
      if (lastMsg?.content) textSummary = lastMsg.content;
      else if (lastMsg?.image_url) textSummary = '📷 Φωτογραφία';
      else if (lastMsg?.audio_url) textSummary = '🎵 Φωνητικό μήνυμα';
      return {
        profile: p,
        lastMessage: textSummary || 'Στείλτε ένα μήνυμα...',
        lastTime: lastMsg?.created_at || '',
        unread: userMsgs.filter(m => m.receiver_id === user.id && !m.read).length,
      };
    });

    const sorted = convs.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
    setConversations(sorted);
    return sorted;
  };

  const fetchMessages = async (otherId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    await supabase.from('messages').update({ read: true }).eq('sender_id', otherId).eq('receiver_id', user.id);
  };

  const handleSendText = async () => {
    if (!user || !activeConv || !text.trim()) return;
    const t = text.trim();
    setText('');
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeConv.profile.id,
      content: t,
    });
    if (!error) { fetchMessages(activeConv.profile.id); fetchConversations(); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview({ file, url });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendImage = async () => {
    if (!imagePreview || !user || !activeConv) return;
    setSendingMedia(true);
    try {
      const file = imagePreview.file;
      const fileExt = file.name.split('.').pop();
      const path = `chat_media/${user.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('messages').upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('messages').getPublicUrl(path);

      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: activeConv.profile.id,
        image_url: data.publicUrl,
      });

      setImagePreview(null);
      fetchMessages(activeConv.profile.id);
      fetchConversations();
    } catch (err) {
      console.error('Image send error:', err);
    } finally {
      setSendingMedia(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(250);
      setIsRecording(true);
    } catch (err) {
      alert('Παρακαλώ δώστε πρόσβαση στο μικρόφωνο.');
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (!mediaRecorderRef.current || !isRecording) return;
    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach(t => t.stop());
      if (!shouldSend || audioChunksRef.current.length === 0) return;

      setSendingMedia(true);
      try {
        const extension = recorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        const path = `chat_audio/${user?.id}_${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage.from('messages').upload(path, blob, {
          contentType: recorder.mimeType,
          cacheControl: '3600',
        });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('messages').getPublicUrl(path);

        await supabase.from('messages').insert({
          sender_id: user?.id,
          receiver_id: activeConv!.profile.id,
          audio_url: data.publicUrl,
        });

        fetchMessages(activeConv!.profile.id);
        fetchConversations();
      } catch (err) {
        console.error('Audio send error:', err);
      } finally {
        setSendingMedia(false);
      }
    };

    recorder.stop();
    setIsRecording(false);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from('profiles').select('id, username, avatar_url, full_name').ilike('username', `%${q}%`).neq('id', user?.id || '').limit(5);
    setSearchResults(data ?? []);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      className="fixed top-16 right-4 z-40 w-80 md:w-96 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
      style={{ height: 'calc(100vh - 88px)', background: 'linear-gradient(180deg, rgba(10,5,20,0.99), rgba(0,0,0,0.99))' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        {activeConv ? (
          <div className="flex items-center gap-2 flex-1">
            <button onClick={() => setActiveConv(null)} className="flex items-center gap-2 text-gray-300 hover:text-white transition">
              <ChevronLeft size={18} />
              <span className="text-white text-sm font-bold">@{activeConv.profile.username}</span>
            </button>
            <div className="flex items-center gap-1.5 ml-auto mr-2">
              <button
                onClick={() => onStartCall?.(activeConv.profile.id, activeConv.profile.username, activeConv.profile.avatar_url, 'audio')}
                className="text-gray-400 hover:text-green-400 transition p-1.5 rounded-full hover:bg-white/5">
                <Phone size={15} />
              </button>
              <button
                onClick={() => onStartCall?.(activeConv.profile.id, activeConv.profile.username, activeConv.profile.avatar_url, 'video')}
                className="text-gray-400 hover:text-purple-400 transition p-1.5 rounded-full hover:bg-white/5">
                <Video size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-purple-400" />
            <span className="text-white font-bold text-sm">Direct Messages</span>
          </div>
        )}
        <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X size={18} /></button>
      </div>

      {!activeConv ? (
        <>
          <div className="px-3 py-2 border-b border-white/5">
            <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Αναζήτηση χρήστη..."
              className="w-full px-3 py-1.5 bg-white/5 border border-white/8 rounded-xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            {searchResults.map(p => (
              <button key={p.id} onClick={() => { setSearch(''); setSearchResults([]); setActiveConv({ profile: p, lastMessage: '', lastTime: '', unread: 0 }); }}
                className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-left mt-1 text-xs text-purple-300">
                @{p.username}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
              <button key={conv.profile.id} onClick={() => setActiveConv(conv)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left border-b border-white/5">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                  {conv.profile.avatar_url
                    ? <img src={conv.profile.avatar_url} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{conv.profile.username[0].toUpperCase()}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-200 truncate">{conv.profile.full_name || conv.profile.username}</p>
                    <span className="text-[9px] text-gray-500">{timeAgo(conv.lastTime)}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.map(msg => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-2.5 rounded-2xl text-xs text-left ${isMine ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-white/10 text-gray-200 rounded-bl-sm'}`}>
                    {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                    {msg.image_url && <img src={msg.image_url} alt="Shared" className="rounded-xl max-h-48 object-cover mt-0.5 border border-white/5" />}
                    {msg.audio_url && <audio src={msg.audio_url} controls className="mt-0.5 max-w-full accent-purple-500" style={{ height: 32 }} />}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <AnimatePresence>
            {imagePreview && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-4 p-6">
                <p className="text-xs text-gray-400 font-bold">Preview φωτογραφίας</p>
                <img src={imagePreview.url} alt="Preview" className="max-h-64 max-w-full rounded-2xl object-contain border border-white/10" />
                <div className="flex gap-3">
                  <button onClick={() => setImagePreview(null)} className="px-5 py-2 rounded-full bg-white/10 text-xs text-gray-300 hover:bg-white/20 transition">Ακύρωση</button>
                  <button onClick={handleSendImage} disabled={sendingMedia} className="px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-xs text-white font-bold flex items-center gap-2 disabled:opacity-50 transition">
                    {sendingMedia ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Αποστολή
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-3 border-t border-white/8 bg-zinc-950 flex items-center gap-2 relative">
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />

            <AnimatePresence>
              {isRecording && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute inset-0 bg-zinc-950 px-4 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-red-400">Εγγραφή {formatTime(recordingSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => stopRecording(false)} className="text-gray-500 hover:text-red-500 transition p-1"><Trash2 size={16} /></button>
                    <button onClick={() => stopRecording(true)} className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                      {sendingMedia ? <Loader2 size={12} className="animate-spin" /> : <><Send size={12} /> Αποστολή</>}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button disabled={sendingMedia} onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-purple-400 p-1 transition disabled:opacity-30">
              {sendingMedia ? <Loader2 size={16} className="animate-spin text-purple-500" /> : <Image size={16} />}
            </button>

            <button onClick={startRecording} disabled={isRecording} className="text-gray-400 hover:text-purple-400 p-1 transition disabled:opacity-30">
              <Mic size={16} />
            </button>

            <input
              value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendText()}
              placeholder="Γράψτε μήνυμα..."
              className="flex-1 bg-white/5 border border-white/8 rounded-full px-4 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition"
            />

            <button onClick={handleSendText} disabled={!text.trim()} className="text-purple-400 hover:text-purple-300 disabled:opacity-20 font-bold text-xs px-1">Send</button>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ── COMMENT DRAWER ────────────────────────────────────────────────
function CommentsDrawer({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchComments(); }, [postId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase.from('comments').select(`id, content, created_at, user_id, profiles (username, avatar_url)`).eq('post_id', postId).order('created_at', { ascending: true });
    setComments((data as any) || []); setLoading(false);
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;
    const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content: newComment.trim() });
    if (!error) { setNewComment(''); fetchComments(); }
  };

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 z-50 h-[55vh] bg-zinc-950 border-t border-white/10 rounded-t-2xl flex flex-col max-w-lg mx-auto text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-xs font-bold text-gray-400">{comments.length} σχόλια</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div> : comments.map(c => (
          <div key={c.id} className="flex gap-2 text-left text-xs">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800">{c.profiles?.avatar_url && <img src={c.profiles.avatar_url} className="w-full h-full object-cover" />}</div>
            <div className="flex-1 bg-white/5 p-2 rounded-xl">
              <span className="font-bold text-purple-400">@{c.profiles?.username}</span>
              <p className="text-gray-200 mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-white/5 bg-zinc-900 flex gap-2">
        <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Γράψε σχόλιο..." className="flex-1 bg-white/5 rounded-full px-4 py-1.5 text-xs focus:outline-none" />
        <button onClick={handleAddComment} className="bg-purple-600 px-3 py-1 rounded-full text-xs font-bold">Send</button>
      </div>
    </motion.div>
  );
}

// ── MAIN COMMUNITY PAGE ───────────────────────────────────────────
export default function CommunityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const startCallRef = useRef<((userId: string, username: string, avatar: string | null, type: 'video' | 'audio') => void) | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [inboxOpen, setInboxOpen] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (location.state?.openChatWith) {
      setInboxOpen(true);
    }
    fetchPosts();
    if (user) fetchUnreadCount();
  }, [location.state, user]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase.from('posts').select(`id, content, image_url, created_at, user_id, profiles!user_id (id, username, full_name, avatar_url), likes (user_id), comments (id)`).order('created_at', { ascending: false });
    if (data) {
      setPosts(data.map((p: any) => ({ ...p, likes: p.likes || [], comments_count: p.comments?.length || 0 })));
    }
    setLoading(false);
  };

  const fetchUnreadCount = async () => {
    const { count } = await supabase.from('messages').select('id', { count: 'exact' }).eq('receiver_id', user?.id).eq('read', false);
    setUnreadCount(count || 0);
  };

  const handleLikeToggle = async (post: Post) => {
    if (!user) return;
    const hasLiked = post.likes.some(l => l.user_id === user.id);
    if (hasLiked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', post.id);
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: p.likes.filter(l => l.user_id !== user.id) } : p));
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: post.id });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: [...p.likes, { user_id: user.id }] } : p));
    }
  };

  return (
    <div className="bg-black h-screen w-full overflow-hidden flex flex-col text-white relative">
      <Navbar />

      {/* HEADER */}
      <div className="fixed top-16 left-0 right-0 z-30 bg-gradient-to-b from-black via-black/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Users size={20} className="text-purple-400" /><h1 className="text-xl font-black">Community</h1></div>
        <div className="flex items-center gap-2">
          {user && (
            <>
              <button onClick={() => setCreateOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"><Plus size={12} /> Create</button>
              <button onClick={() => setInboxOpen(!inboxOpen)} className="relative bg-white/10 p-2 rounded-full">
                <MessageCircle size={16} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-purple-500 text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{unreadCount}</span>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* FEED */}
      <div className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory pt-16">
        {loading ? (
          <div className="h-full flex items-center justify-center"><Loader2 size={32} className="animate-spin text-purple-500" /></div>
        ) : (
          posts.map(post => {
            const isLiked = post.likes.some(l => l.user_id === user?.id);
            return (
              <div key={post.id} className="w-full h-full snap-start snap-always relative flex items-center justify-center bg-zinc-950 border-b border-white/5">
                <div className="w-full h-full max-w-lg relative flex flex-col justify-center bg-black">
                  {post.image_url ? <img src={post.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-950/20 to-zinc-900 flex items-center p-8 text-center"><p className="text-md text-gray-200 mx-auto">{post.content}</p></div>}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 flex flex-col gap-2 z-10 text-left">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/user/${post.user_id}`)} className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800">{post.profiles?.avatar_url && <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />}</button>
                      <div>
                        <button onClick={() => navigate(`/user/${post.user_id}`)} className="font-bold text-sm hover:underline block">{post.profiles?.full_name || post.profiles?.username}</button>
                        <span className="text-[10px] text-gray-400">@{post.profiles?.username} · {timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                    {post.image_url && post.content && <p className="text-xs text-gray-300 mt-1">{post.content}</p>}
                  </div>
                  <div className="absolute right-4 bottom-24 flex flex-col items-center gap-4 z-20">
                    <div className="flex flex-col items-center"><button onClick={() => handleLikeToggle(post)} className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm ${isLiked ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-zinc-900 border-white/10'}`}>❤️</button><span className="text-[10px] font-bold text-gray-400 mt-1">{post.likes.length}</span></div>
                    <div className="flex flex-col items-center"><button onClick={() => setActiveCommentsPostId(post.id)} className="w-10 h-10 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center text-sm">💬</button><span className="text-[10px] font-bold text-gray-400 mt-1">{post.comments_count}</span></div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>{createOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"><motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md"><CreatePost onCreated={() => { setCreateOpen(false); fetchPosts(); }} /></motion.div></div>}</AnimatePresence>
      <AnimatePresence>{activeCommentsPostId && <><div className="fixed inset-0 bg-black/50 z-40" onClick={() => setActiveCommentsPostId(null)} /><CommentsDrawer postId={activeCommentsPostId} onClose={() => { setActiveCommentsPostId(null); fetchPosts(); }} /></>}</AnimatePresence>
      <AnimatePresence>{inboxOpen && <InboxPanel onClose={() => { setInboxOpen(false); if(user) fetchUnreadCount(); }} initialChat={location.state?.openChatWith || null} onStartCall={(userId, username, avatar, type) => startCallRef.current?.(userId, username, avatar, type)} />}</AnimatePresence>
      
      {/* Ο CallManager τοποθετείται global στην κορυφή του δέντρου */}
      <CallManager onCallRequest={(fn) => { startCallRef.current = fn; }} />
    </div>
  );
}