'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Stats {
  total_submissions: number;
  challenges_attempted: number;
  avg_score: number;
  perfect_scores: number;
}

interface RecentSubmission {
  id: string;
  challenge_title: string;
  score: number;
  submitted_at: string;
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentSubmission[]>([]);
  const [fetching, setFetching] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFAMsg, setTwoFAMsg] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/recent'),
    ]).then(([statsRes, recentRes]) => {
      setStats(statsRes.data.stats);
      setRecent(recentRes.data.recent);
    }).finally(() => setFetching(false));
  }, []);

  async function handleSetup2FA() {
    const { data } = await api.post('/auth/2fa/setup');
    setQrCode(data.qrCode);
    setShow2FA(true);
  }

  async function handleVerify2FA() {
    try {
      await api.post('/auth/2fa/verify', { token: totpToken });
      setTwoFAMsg('✅ 2FA enabled successfully!');
      setShow2FA(false);
    } catch {
      setTwoFAMsg('❌ Invalid code, try again');
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-green-400 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-green-400">🛡️ CodeGuard</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/challenges')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Challenges
          </button>
          <button
            onClick={handleSignOut}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
        <p className="text-gray-400 mb-8">Welcome back, {user?.email}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Submissions', value: stats?.total_submissions ?? 0, color: 'text-green-400' },
            { label: 'Challenges', value: stats?.challenges_attempted ?? 0, color: 'text-blue-400' },
            { label: 'Avg Score', value: stats?.avg_score ?? 0, color: 'text-yellow-400' },
            { label: 'Perfect', value: stats?.perfect_scores ?? 0, color: 'text-purple-400' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Submissions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">Recent Submissions</h3>
          {recent.length === 0 ? (
            <p className="text-gray-500 text-sm">No submissions yet. Start a challenge!</p>
          ) : (
            <div className="space-y-3">
              {recent.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <p className="text-sm">{s.challenge_title}</p>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold ${
                      s.score >= 80 ? 'text-green-400' :
                      s.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {s.score}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(s.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2FA Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-2">Two-Factor Authentication</h3>
          <p className="text-gray-400 text-sm mb-4">
            Add an extra layer of security to your account
          </p>

          {twoFAMsg && (
            <p className="text-sm mb-4 text-green-400">{twoFAMsg}</p>
          )}

          {!show2FA ? (
            <button
              onClick={handleSetup2FA}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Setup 2FA
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Scan this QR code with your authenticator app:
              </p>
              {qrCode && <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-lg" />}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={handleVerify2FA}
                  className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}