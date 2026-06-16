import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface CallState {
  callId: string;
  remoteUser: { id: string; username: string; avatar_url: string | null };
  type: 'video' | 'audio';
  direction: 'incoming' | 'outgoing';
  status: 'ringing' | 'active' | 'ended';
}

interface Props {
  // Χρησιμοποιείται από InboxPanel για να ξεκινήσει κλήση
  onCallRequest?: (fn: (userId: string, username: string, avatar: string | null, type: 'video' | 'audio') => void) => void;
}

export default function CallManager({ onCallRequest }: Props) {
  const { user } = useAuth();
  const [call, setCall] = useState<CallState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callIdRef = useRef<string | null>(null);

  // Expose startCall function στον parent
  useEffect(() => {
    if (onCallRequest) {
      onCallRequest(startCall);
    }
  }, [onCallRequest]);

  // Άκου για εισερχόμενες κλήσεις
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `receiver_id=eq.${user.id}`,
      }, async (payload) => {
        const newCall = payload.new as any;
        if (newCall.status !== 'pending') return;

        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', newCall.caller_id)
          .single();

        if (callerProfile) {
          setCall({
            callId: newCall.id,
            remoteUser: callerProfile,
            type: newCall.type,
            direction: 'incoming',
            status: 'ringing',
          });
          callIdRef.current = newCall.id;
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const createPeerConnection = useCallback((callId: string, isCallee: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Στείλε ICE candidates στη βάση
    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        await supabase.from('ice_candidates').insert({
          call_id: callId,
          sender_id: user?.id,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    // Λάβε remote stream
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    // Άκου για νέα ICE candidates από τον άλλο
    supabase
      .channel(`ice-${callId}-${isCallee ? 'callee' : 'caller'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ice_candidates',
        filter: `call_id=eq.${callId}`,
      }, async (payload) => {
        const { sender_id, candidate } = payload.new as any;
        if (sender_id !== user?.id && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      })
      .subscribe();

    return pc;
  }, [user]);

  const getLocalStream = async (type: 'video' | 'audio') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  // ── ΞΕΚΙΝΑ ΚΛΗΣΗ (caller) ──
  const startCall = async (
    userId: string,
    username: string,
    avatar: string | null,
    type: 'video' | 'audio' = 'video'
  ) => {
    if (!user) return;

    try {
      const stream = await getLocalStream(type);

      // Δημιούργησε εγγραφή στη βάση
      const { data: callData, error } = await supabase
        .from('calls')
        .insert({ caller_id: user.id, receiver_id: userId, type, status: 'pending' })
        .select()
        .single();

      if (error || !callData) throw error;

      callIdRef.current = callData.id;
      setCall({
        callId: callData.id,
        remoteUser: { id: userId, username, avatar_url: avatar },
        type,
        direction: 'outgoing',
        status: 'ringing',
      });

      const pc = createPeerConnection(callData.id, false);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from('calls').update({ offer: offer }).eq('id', callData.id);

      // Άκου για answer
      supabase
        .channel(`call-answer-${callData.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${callData.id}`,
        }, async (payload) => {
          const updated = payload.new as any;
          if (updated.answer && pc.currentRemoteDescription === null) {
            await pc.setRemoteDescription(new RTCSessionDescription(updated.answer));
            setCall(prev => prev ? { ...prev, status: 'active' } : null);
          }
          if (updated.status === 'rejected' || updated.status === 'ended') {
            endCall(false);
          }
        })
        .subscribe();

    } catch (err) {
      console.error('startCall error:', err);
      alert('Δεν ήταν δυνατή η πρόσβαση στην κάμερα/μικρόφωνο.');
    }
  };

  // ── ΑΠΟΔΟΧΗ ΚΛΗΣΗΣ (callee) ──
  const acceptCall = async () => {
    if (!call || !user) return;

    try {
      const stream = await getLocalStream(call.type);

      const { data: callData } = await supabase
        .from('calls')
        .select('offer')
        .eq('id', call.callId)
        .single();

      if (!callData?.offer) return;

      const pc = createPeerConnection(call.callId, true);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from('calls')
        .update({ answer, status: 'active' })
        .eq('id', call.callId);

      setCall(prev => prev ? { ...prev, status: 'active' } : null);

    } catch (err) {
      console.error('acceptCall error:', err);
    }
  };

  // ── ΤΕΡΜΑΤΙΣΜΟΣ ΚΛΗΣΗΣ ──
  const endCall = useCallback(async (updateDb = true) => {
    if (updateDb && callIdRef.current) {
      await supabase.from('calls').update({ status: 'ended' }).eq('id', callIdRef.current);
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    callIdRef.current = null;
    setCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const rejectCall = async () => {
    if (call) {
      await supabase.from('calls').update({ status: 'rejected' }).eq('id', call.callId);
    }
    setCall(null);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (!call) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
      >
        {/* Remote Video (background) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover ${call.type === 'audio' ? 'hidden' : ''}`}
        />

        {/* Overlay για audio call ή όταν δεν έχει συνδεθεί ακόμα */}
        {(call.type === 'audio' || call.status === 'ringing') && (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-500 shadow-lg shadow-purple-500/30">
              {call.remoteUser.avatar_url
                ? <img src={call.remoteUser.avatar_url} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl font-bold text-white">
                    {call.remoteUser.username[0].toUpperCase()}
                  </div>}
            </div>
            <h2 className="text-white text-xl font-bold">@{call.remoteUser.username}</h2>
            <p className="text-gray-400 text-sm">
              {call.status === 'ringing'
                ? (call.direction === 'outgoing' ? 'Κλήση...' : `Εισερχόμενη ${call.type === 'video' ? 'βιντεοκλήση' : 'κλήση'}`)
                : 'Σε κλήση'}
            </p>
          </div>
        )}

        {/* Local Video (picture-in-picture) */}
        {call.type === 'video' && call.status === 'active' && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-4 w-32 h-44 object-cover rounded-2xl border-2 border-white/20 shadow-xl"
          />
        )}

        {/* Controls */}
        <div className="absolute bottom-12 flex items-center gap-6">
          {/* Incoming ringing */}
          {call.status === 'ringing' && call.direction === 'incoming' && (
            <>
              <button onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition">
                <PhoneOff size={24} className="text-white" />
              </button>
              <button onClick={acceptCall}
                className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center shadow-lg transition">
                <Phone size={24} className="text-white" />
              </button>
            </>
          )}

          {/* Outgoing ringing */}
          {call.status === 'ringing' && call.direction === 'outgoing' && (
            <button onClick={() => endCall()}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition">
              <PhoneOff size={24} className="text-white" />
            </button>
          )}

          {/* Active call controls */}
          {call.status === 'active' && (
            <>
              <button onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${isMuted ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}>
                {isMuted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
              </button>

              {call.type === 'video' && (
                <button onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition ${isVideoOff ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}>
                  {isVideoOff ? <VideoOff size={20} className="text-white" /> : <Video size={20} className="text-white" />}
                </button>
              )}

              <button onClick={() => endCall()}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition">
                <PhoneOff size={24} className="text-white" />
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}