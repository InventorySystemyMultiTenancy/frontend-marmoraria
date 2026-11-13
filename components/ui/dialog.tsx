'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dialog({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="ds-backdrop absolute inset-0 bg-ink/55 backdrop-blur-[3px]" onClick={onClose} />
      <div
        className={cn(
          'ds-dialog relative z-10 w-full max-w-lg rounded-2xl border border-marble-gold/20 bg-gradient-to-b from-white to-[#fdfbf8] p-4 sm:p-6 shadow-[0_40px_80px_-30px_rgba(21,17,15,0.6)] max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-marble-gold/10 hover:text-ink cursor-pointer"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
