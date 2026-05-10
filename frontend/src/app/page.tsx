'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/challenges');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-green-400 animate-pulse text-xl">🛡️ Loading CodeGuard...</p>
    </div>
  );
}