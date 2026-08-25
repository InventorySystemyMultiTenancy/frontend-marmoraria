export type UserRole = 'MASTER' | 'ADMIN' | 'EMPLOYEE' | 'SALESPERSON';

export interface UserPermissions {
  clients_view: boolean;
  clients_create: boolean;
  clients_edit: boolean;
  clients_delete: boolean;
  quotes_view: boolean;
  quotes_create: boolean;
  quotes_edit: boolean;
  quotes_delete: boolean;
  quotes_approve: boolean;
  quotes_pdf: boolean;
  orders_view: boolean;
  orders_create: boolean;
  orders_update_status: boolean;
  orders_view_costs: boolean;
  orders_apply_discount: boolean;
  stock_view: boolean;
  stock_edit: boolean;
  stock_add: boolean;
  financial_view: boolean;
  financial_create: boolean;
  financial_edit: boolean;
  financial_reports: boolean;
  marbles_view: boolean;
  marbles_edit: boolean;
  marbles_create: boolean;
  marbles_delete: boolean;
  users_view: boolean;
  users_create: boolean;
  users_edit: boolean;
  users_set_permissions: boolean;
}

export const PERMISSION_GROUPS: { label: string; keys: (keyof UserPermissions)[] }[] = [
  { label: 'Clientes', keys: ['clients_view', 'clients_create', 'clients_edit', 'clients_delete'] },
  {
    label: 'Orçamentos',
    keys: ['quotes_view', 'quotes_create', 'quotes_edit', 'quotes_delete', 'quotes_approve', 'quotes_pdf'],
  },
  {
    label: 'Pedidos / Produção',
    keys: ['orders_view', 'orders_create', 'orders_update_status', 'orders_view_costs', 'orders_apply_discount'],
  },
  { label: 'Estoque', keys: ['stock_view', 'stock_edit', 'stock_add'] },
  {
    label: 'Financeiro',
    keys: ['financial_view', 'financial_create', 'financial_edit', 'financial_reports'],
  },
  { label: 'Catálogo de Mármores', keys: ['marbles_view', 'marbles_edit', 'marbles_create', 'marbles_delete'] },
  { label: 'Funcionários', keys: ['users_view', 'users_create', 'users_edit', 'users_set_permissions'] },
];

export const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  clients_view: 'Visualizar clientes',
  clients_create: 'Cadastrar clientes',
  clients_edit: 'Editar clientes',
  clients_delete: 'Excluir clientes',
  quotes_view: 'Visualizar orçamentos',
  quotes_create: 'Criar orçamentos',
  quotes_edit: 'Editar orçamentos',
  quotes_delete: 'Excluir orçamentos',
  quotes_approve: 'Aprovar/rejeitar orçamentos',
  quotes_pdf: 'Gerar PDF de orçamentos',
  orders_view: 'Visualizar pedidos',
  orders_create: 'Criar pedidos',
  orders_update_status: 'Atualizar status de pedidos',
  orders_view_costs: 'Visualizar custos de produção',
  orders_apply_discount: 'Aplicar desconto em pedidos',
  stock_view: 'Visualizar estoque',
  stock_edit: 'Editar estoque',
  stock_add: 'Adicionar entradas ao estoque',
  financial_view: 'Visualizar financeiro',
  financial_create: 'Criar lançamentos financeiros',
  financial_edit: 'Editar lançamentos financeiros',
  financial_reports: 'Visualizar relatórios financeiros',
  marbles_view: 'Visualizar catálogo de mármores',
  marbles_edit: 'Editar mármores',
  marbles_create: 'Cadastrar mármores',
  marbles_delete: 'Excluir mármores',
  users_view: 'Visualizar funcionários',
  users_create: 'Cadastrar funcionários',
  users_edit: 'Editar funcionários',
  users_set_permissions: 'Definir permissões de funcionários',
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: UserPermissions;
  isActive?: boolean;
  createdAt?: string;
}

export type MarbleType =
  | 'MARBLE'
  | 'GRANITE'
  | 'QUARTZITE'
  | 'PORCELAIN'
  | 'LIMESTONE'
  | 'TRAVERTINE'
  | 'OTHER';

export const MARBLE_TYPE_LABELS: Record<MarbleType, string> = {
  MARBLE: 'Mármore',
  GRANITE: 'Granito',
  QUARTZITE: 'Quartzito',
  PORCELAIN: 'Porcelanato',
  LIMESTONE: 'Calcário',
  TRAVERTINE: 'Travertino',
  OTHER: 'Outro',
};

export interface Marble {
  id: string;
  name: string;
  description?: string | null;
  origin?: string | null;
  color?: string | null;
  type: MarbleType;
  pricePerM2?: number | null;
  thickness?: number | null;
  isAvailable: boolean;
  isPublic: boolean;
  imageUrls: string[];
  createdAt?: string;
}

export type StockStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'DAMAGED';

export interface StockItem {
  id: string;
  marbleId: string;
  marble?: { name: string; type: MarbleType };
  slabNumber?: string | null;
  widthCm: number;
  heightCm: number;
  thicknessMm: number;
  areaM2: number;
  costPrice?: number | null;
  location?: string | null;
  status: StockStatus;
  entryDate: string;
  notes?: string | null;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cpfCnpj?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  createdAt?: string;
  quotes?: Quote[];
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type QuoteSource = 'ADMIN' | 'SELF_SERVICE';

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
};

export interface QuoteItem {
  id: string;
  marbleId: string;
  marble?: { name: string; imageUrls?: string[]; pricePerM2?: number | null };
  description?: string | null;
  widthCm: number;
  heightCm: number;
  thicknessMm: number;
  quantity: number;
  areaM2: number;
  unitPrice: number;
  totalPrice: number;
  extras?: { name: string; price: number }[];
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId?: string | null;
  client?: Client | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientCpfCnpj?: string | null;
  createdBy?: { name: string };
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  discountPct: number;
  freight: number;
  freightDistanceKm?: number | null;
  total: number;
  notes?: string | null;
  validUntil?: string | null;
  pdfUrl?: string | null;
  source: QuoteSource;
  createdAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'IN_CUTTING'
  | 'IN_POLISHING'
  | 'IN_FINISHING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Aguardando',
  IN_CUTTING: 'Em corte',
  IN_POLISHING: 'Em polimento',
  IN_FINISHING: 'Em acabamento',
  READY: 'Pronto',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export interface OrderStage {
  id: string;
  stageName: string;
  status: string;
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  quoteId: string;
  quote?: Quote;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string } | null;
  status: OrderStatus;
  startDate?: string | null;
  estimatedDate?: string | null;
  completedDate?: string | null;
  productionNotes?: string | null;
  materialCost?: number | null;
  laborCost?: number | null;
  stages?: OrderStage[];
  createdAt: string;
}

export type FinancialType = 'INCOME' | 'EXPENSE';

export interface FinancialEntry {
  id: string;
  type: FinancialType;
  category: string;
  description: string;
  amount: number;
  date: string;
  orderId?: string | null;
  notes?: string | null;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  freightRatePerKm?: number | null;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  [key: string]: T[] | number;
}
