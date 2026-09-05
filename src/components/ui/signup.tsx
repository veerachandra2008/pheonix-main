import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: '', tag: '', bio: '' });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formData.name.trim();
    const cleanTag = formData.tag.trim();

    if (!cleanName || !cleanTag) return alert("Name and Tag are required!");

    // Sign up directly with Supabase
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('users').insert([{
        name: cleanName,
        tag: cleanTag,
        bio: formData.bio || '',
        role: 'PLAYER'
      }]);
      if (error) {
        return alert(error.message || "Failed to create user");
      }
      alert("Sign up successful! Now please login.");
      router.push('/login');
    } catch (err: any) {
      alert(err.message || "Sign up error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0D13] p-4">
      <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-md">
        <h1 className="text-3xl font-black mb-6 uppercase">Join XENOVA</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Full Name</label>
            <input 
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-blue-500 outline-none" 
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Gamer Tag (Unique)</label>
            <input 
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-blue-500 outline-none" 
              onChange={e => setFormData({...formData, tag: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Bio</label>
            <textarea 
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-blue-500 outline-none" 
              onChange={e => setFormData({...formData, bio: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 py-4 rounded-xl font-black hover:bg-blue-500 transition-all">
            SIGN UP
          </button>
        </form>
        <p className="mt-6 text-center text-gray-500">
          Already have an account? <Link href="/login" className="text-blue-400">Login</Link>
        </p>
      </div>
    </div>
  );
}
