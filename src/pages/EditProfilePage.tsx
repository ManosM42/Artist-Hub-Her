import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export default function EditProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setUsername(data.username ?? '');
        setFullName(data.full_name ?? '');
        setBio(data.bio ?? '');
        setAvatarUrl(data.avatar_url ?? '');
        setAvatarPreview(data.avatar_url ?? '');
      }
    });
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      let newAvatarUrl = avatarUrl;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        newAvatarUrl = urlData.publicUrl;
      }

      const { error: updateError } = await supabase.from('profiles').update({
        username: username.trim(),
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url: newAvatarUrl,
      }).eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => navigate(`/profile/${username.trim()}`), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Σφάλμα. Δοκίμασε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black min-h-screen">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-16">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6">
          <ArrowLeft size={18} /> Πίσω
        </button>

        <h1 className="text-3xl font-black text-white mb-8">Επεξεργασία Profile</h1>

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-800 border-2 border-purple-500">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white">
                  {username[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition">
              <Camera size={14} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {[
            { label: 'Username', value: username, setter: setUsername, placeholder: 'username' },
            { label: 'Ονοματεπώνυμο', value: fullName, setter: setFullName, placeholder: 'Το όνομά σου' },
          ].map(field => (
            <div key={field.label}>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{field.label}</label>
              <input
                value={field.value}
                onChange={e => field.setter(e.target.value)}
                placeholder={field.placeholder}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Πες μας κάτι για σένα..."
              rows={3}
              maxLength={160}
              className="mt-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition resize-none"
            />
            <p className="text-right text-xs text-gray-600 mt-1">{bio.length}/160</p>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
        {success && <p className="text-green-400 text-sm mt-4 text-center">✓ Αποθηκεύτηκε!</p>}

        <motion.button
          onClick={handleSave}
          disabled={loading}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="mt-6 w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 transition">
          {loading ? <><Loader2 size={18} className="animate-spin" /> Αποθήκευση...</> : <><Save size={18} /> Αποθήκευση</>}
        </motion.button>

      </div>
    </div>
  );
}