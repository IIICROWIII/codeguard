'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.push('/login');
      return;
    }

    localStorage.setItem('accessToken', token);

    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        router.push('/challenges');
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
        router.push('/login');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-green-400 animate-pulse text-xl">🛡️ Signing you in...</p>
    </div>
  );
}