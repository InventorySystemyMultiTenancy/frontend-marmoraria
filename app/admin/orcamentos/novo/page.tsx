import { QuoteBuilder } from '@/components/admin/QuoteBuilder';

export default function NovoOrcamentoPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-marble-dark">Novo orçamento</h1>
        <p className="text-sm text-gray-500 mt-1">
          Os valores exibidos são uma estimativa; o total final é calculado pela fórmula de precificação configurada.
        </p>
      </div>
      <QuoteBuilder />
    </div>
  );
}
