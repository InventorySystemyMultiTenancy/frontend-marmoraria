'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Boxes,
  Wallet,
  Gem,
  UserCog,
  Sigma,
  LogOut,
} from 'lucide-react';
import { logout } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { UserPermissions } from '@/types';

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: keyof UserPermissions;
}[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clientes', label: 'Clientes', icon: Users, permission: 'clients_view' },
  { href: '/admin/orcamentos', label: 'Orçamentos', icon: FileText, permission: 'quotes_view' },
  { href: '/admin/pedidos', label: 'Pedidos', icon: Package, permission: 'orders_view' },
  { href: '/admin/estoque', label: 'Estoque', icon: Boxes, permission: 'stock_view' },
  { href: '/admin/financeiro', label: 'Financeiro', icon: Wallet, permission: 'financial_view' },
  { href: '/admin/catalogo', label: 'Catálogo', icon: Gem, permission: 'marbles_view' },
  { href: '/admin/funcionarios', label: 'Funcionários', icon: UserCog, permission: 'users_view' },
  { href: '/admin/formula', label: 'Fórmula', icon: Sigma },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  async function handleLogout() {
    await logout();
    queryClient.setQueryData(['me'], null);
    router.push('/admin/login');
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      !item.permission ||
      hasPermission(user, item.permission) ||
      (item.href === '/admin/formula' && user?.role === 'MASTER')
  );

  return (
    <motion.aside
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-60 shrink-0 h-screen bg-marble-dark text-white flex flex-col overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgba(201,169,110,0.12), transparent 50%), radial-gradient(circle at 100% 100%, rgba(245,240,232,0.05), transparent 50%)',
        }}
      />

      <div className="px-5 py-6 border-b border-white/10 flex items-center gap-3 relative z-10">
        <Image src="/logo.png" alt="Logo" width={36} height={36} className="rounded-full ring-2 ring-marble-gold/30" />
        <div>
          <h1 className="text-sm font-bold text-marble-gold leading-tight">Marmoraria Pedras Pedroza</h1>
          <p className="text-xs text-white/50 mt-0.5">Painel administrativo</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto relative z-10">
        {visibleItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active ? 'text-marble-dark font-medium' : 'text-white/70 hover:bg-white/10'
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-marble-gold rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon size={18} className="relative z-10 transition-transform group-hover:scale-110" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 relative z-10">
        <div className="px-3 mb-2">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-white/50">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white w-full cursor-pointer transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </motion.aside>
  );
}
