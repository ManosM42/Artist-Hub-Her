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
  sender_sdp?: any;
  receiver_sdp?: any;
  sender_candidates?: any[];
  receiver_candidates?: any[];
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

  // Σύνδεση με το CommunityPage
  useEffect(() => {
    onCallRequest(startCall);
  }, [user]);

  // Realtime Signaling Listener
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

        // 2. Updates κατάστασης και WebRTC Handshake
        if (payload.eventType === 'UPDATE' && call && data.id === call.id) {
          if (data.status === 'rejected' || data.status === 'ended') {
            cleanUpCall();
            return;
          } 
          
          // Ο Sender λαμβάνει το Answer του Receiver
          if (data.status === 'accepted' && data.sender_id === user.id && data.receiver_sdp && !pcRef.current?.remoteDescription) {
            await pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.receiver_sdp));
          }
          
          // Ο Receiver λαμβάνει το Offer του Sender
          if (data.status === 'accepted' && data.receiver_id === user.id && data.sender_sdp && !pcRef.current?.remoteDescription) {
            handleIncomingOffer(data);
          }

          // Ανταλλαγή ICE Candidates (Sender πλευρά)
          if (data.status === 'accepted' && data.sender_id === user.id && data.receiver_candidates?.length) {
            data.receiver_candidates.forEach(async (cand) => {
              try { if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(new RTCIceCandidate(cand)); } catch(e){}
            });
          }

          // Ανταλλαγή ICE Candidates (Receiver πλευρά)
          if (data.status === 'accepted' && data.receiver_id === user.id && data.sender_candidates?.length) {
            data.sender_candidates.forEach(async (cand) => {
              try { if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(new RTCIceCandidate(cand)); } catch(e){}
            });
          }

          setCall(prev => prev ? { ...prev, status: data.status } : null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, call]);

  const setupLocalStream = async (type: 'video' | 'audio') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error("Media access error:", err);
      return null;
    }
  };

  const createPeerConnection = (stream: MediaStream, callId: string, isSender: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19002' },
        { urls: 'stun:stun1.l.google.com:19002' }
      ]
    });

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Μόλις το WebRTC βρει ένα ICE Candidate, το σπρώχνει στη Supabase
    pc.onicecandidate = (event) => {
  if (!event.candidate) return;
  
  setTimeout(async () => {
    const { data: currentCall } = await supabase.from('calls').select('*').eq('id', callId).single();
    if (!currentCall) return;

    if (isSender) {
      const list = currentCall.sender_candidates || [];
      // Σιγουρευόμαστε ότι δεν ξαναστέλνουμε το ίδιο
      if (!list.some((c: any) => c.candidate === event.candidate.candidate)) {
        await supabase.from('calls').update({ sender_candidates: [...list, event.candidate.toJSON()] }).eq('id', callId);
      }
    } else {
      const list = currentCall.receiver_candidates || [];
      if (!list.some((c: any) => c.candidate === event.candidate.candidate)) {
        await supabase.from('calls').update({ receiver_candidates: [...list, event.candidate.toJSON()] }).eq('id', callId);
      }
    }
  }, 500); // 0.5 δευτερόλεπτο καθυστέρηση για σιγουριά
};

    pcRef.current = pc;
    return pc;
  };

  // 1. Ο Sender ξεκινάει την κλήση
  const startCall = async (receiverId: string, username: string, avatar: string | null, type: 'video' | 'audio') => {
    if (!user) return;
    
    const stream = await setupLocalStream(type);
    if (!stream) return;

    // Δημιουργούμε πρώτα το record για να έχουμε call ID
    const { data, error } = await supabase.from('calls').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      type,
      status: 'ringing'
    }).select().single();

    if (error || !data) return;

    const pc = createPeerConnection(stream, data.id, true);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Ανεβάζουμε το SDP Offer
    await supabase.from('calls').update({ sender_sdp: offer }).eq('id', data.id);
    setCall({ ...data, profile: { username, avatar_url: avatar } });
  };

  // 2. Ο Receiver πατάει Αποδοχή
  const acceptCall = async () => {
    if (!call) return;
    const stream = await setupLocalStream(call.type);
    if (!stream) return;

    await supabase.from('calls').update({ status: 'accepted' }).eq('id', call.id);
  };

  // 3. Ο Receiver επεξεργάζεται το Offer και απαντάει με Answer
  const handleIncomingOffer = async (callData: CallState) => {
    if (!localStreamRef.current) return;
    
    const pc = createPeerConnection(localStreamRef.current, callData.id, false);
    await pc.setRemoteDescription(new RTCSessionDescription(callData.sender_sdp));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await supabase.from('calls').update({ receiver_sdp: answer }).eq('id', callData.id);
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
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = isMuted; setIsMuted(!isMuted); }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current && call?.type === 'video') {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) { track.enabled = isCamOff; setIsCamOff(!isCamOff); }
    }
  };

  if (!call) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md text-white">
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
                  <button onClick={acceptCall} className="p-4 bg-green-500 hover:bg-green-600 rounded-full transition text-white"><Phone size={24} /></button>
                  <button onClick={rejectCall} className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition text-white"><PhoneOff size={24} /></button>
                </>
              ) : (
                <button onClick={endCall} className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition text-white"><PhoneOff size={24} /></button>
              )}
            </div>
          </div>
        )}

        {call.status === 'accepted' && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950">
            {call.type === 'video' ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-purple-600/20 flex items-center justify-center border border-purple-500"><Phone size={48} className="text-purple-400" /></div>
                <p className="text-md font-medium text-gray-300">Φωνητική Κλήση...</p>
              </div>
            )}

            {call.type === 'video' && (
              <motion.div drag dragConstraints={{ left: 10, right: window.innerWidth - 150, top: 10, bottom: window.innerHeight - 220 }} className="absolute top-6 right-6 w-28 h-40 md:w-36 md:h-52 rounded-2xl overflow-hidden border border-white/25 shadow-2xl bg-zinc-900 z-20 cursor-grab active:cursor-grabbing">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              </motion.div>
            )}

            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-zinc-900/80 border border-white/10 backdrop-blur-xl rounded-full flex items-center gap-6 z-30">
              {call.type === 'video' && (
                <button onClick={toggleCam} className={`p-3 rounded-full transition ${isCamOff ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>{isCamOff ? <VideoOff size={18} /> : <Video size={18} />}</button>
              )}
              <button onClick={toggleMute} className={`p-3 rounded-full transition ${isMuted ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>{isMuted ? <MicOff size={18} /> : <Mic size={18} />}</button>
              <button onClick={endCall} className="p-3 bg-red-600 hover:bg-red-500 rounded-full transition text-white"><PhoneOff size={18} /></button>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}