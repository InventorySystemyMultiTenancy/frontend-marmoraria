'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(values.email, values.password);
      queryClient.setQueryData(['me'], user);
      router.push('/admin/dashboard');
    } catch {
      setError('Email ou senha inválidos.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <Image
        src="/loginpagebackground.png"
        alt=""
        fill
        priority
        className="object-cover -z-20"
      />
      <div className="absolute inset-0 bg-marble-cream/80 -z-10" />

      <div className="ds-card ds-rise w-full max-w-sm p-8 !bg-white/90 backdrop-blur-md !border-marble-gold/25 shadow-[0_40px_80px_-30px_rgba(21,17,15,0.45)]">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="Logo" width={72} height={72} className="mx-auto mb-3 rounded-full ring-2 ring-marble-gold/40 shadow-[0_10px_30px_-8px_rgba(201,169,110,0.8)]" />
          <h1 className="ds-title !text-2xl">Marmoraria Pedras Pedroza</h1>
          <p className="text-sm text-marble-gray mt-1">Painel administrativo</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" variant="gold" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
