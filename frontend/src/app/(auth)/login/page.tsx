'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

const GOOGLE_URL =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL ||
  'http://localhost:4000/api/auth/google';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const user = await register(email, password);

        setUser(user);

        router.push('/challenges');
      } else {
        const result = await login(
          email,
          password,
          needsTotp ? totpCode : undefined
        );

        if ('twoFactorRequired' in result) {
          setNeedsTotp(true);
        } else {
          setUser(result);

          router.push('/challenges');
        }
      }
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err
      ) {
        const errorObj = err as any;

        setError(
          errorObj.response?.data?.error || 'Something went wrong'
        );
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-800">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400">
            🛡️ CodeGuard
          </h1>

          <p className="text-gray-400 mt-2">
            Practice secure coding
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-6">
          <button
            onClick={() => {
              setIsRegister(false);
              setError('');
              setNeedsTotp(false);
            }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              !isRegister
                ? 'bg-green-500 text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Login
          </button>

          <button
            onClick={() => {
              setIsRegister(true);
              setError('');
              setNeedsTotp(false);
            }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              isRegister
                ? 'bg-green-500 text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Google Login */}
        <a
          href={GOOGLE_URL}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-semibold py-2 rounded-lg transition-colors mb-4"
        >
          🔵 Continue with Google
        </a>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-700" />

          <span className="text-gray-500 text-xs">
            OR
          </span>

          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Email */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
            />
          </div>

          {/* 2FA */}
          {needsTotp && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                2FA Code
              </label>

              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading
              ? 'Loading...'
              : isRegister
              ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}