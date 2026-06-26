'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useMe } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/admin/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const { data: user, isLoading } = useMe(!isLoginPage);
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
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
          className="text-marble-gray text-sm"
        >
          Carregando...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="p-6 max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
