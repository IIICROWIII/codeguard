'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  starter_code: string;
}

interface Feedback {
  score: number;
  errors: string[];
  vulnerabilities: { type: string; line: number; severity: string }[];
  suggestions: string[];
}

const severityColor: Record<string, string> = {
  high: 'text-red-400 border-red-800 bg-red-900/20',
  medium: 'text-yellow-400 border-yellow-800 bg-yellow-900/20',
  low: 'text-blue-400 border-blue-800 bg-blue-900/20',
};

export default function ChallengePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!id) return;
    api.get(`/challenges/${id}`)
      .then(({ data }) => {
        setChallenge(data.challenge);
        setCode(data.challenge.starter_code);
      })
      .finally(() => setFetching(false));
  }, [id]);

  async function handleSubmit() {
    if (!challenge) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const { data } = await api.post('/submissions', {
        challenge_id: challenge.id,
        code,
      });
      setFeedback(data.submission.feedback);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-green-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400">Challenge not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/challenges')}
          className="text-green-400 hover:text-green-300 transition-colors"
        >
          ← Back
        </button>
        <h1 className="font-semibold">{challenge.title}</h1>
        <span className="text-xs text-gray-400 border border-gray-700 px-2 py-1 rounded-full">
          {challenge.difficulty}
        </span>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: description + feedback */}
        <div className="w-1/3 border-r border-gray-800 p-6 overflow-y-auto">
          <h2 className="font-semibold text-lg mb-3">Description</h2>
          <p className="text-gray-400 text-sm mb-6">{challenge.description}</p>

          {feedback && (
            <div className="space-y-4">
              {/* Score */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Score</p>
                <p className={`text-5xl font-bold ${
                  feedback.score >= 80 ? 'text-green-400' :
                  feedback.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {feedback.score}
                </p>
                <p className="text-gray-500 text-xs mt-1">out of 100</p>
              </div>

              {/* Vulnerabilities */}
              {feedback.vulnerabilities.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-red-400">⚠️ Vulnerabilities</h3>
                  {feedback.vulnerabilities.map((v, i) => (
                    <div key={i} className={`border rounded-lg px-3 py-2 mb-2 text-sm ${severityColor[v.severity]}`}>
                      <span className="font-medium">{v.type}</span>
                      {v.line && <span className="ml-2 text-xs opacity-70">line {v.line}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {feedback.suggestions.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-blue-400">💡 Suggestions</h3>
                  {feedback.suggestions.map((s, i) => (
                    <p key={i} className="text-gray-400 text-sm mb-1">• {s}</p>
                  ))}
                </div>
              )}

              {/* Errors */}
              {feedback.errors.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-yellow-400">🔧 Errors</h3>
                  {feedback.errors.map((e, i) => (
                    <p key={i} className="text-gray-400 text-sm mb-1">• {e}</p>
                  ))}
                </div>
              )}

              {feedback.score === 100 && (
                <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-semibold">🎉 Perfect Score!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Monaco Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <MonacoEditor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>

          <div className="border-t border-gray-800 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setCode(challenge.starter_code)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Reset Code
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Analyzing...' : 'Submit Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}