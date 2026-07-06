'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const TRIPLE_CLICK_WINDOW_MS = 1000;

export function SiteLogo({ company }: { company?: string }) {
  const router = useRouter();
  const clickCount = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    clickCount.current += 1;

    if (clickCount.current >= 3) {
      e.preventDefault();
      clickCount.current = 0;
      if (resetTimer.current) clearTimeout(resetTimer.current);
      router.push('/admin/login');
      return;
    }

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, TRIPLE_CLICK_WINDOW_MS);
  }

  return (
    <Link href="/" onClick={handleClick} className="flex items-center gap-3">
      <Image src="/logo.png" alt={company ?? 'Logo'} width={40} height={40} className="rounded-full" />
      <span className="text-lg font-bold text-marble-gold tracking-wide hidden sm:inline">{company}</span>
    </Link>
  );
}
