import { QuoteBuilder } from '@/components/admin/QuoteBuilder';
import { FilePlus2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';

export default function NovoOrcamentoPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Comercial"
        icon={FilePlus2}
        title="Novo orçamento"
        description="Os valores exibidos são uma estimativa; o total final é calculado pela fórmula de precificação configurada."
      />
      <QuoteBuilder />
    </div>
  );
}
