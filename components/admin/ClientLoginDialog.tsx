'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Check, Copy, Eye, EyeOff, KeyRound, MessageCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';

// Senha fácil de ditar/digitar (sem caracteres ambíguos como 0/O e 1/l).
function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const values = crypto.getRandomValues(new Uint32Array(8));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

function errorMessage(err: unknown) {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string; details?: { message?: string }[] } | undefined;
    return data?.details?.[0]?.message ?? data?.error ?? 'Não foi possível salvar o acesso.';
  }
  return 'Não foi possível salvar o acesso.';
}

// Cria/edita o login do cliente no site. Esse login só serve para montar
// orçamentos — não entra no painel administrativo.
export function ClientLoginDialog({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const hasLogin = Boolean(client?.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Depois de salvar, mostra as credenciais para o admin repassar ao cliente.
  const [saved, setSaved] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!client) return;
    setEmail(client.login?.email ?? client.email ?? '');
    setPassword(client.login ? '' : generatePassword());
    setShowPassword(true);
    setError(null);
    setSaved(null);
    setCopied(false);
  }, [client]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      api.put(`/clients/${client!.id}/login`, { email: email.trim(), password: password || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSaved({ email: email.trim().toLowerCase(), password });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const removeMutation = useMutation({
    mutationFn: async () => api.delete(`/clients/${client!.id}/login`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
    onError: () => setError('Não foi possível remover o acesso.'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError('Informe o e-mail de acesso.');
    if (!hasLogin && password.length < 6) return setError('A senha precisa ter ao menos 6 caracteres.');
    if (hasLogin && password && password.length < 6) return setError('A senha precisa ter ao menos 6 caracteres.');
    saveMutation.mutate();
  }

  const siteUrl = typeof window !== 'undefined' ? `${window.location.origin}/entrar` : '/entrar';
  const credentialsText = saved
    ? [
        `Olá, ${client?.name}! Seu acesso para fazer orçamentos no nosso site:`,
        `Site: ${siteUrl}`,
        `E-mail: ${saved.email}`,
        saved.password ? `Senha: ${saved.password}` : 'Senha: a mesma de antes',
      ].join('\n')
    : '';
  const clientPhone = client?.phone?.replace(/\D/g, '') ?? '';
  const whatsappPhone = clientPhone && !clientPhone.startsWith('55') ? `55${clientPhone}` : clientPhone;

  async function copyCredentials() {
    try {
      await navigator.clipboard.writeText(credentialsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o texto continua visível na tela.
    }
  }

  return (
    <Dialog open={Boolean(client)} onClose={onClose}>
      <h2 className="text-lg font-semibold text-marble-dark mb-1 flex items-center gap-2">
        <KeyRound size={18} className="text-marble-gold" /> Acesso ao site
      </h2>
      <p className="text-sm text-marble-gray mb-4">
        {client?.name} — login para fazer orçamentos pelo site. Não dá acesso ao painel administrativo.
      </p>

      {saved ? (
        <div className="space-y-4">
          <p className="text-sm text-emerald-700 flex items-center gap-2">
            <Check size={16} /> Acesso {hasLogin ? 'atualizado' : 'criado'}. Envie os dados para o cliente:
          </p>
          <pre className="whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-marble-cream/60 p-3 text-sm text-ink">
            {credentialsText}
          </pre>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={copyCredentials}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado' : 'Copiar'}
            </Button>
            {whatsappPhone && (
              <a
                href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(credentialsText)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button type="button" variant="outline" className="w-full">
                  <MessageCircle size={16} /> Enviar no WhatsApp
                </Button>
              </a>
            )}
            <Button type="button" onClick={onClose}>
              Concluir
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="client-login-email">E-mail de acesso</Label>
            <Input
              id="client-login-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
            />
          </div>
          <div>
            <Label htmlFor="client-login-password">{hasLogin ? 'Nova senha (opcional)' : 'Senha'}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="client-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={hasLogin ? 'Deixe em branco para manter a atual' : 'Mínimo 6 caracteres'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-ink cursor-pointer"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())} title="Gerar senha">
                <RefreshCw size={16} />
              </Button>
            </div>
            {hasLogin && (
              <p className="text-xs text-marble-gray mt-1">
                Trocar a senha desconecta o cliente dos aparelhos em que ele já estava logado.
              </p>
            )}
          </div>

          {client?.login?.lastLoginAt && (
            <p className="text-xs text-marble-gray">
              Último acesso: {new Date(client.login.lastLoginAt).toLocaleString('pt-BR')}
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
            {hasLogin ? (
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                disabled={removeMutation.isPending}
                onClick={() =>
                  confirm('Remover o acesso deste cliente? Ele não conseguirá mais fazer orçamentos pelo site.') &&
                  removeMutation.mutate()
                }
              >
                {removeMutation.isPending ? 'Removendo...' : 'Remover acesso'}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : hasLogin ? 'Salvar' : 'Criar acesso'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}
