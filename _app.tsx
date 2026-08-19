import { useState, useEffect } from 'react';
import type { AppProps } from 'next/app';
import { Navbar } from '@/components/layout/Navbar';
import '../styles/globals.css'; // Assuming you have a global CSS file

function MyApp({ Component, pageProps }: AppProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const checkSession = () => {
    try {
      const session = localStorage.getItem('xenova_session');
      if (session) {
        setIsLoggedIn(true);
        setUser(JSON.parse(session));
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (err) {
      console.error("Auth sync error", err);
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  useEffect(() => {
    checkSession();
    // Watch for login/logout events across tabs or from this tab
    window.addEventListener('storage', checkSession);
    return () => window.removeEventListener('storage', checkSession);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar isLoggedIn={isLoggedIn} user={user} />
      <Component {...pageProps} isLoggedIn={isLoggedIn} user={user} refreshSession={checkSession} />
    </div>
  );
}

export default MyApp;