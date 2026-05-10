'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'security';
}

const difficultyColor = {
  beginner: 'bg-green-900 text-green-400 border-green-700',
  intermediate: 'bg-yellow-900 text-yellow-400 border-yellow-700',
  security: 'bg-red-900 text-red-400 border-red-700',
};

export default function ChallengesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filter, setFilter] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    api.get('/challenges')
      .then(({ data }) => setChallenges(data.challenges))
      .finally(() => setFetching(false));
  }, []);

  const filtered = filter
    ? challenges.filter((c) => c.difficulty === filter)
    : challenges;

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-green-400 animate-pulse">Loading challenges...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-green-400">🛡️ CodeGuard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user?.email}</span>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold mb-2">Challenges</h2>
        <p className="text-gray-400 mb-8">Pick a challenge and write secure code</p>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {['', 'beginner', 'intermediate', 'security'].map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                filter === d
                  ? 'bg-green-500 text-black border-green-500'
                  : 'border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {d || 'All'}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/challenges/${c.id}`)}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 cursor-pointer hover:border-green-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg">{c.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full border ${difficultyColor[c.difficulty]}`}>
                  {c.difficulty}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}