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
  Building2,
  LogOut,
  Home,
} from 'lucide-react';
import { logout } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { UserPermissions } from '@/types';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: keyof UserPermissions;
};

// Mesmos itens e permissões de antes, só organizados em grupos.
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Visão geral',
    items: [{ href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Comercial',
    items: [
      { href: '/admin/clientes', label: 'Clientes', icon: Users, permission: 'clients_view' },
      { href: '/admin/orcamentos', label: 'Orçamentos', icon: FileText, permission: 'quotes_view' },
      { href: '/admin/pedidos', label: 'Pedidos', icon: Package, permission: 'orders_view' },
    ],
  },
  {
    title: 'Operação',
    items: [
      { href: '/admin/estoque', label: 'Estoque', icon: Boxes, permission: 'stock_view' },
      { href: '/admin/catalogo', label: 'Catálogo', icon: Gem, permission: 'marbles_view' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { href: '/admin/financeiro', label: 'Financeiro', icon: Wallet, permission: 'financial_view' },
      { href: '/admin/funcionarios', label: 'Funcionários', icon: UserCog, permission: 'users_view' },
      { href: '/admin/formula', label: 'Fórmula', icon: Sigma },
      { href: '/admin/empresa', label: 'Empresa', icon: Building2 },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  MASTER: 'Administrador master',
  ADMIN: 'Administrador',
  EMPLOYEE: 'Funcionário',
  SALESPERSON: 'Vendedor',
};

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  async function handleLogout() {
    await logout();
    queryClient.setQueryData(['me'], null);
    router.push('/admin/login');
  }

  const isVisible = (item: NavItem) =>
    !item.permission ||
    hasPermission(user, item.permission) ||
    (item.href === '/admin/formula' && user?.role === 'MASTER');

  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(isVisible) })).filter(
    (g) => g.items.length > 0
  );

  const initials = (user?.name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <>
      {open && (
        <div
          className="ds-backdrop fixed inset-0 z-40 bg-ink/60 backdrop-blur-[2px] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'w-64 shrink-0 h-screen text-white flex flex-col overflow-hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:translate-x-0',
          'bg-[linear-gradient(180deg,#1f1915,#15110f_45%,#0f0c0b)] border-r border-marble-gold/15',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* veios de mármore negro + luz dourada no topo */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen"
          style={{ background: "url('/textures/marble-noir.webp') center / 420px" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(260px 200px at 0% 0%, rgba(201,169,110,0.22), transparent 70%), radial-gradient(240px 220px at 100% 100%, rgba(201,169,110,0.08), transparent 70%)',
          }}
        />

        <div className="px-5 pt-6 pb-5 flex items-center gap-3 relative z-10">
          <span className="relative">
            <span aria-hidden className="absolute -inset-1 rounded-full bg-marble-gold/25 blur-md" />
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="relative rounded-full ring-2 ring-marble-gold/40"
            />
          </span>
          <div className="min-w-0">
            <h1 className="text-[13px] font-semibold leading-tight bg-gradient-to-r from-gold-light to-marble-gold bg-clip-text text-transparent">
              Marmoraria Pedras Pedroza
            </h1>
            <p className="text-[11px] text-white/45 mt-0.5 tracking-wide">Painel administrativo</p>
          </div>
        </div>
        <div aria-hidden className="mx-5 h-px bg-gradient-to-r from-transparent via-marble-gold/35 to-transparent relative z-10" />

        <nav className="flex-1 px-3 py-3 overflow-y-auto relative z-10 space-y-4">
          <Link
            href="/"
            className="group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-white/55 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <Home size={17} className="transition-transform group-hover:-translate-x-0.5" />
            Voltar ao site
          </Link>

          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname?.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                        active ? 'text-ink font-semibold' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 rounded-xl bg-gradient-to-br from-gold-light via-marble-gold to-gold-deep shadow-[0_8px_22px_-10px_rgba(201,169,110,0.9),inset_0_1px_0_rgba(255,255,255,0.45)]"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      <Icon
                        size={18}
                        strokeWidth={active ? 2.1 : 1.75}
                        className="relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                      />
                      <span className="relative z-10">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 relative z-10">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-gold-light to-gold-deep text-ink text-xs font-bold flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-[11px] text-white/45 truncate">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="group mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[13px] text-white/70 border border-white/10 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200 w-full cursor-pointer transition-colors"
            >
              <LogOut size={16} className="transition-transform group-hover:translate-x-0.5" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
