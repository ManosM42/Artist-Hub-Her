import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface CreatePostProps {
  onCreated: () => void;
}

export default function CreatePost({ onCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user || (!content.trim() && !imageFile)) return;
    setLoading(true);

    let image_url: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(path, imageFile);
      if (!uploadError) {
        const { data } = supabase.storage.from('posts').getPublicUrl(path);
        image_url = data.publicUrl;
      }
    }

    await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim() || null,
      image_url,
    });

    setContent('');
    setImageFile(null);
    setImagePreview(null);
    setLoading(false);
    onCreated();
  };

  if (!user) return null;

  return (
    <div
      className="rounded-2xl border border-white/8 p-4"
      style={{ background: 'linear-gradient(180deg, rgba(15,10,30,0.98), rgba(5,5,10,0.98))' }}
    >
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Τι σκέφτεσαι;"
        rows={3}
        className="w-full bg-transparent text-white placeholder:text-gray-600 text-sm leading-relaxed resize-none focus:outline-none"
      />

      {/* Image preview */}
      {imagePreview && (
        <div className="relative mt-2 rounded-xl overflow-hidden">
          <img src={imagePreview} alt="" className="w-full max-h-64 object-cover rounded-xl" />
          <button
            onClick={() => { setImageFile(null); setImagePreview(null); }}
            className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/8">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-gray-500 hover:text-purple-400 text-sm transition"
        >
          <Image size={18} /> Φωτογραφία
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

        <motion.button
          onClick={handleSubmit}
          disabled={loading || (!content.trim() && !imageFile)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-full transition"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Δημοσίευση
        </motion.button>
      </div>
    </div>
  );
}