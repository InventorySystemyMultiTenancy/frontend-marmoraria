import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { User } from '@/types';

export async function fetchMe(): Promise<User | null> {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  });
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  return data.user as User;
}

export async function logout() {
  await api.post('/auth/logout');
}
