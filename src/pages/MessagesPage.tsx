import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Send, Image, Mic, Square, ChevronLeft, Search, Loader2, User } from 'lucide-react';
import Navbar from '@/components/Navbar';

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

export default function MessagesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loadingLeft, setLoadingLeft] = useState(true);
  
  // Φωνητικά & Φωτογραφίες Loaders
  const [isRecording, setIsRecording] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Έλεγχος αν ήρθαμε από το Public Profile
  useEffect(() => {
    fetchConversations().then((allConvs) => {
      if (location.state?.startChatWith) {
        const targetProfile = location.state.startChatWith;
        const existing = allConvs.find((c) => c.profile.id === targetProfile.id);
        if (existing) {
          setActiveConv(existing);
        } else {
          setActiveConv({
            profile: targetProfile,
            lastMessage: '',
            lastTime: new Date().toISOString(),
            unread: 0
          });
        }
      }
    });
  }, [location.state]);

  useEffect(() => {
    if (activeConv) fetchMessages(activeConv.profile.id);
  }, [activeConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime Messages Subscription
  useEffect(() => {
    if (!user || !activeConv) return;
    const channel = supabase
      .channel(`room-${activeConv.profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, payload => {
        const msg = payload.new as Message;
        if (msg.sender_id === activeConv.profile.id) {
          setMessages(m => [...m, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeConv]);

  const fetchConversations = async (): Promise<Conversation[]> => {
    if (!user) return [];
    setLoadingLeft(true);

    const { data: sent } = await supabase.from('messages').select('receiver_id, content, created_at, read').eq('sender_id', user.id).order('created_at', { ascending: false });
    const { data: received } = await supabase.from('messages').select('sender_id, content, created_at, read').eq('receiver_id', user.id).order('created_at', { ascending: false });

    const contactIds = new Set<string>();
    sent?.forEach(m => contactIds.add(m.receiver_id));
    received?.forEach(m => contactIds.add(m.sender_id));

    if (contactIds.size === 0) { setLoadingLeft(false); return []; }

    const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url, full_name').in('id', Array.from(contactIds));

    const convs: Conversation[] = (profiles ?? []).map(p => {
      const allMsgs = [
        ...(sent?.filter(m => m.receiver_id === p.id) ?? []),
        ...(received?.filter(m => m.sender_id === p.id) ?? []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        profile: p,
        lastMessage: allMsgs[0]?.content ? allMsgs[0].content : allMsgs[0]?.image_url ? '📷 Φωτογραφία' : allMsgs[0]?.audio_url ? '🎵 Φωνητικό μήνυμα' : '',
        lastTime: allMsgs[0]?.created_at ?? '',
        unread: received?.filter(m => m.sender_id === p.id && !m.read).length ?? 0,
      };
    });

    const sorted = convs.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
    setConversations(sorted);
    setLoadingLeft(false);
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
    const textToSend = text.trim();
    setText('');

    const { data } = await supabase
      .from('messages')
      .insert({ sender_id: user.id, receiver_id: activeConv.profile.id, content: textToSend })
      .select().single();

    if (data) setMessages(m => [...m, data]);
    fetchConversations();
  };

  // Αποστολή Φωτογραφίας
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConv) return;

    setSendingMedia(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `chat_media/${user.id}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('messages').upload(filePath, file);

    if (!uploadError) {
      const { data } = supabase.storage.from('messages').getPublicUrl(filePath);
      const { data: msgData } = await supabase
        .from('messages')
        .insert({ sender_id: user.id, receiver_id: activeConv.profile.id, image_url: data.publicUrl })
        .select().single();

      if (msgData) setMessages(m => [...m, msgData]);
      fetchConversations();
    }
    setSendingMedia(false);
  };

  // Διαχείριση Φωνητικών Μηνυμάτων (Audio)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (!user || !activeConv) return;

        setSendingMedia(true);
        const filePath = `chat_audio/${user.id}_${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage.from('messages').upload(filePath, audioBlob);

        if (!uploadError) {
          const { data } = supabase.storage.from('messages').getPublicUrl(filePath);
          const { data: msgData } = await supabase
            .from('messages')
            .insert({ sender_id: user.id, receiver_id: activeConv.profile.id, audio_url: data.publicUrl })
            .select().single();

          if (msgData) setMessages(m => [...m, msgData]);
          fetchConversations();
        }
        setSendingMedia(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Δεν δόθηκε πρόσβαση στο μικρόφωνο:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-black h-screen w-full text-white font-sans flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 pt-16 flex h-full">
        {/* ΑΡΙΣΤΕΡΗ ΜΠΑΡΑ: Λίστα Συνομιλιών (Κρύβεται σε mobile αν υπάρχει active chat) */}
        <div className={`w-full md:w-80 border-r border-white/10 flex flex-col bg-zinc-950 ${activeConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="font-black text-lg">Direct</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingLeft ? (
              <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div>
            ) : conversations.length === 0 ? (
              <p className="text-gray-600 text-sm p-4 text-center">Καμία συνομιλία ακόμα.</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.profile.id} onClick={() => setActiveConv(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 transition text-left ${activeConv?.profile.id === conv.profile.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                    {conv.profile.avatar_url ? <img src={conv.profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold">{conv.profile.username[0].toUpperCase()}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{conv.profile.full_name || conv.profile.username}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ΔΕΞΙ PANEL: Το ενεργό Chat Window */}
        <div className={`flex-1 flex flex-col bg-black ${!activeConv ? 'hidden md:flex items-center justify-center text-gray-500' : 'flex'}`}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 bg-zinc-950 border-b border-white/10 flex items-center gap-3">
                <button onClick={() => setActiveConv(null)} className="md:hidden text-gray-400 hover:text-white"><ChevronLeft size={22} /></button>
                <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800">
                  {activeConv.profile.avatar_url ? <img src={activeConv.profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-sm">{activeConv.profile.username[0].toUpperCase()}</div>}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{activeConv.profile.full_name || activeConv.profile.username}</p>
                  <p className="text-[11px] text-purple-400">@{activeConv.profile.username}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${isMine ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-zinc-900 border border-white/5 text-gray-200 rounded-bl-sm'} text-left`}>
                        {msg.content && <p>{msg.content}</p>}
                        {msg.image_url && <img src={msg.image_url} alt="Shared" className="rounded-xl max-h-60 object-cover mt-1" />}
                        {msg.audio_url && <audio src={msg.audio_url} controls className="mt-1 max-w-full accent-purple-500" />}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 border-t border-white/10 bg-zinc-950 flex items-center gap-2">
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                
                {/* Κουμπί Φωτογραφίας */}
                <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-purple-400 p-1.5 transition">
                  <Image size={20} />
                </button>

                {/* Κουμπί Ήχου (Mic) */}
                <button onClick={isRecording ? stopRecording : startRecording} className={`p-1.5 rounded-full transition ${isRecording ? 'text-red-500 animate-pulse bg-red-500/10' : 'text-gray-400 hover:text-purple-400'}`}>
                  {isRecording ? <Square size={18} /> : <Mic size={20} />}
                </button>

                {/* Text Input */}
                <input
                  value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder={sendingMedia ? "Αποστολή αρχείου..." : "Στείλτε μήνυμα..."}
                  disabled={sendingMedia}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-full px-4 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition"
                />

                <button onClick={handleSendText} disabled={!text.trim()} className="text-purple-400 hover:text-purple-300 disabled:opacity-30 p-1.5 font-bold text-sm">
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-4xl mb-2">💬</p>
              <p>Επιλέξτε μια συνομιλία για να ξεκινήσετε.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}