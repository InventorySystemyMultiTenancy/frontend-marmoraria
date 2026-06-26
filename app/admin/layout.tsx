'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMe } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/admin/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const { data: user, isLoading } = useMe();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    setUser(user ?? null);
    if (!isLoginPage && !isLoading && !user) {
      router.replace('/admin/login');
    }
  }, [user, isLoading, isLoginPage, router, setUser]);

  if (isLoginPage) return <>{children}</>;

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-marble-cream">
        <p className="text-marble-gray text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-gray-50 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
