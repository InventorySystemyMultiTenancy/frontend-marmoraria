'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/admin/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const { data: user, isLoading } = useMe(!isLoginPage);
  const setUser = useAuthStore((s) => s.setUser);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setUser(user ?? null);
    if (!isLoginPage && !isLoading && !user) {
      router.replace('/admin/login');
    }
  }, [user, isLoading, isLoginPage, router, setUser]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="admin-canvas flex-1 min-w-0 h-screen flex flex-col md:ml-64">
        <header className="md:hidden relative z-10 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-ink-2 to-ink text-white shrink-0 shadow-[0_8px_24px_-12px_rgba(21,17,15,0.7)] border-b border-marble-gold/20">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            className="p-1.5 -ml-1 rounded-lg cursor-pointer transition-colors hover:bg-white/10"
          >
            <Menu size={22} />
          </button>
          <span className="text-sm font-semibold bg-gradient-to-r from-gold-light to-marble-gold bg-clip-text text-transparent">Painel administrativo</span>
        </header>
        <main className="relative flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
