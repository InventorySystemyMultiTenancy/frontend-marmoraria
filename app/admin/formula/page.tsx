'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/lib/utils';

interface VariableDoc { name: string; description: string }
interface FormulaConfig { id: string; expression: string; description?: string | null; createdAt: string }

export default function FormulaPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ['formula'],
    queryFn: async () => (await api.get('/formula')).data as { formula: FormulaConfig; variableDocs: VariableDoc[] },
  });

  const { data: history } = useQuery({
    queryKey: ['formula-history'],
    queryFn: async () => (await api.get('/formula/history')).data as { history: FormulaConfig[] },
  });

  const [expression, setExpression] = useState('');
  const [description, setDescription] = useState('');
  const [testValues, setTestValues] = useState({ width: '100', height: '60', thickness: '20', pricePerM2: '500', quantity: '1' });
  const [testResult, setTestResult] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.formula) {
      setExpression(data.formula.expression);
      setDescription(data.formula.description ?? '');
    }
  }, [data]);

  const testMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/formula/test', {
          expression,
          width: Number(testValues.width),
          height: Number(testValues.height),
          thickness: Number(testValues.thickness),
          pricePerM2: Number(testValues.pricePerM2),
          quantity: Number(testValues.quantity),
        })
      ).data as { result: number },
    onSuccess: (res) => { setTestResult(res.result); setTestError(null); },
    onError: () => { setTestError('Fórmula inválida. Verifique a sintaxe.'); setTestResult(null); },
  });

  const saveMutation = useMutation({
    mutationFn: async () => api.put('/formula', { expression, description }),
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ['formula'] });
      queryClient.invalidateQueries({ queryKey: ['formula-history'] });
    },
    onError: () => setSaveError('Não foi possível salvar. Verifique a fórmula.'),
  });

  if (user && user.role !== 'MASTER') {
    return <p className="text-gray-500">Apenas o usuário MASTER pode configurar a fórmula de precificação.</p>;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold text-marble-dark">Fórmula de Precificação</h1>

      <Card>
        <CardHeader><CardTitle>Variáveis disponíveis</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-1">
            {data?.variableDocs.map((v) => (
              <li key={v.name}><code className="bg-gray-100 px-1.5 py-0.5 rounded text-marble-dark">{v.name}</code> — {v.description}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Expressão</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={3} value={expression} onChange={(e) => setExpression(e.target.value)} className="font-mono" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" />
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Salvando...' : 'Salvar fórmula'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Teste ao vivo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <div><Label>Largura (cm)</Label><Input value={testValues.width} onChange={(e) => setTestValues({ ...testValues, width: e.target.value })} /></div>
            <div><Label>Altura (cm)</Label><Input value={testValues.height} onChange={(e) => setTestValues({ ...testValues, height: e.target.value })} /></div>
            <div><Label>Espessura (mm)</Label><Input value={testValues.thickness} onChange={(e) => setTestValues({ ...testValues, thickness: e.target.value })} /></div>
            <div><Label>Preço/m²</Label><Input value={testValues.pricePerM2} onChange={(e) => setTestValues({ ...testValues, pricePerM2: e.target.value })} /></div>
            <div><Label>Qtd.</Label><Input value={testValues.quantity} onChange={(e) => setTestValues({ ...testValues, quantity: e.target.value })} /></div>
          </div>
          <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
            {testMutation.isPending ? 'Calculando...' : 'Testar fórmula'}
          </Button>
          {testError && <p className="text-sm text-red-600">{testError}</p>}
          {testResult != null && <p className="text-lg font-bold text-marble-gold">Resultado: {formatCurrency(testResult)}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico de versões</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2">
            {history?.history.map((h) => (
              <li key={h.id} className="border-b border-gray-50 pb-2 last:border-0">
                <code className="text-marble-dark">{h.expression}</code>
                <span className="text-gray-400 ml-2 text-xs">{new Date(h.createdAt).toLocaleString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
