'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  totp_enabled: boolean;
  created_at: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/login');
      else if (user.role !== 'admin') router.push('/challenges');
    }
  }, [user, loading]);

  useEffect(() => {
    api.get('/dashboard/admin/users')
      .then(({ data }) => setUsers(data.users))
      .finally(() => setFetching(false));
  }, []);

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.patch(`/dashboard/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u))
      );
      setMsg(`✅ Role updated to ${newRole}`);
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('❌ Failed to update role');
    }
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-green-400 animate-pulse">Loading admin panel...</p>
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
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold mb-2">Admin Panel</h2>
        <p className="text-gray-400 mb-8">Manage users and permissions</p>

        {msg && (
          <p className="mb-4 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-4 py-2">
            {msg}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{users.length}</p>
            <p className="text-gray-400 text-sm mt-1">Total Users</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-purple-400">
              {users.filter((u) => u.role === 'admin').length}
            </p>
            <p className="text-gray-400 text-sm mt-1">Admins</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-blue-400">
              {users.filter((u) => u.totp_enabled).length}
            </p>
            <p className="text-gray-400 text-sm mt-1">2FA Enabled</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-6 py-4">Email</th>
                <th className="text-left px-6 py-4">Role</th>
                <th className="text-left px-6 py-4">2FA</th>
                <th className="text-left px-6 py-4">Joined</th>
                <th className="text-left px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs border ${
                      u.role === 'admin'
                        ? 'bg-purple-900 text-purple-400 border-purple-700'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={u.totp_enabled ? 'text-green-400' : 'text-gray-600'}>
                      {u.totp_enabled ? '✅ On' : '❌ Off'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1 rounded-lg transition-colors"
                      >
                        Make {u.role === 'admin' ? 'User' : 'Admin'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}