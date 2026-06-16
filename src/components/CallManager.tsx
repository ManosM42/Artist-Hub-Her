import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface CallState {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: 'video' | 'audio';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  profile?: { username: string; avatar_url: string | null };
}

export default function CallManager({ onCallRequest }: { onCallRequest: (fn: any) => void }) {
  const { user } = useAuth();
  const [call, setCall] = useState<CallState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Σύνδεση της συνάρτησης εκκίνησης κλήσης με το CommunityPage
  useEffect(() => {
    onCallRequest(startCall);
  }, [user]);

  // Realtime Ακρόαση για εισερχόμενες κλήσεις ή αλλαγές κατάστασης
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, async (payload) => {
        const data = payload.new as CallState;
        
        // 1. Εισερχόμενη Κλήση
        if (payload.eventType === 'INSERT' && data.receiver_id === user.id && data.status === 'ringing') {
          const { data: prof } = await supabase.from('profiles').select('username, avatar_url').eq('id', data.sender_id).single();
          setCall({ ...data, profile: prof || undefined });
        }

        // 2. Ενημερώσεις κατάστασης (Αποδοχή, Απόρριψη, Τερματισμός)
        if (payload.eventType === 'UPDATE' && call && data.id === call.id) {
          if (data.status === 'rejected' || data.status === 'ended') {
            cleanUpCall();
          } else if (data.status === 'accepted' && data.sender_id === user.id) {
            // Ο αποδέκτης αποδέχτηκε την κλήση, ξεκινάμε το WebRTC Handshake
            handleReceiverAccepted(payload.new);
          }
          setCall(prev => prev ? { ...prev, status: data.status } : null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, call]);

  // Εκκίνηση εξερχόμενης κλήσης
  const startCall = async (receiverId: string, username: string, avatar: string | null, type: 'video' | 'audio') => {
    if (!user) return;
    
    const { data, error } = await supabase.from('calls').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      type,
      status: 'ringing'
    }).select().single();

    if (!error && data) {
      setCall({ ...data, profile: { username, avatar_url: avatar } });
      setupLocalStream(type);
    }
  };

  const setupLocalStream = async (type: 'video' | 'audio') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Media access error:", err);
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19002' }]
    });

    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    pcRef.current = pc;
    return pc;
  };

  const acceptCall = async () => {
    if (!call) return;
    await setupLocalStream(call.type);
    const pc = createPeerConnection();

    // WebRTC signaling logic...
    await supabase.from('calls').update({ status: 'accepted' }).eq('id', call.id);
  };

  const handleReceiverAccepted = async (callData: any) => {
    // Σύνδεση Peer-to-peer ροών
    const pc = createPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await supabase.from('calls').update({ sender_id: user?.id }).eq('id', callData.id);
  };

  const rejectCall = async () => {
    if (!call) return;
    await supabase.from('calls').update({ status: 'rejected' }).eq('id', call.id);
    cleanUpCall();
  };

  const endCall = async () => {
    if (!call) return;
    await supabase.from('calls').update({ status: 'ended' }).eq('id', call.id);
    cleanUpCall();
  };

  const cleanUpCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    setCall(null);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current && call?.type === 'video') {
      localStreamRef.current.getVideoTracks()[0].enabled = isCamOff;
      setIsCamOff(!isCamOff);
    }
  };

  if (!call) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md text-white">
        
        {/* Ringing / Outgoing Screen */}
        {call.status === 'ringing' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500 bg-zinc-800">
              {call.profile?.avatar_url ? <img src={call.profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-2xl">{call.profile?.username[0].toUpperCase()}</div>}
            </div>
            <h2 className="text-xl font-bold">@{call.profile?.username}</h2>
            <p className="text-sm text-gray-400 animate-pulse">{call.sender_id === user?.id ? 'Κλήση...' : 'Εισερχόμενη κλήση...'}</p>
            
            <div className="flex gap-6 mt-8">
              {call.receiver_id === user?.id ? (
                <>
                  <button onClick={acceptCall} className="p-4 bg-green-500 hover:bg-green-600 rounded-full transition text-white shadow-lg shadow-green-500/20"><Phone size={24} /></button>
                  <button onClick={rejectCall} className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition text-white shadow-lg shadow-red-500/20"><PhoneOff size={24} /></button>
                </>
              ) : (
                <button onClick={endCall} className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition text-white shadow-lg shadow-red-500/20"><PhoneOff size={24} /></button>
              )}
            </div>
          </div>
        )}

        {/* ── INTERACTIVE FACETIME SCREEN ── */}
        {call.status === 'accepted' && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950">
            
            {/* Remote User Video (Full Screen) */}
            {call.type === 'video' ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-purple-600/20 flex items-center justify-center border border-purple-500"><Phone size={48} className="text-purple-400 animate-bounce" /></div>
                <p className="text-md font-medium text-gray-300">Φωνητική Κλήση σε εξέλιξη...</p>
              </div>
            )}

            {/* Local Camera Preview (Apple FaceTime Style Floating Picture-in-Picture) */}
            {call.type === 'video' && (
              <motion.div drag dragConstraints={{ left: 10, right: window.innerWidth - 130, top: 10, bottom: window.innerHeight - 190 }} className="absolute top-6 right-6 w-28 h-40 md:w-36 md:h-52 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-zinc-900 z-20 cursor-grab active:cursor-grabbing">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              </motion.div>
            )}

            {/* Control Bar overlays on bottom */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-zinc-900/80 border border-white/10 backdrop-blur-xl rounded-full flex items-center gap-6 z-30">
              {call.type === 'video' && (
                <button onClick={toggleCam} className={`p-3 rounded-full transition ${isCamOff ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>{isCamOff ? <VideoOff size={18} /> : <Video size={18} />}</button>
              )}
              <button onClick={toggleMute} className={`p-3 rounded-full transition ${isMuted ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>{isMuted ? <MicOff size={18} /> : <Mic size={18} />}</button>
              <button onClick={endCall} className="p-3 bg-red-600 hover:bg-red-500 rounded-full transition text-white shadow-lg shadow-red-600/30"><PhoneOff size={18} /></button>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}