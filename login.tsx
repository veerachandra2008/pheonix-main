import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage({ refreshSession }: any) {
  const [tag, setTag] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Redirect if already logged in
    if (localStorage.getItem('xenova_session')) {
      window.location.href = '/';
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    let users = [];
    try {
      const raw = localStorage.getItem('xenova_users');
      users = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(users)) users = [];
    } catch (err) {
      users = [];
    }

    const loginTag = tag.trim().toLowerCase();
    const foundUser = users.find((u: any) => u.tag.toLowerCase() === loginTag);

    if (foundUser) {
      // Start session
      localStorage.setItem('xenova_session', JSON.stringify(foundUser));
      
      // Update state and redirect
      try {
        if (refreshSession) refreshSession();
      } catch (e) {}
      
      // Use a hard redirect to ensure the dashboard/navbar detects the new session
      window.location.href = '/';
    } else {
      alert("No account found with this tag. Please Sign Up first!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0D13] p-4">
      <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-md">
        <h1 className="text-3xl font-black mb-6 uppercase">Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Enter Gamer Tag</label>
            <input 
              placeholder="e.g. ProPlayer123"
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-blue-500 outline-none" 
              value={tag}
              onChange={e => setTag(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black hover:bg-blue-400 hover:text-white transition-all">
            ENTER DASHBOARD
          </button>
        </form>
        <p className="mt-6 text-center text-gray-500">
          Don't have an account? <Link href="/signup" className="text-blue-400">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}