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
    keys: ['orders_view', 'orders_create', 'orders_update_status', 'orders_view_costs'],
  },
  { label: 'Estoque', keys: ['stock_view', 'stock_edit', 'stock_add'] },
  {
    label: 'Financeiro',
    keys: ['financial_view', 'financial_create', 'financial_edit', 'financial_reports'],
  },
  { label: 'Catálogo de Mármores', keys: ['marbles_view', 'marbles_edit', 'marbles_create', 'marbles_delete'] },
  { label: 'Funcionários', keys: ['users_view', 'users_create', 'users_edit', 'users_set_permissions'] },
];

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

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type QuoteSource = 'ADMIN' | 'SELF_SERVICE';

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  EXPIRED: 'Expirado',
};

export interface QuoteItem {
  id: string;
  marbleId: string;
  marble?: { name: string; imageUrls?: string[] };
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
  client?: { name: string } | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
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

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  [key: string]: T[] | number;
}
