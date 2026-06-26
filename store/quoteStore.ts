import { create } from 'zustand';
import { Marble } from '@/types';

export interface QuoteBuilderItem {
  marble: Marble;
  widthCm: number;
  heightCm: number;
  thicknessMm: number;
  quantity: number;
}

interface QuoteState {
  selectedMarble: Marble | null;
  items: QuoteBuilderItem[];
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  setSelectedMarble: (marble: Marble | null) => void;
  addItem: (item: QuoteBuilderItem) => void;
  removeItem: (index: number) => void;
  setClientInfo: (info: { clientName: string; clientPhone: string; clientEmail: string }) => void;
  reset: () => void;
}

export const useQuoteStore = create<QuoteState>((set) => ({
  selectedMarble: null,
  items: [],
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  setSelectedMarble: (marble) => set({ selectedMarble: marble }),
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (index) => set((s) => ({ items: s.items.filter((_, i) => i !== index) })),
  setClientInfo: (info) => set(info),
  reset: () => set({ selectedMarble: null, items: [], clientName: '', clientPhone: '', clientEmail: '' }),
}));
