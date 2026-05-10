import api from './api';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export async function register(email: string, password: string) {
  const { data } = await api.post('/auth/register', { email, password });
  localStorage.setItem('accessToken', data.accessToken);
  return data.user as User;
}

export async function login(email: string, password: string, totp_code?: string) {
  const { data } = await api.post('/auth/login', { email, password, totp_code });
  if (data.twoFactorRequired) return { twoFactorRequired: true };
  localStorage.setItem('accessToken', data.accessToken);
  return data.user as User;
}

export async function logout() {
  await api.post('/auth/logout');
  localStorage.removeItem('accessToken');
}

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}