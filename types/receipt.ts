export type ReceiptRow = {
  id: string;
  user_id: string;
  season_id: string;
  quantity: number; // numeric(18,2)
  unit_type: string; // text
  unit_price: number; // numeric(18,2)
  total: number;
  created_at: string;
  updated_at: string;
};

export type CreateReceiptInput = {
  seasonId: string;
  quantity: number;
  unitType: string;
  unitPrice: number;
};

export type UpdateReceiptInput = {
  id: string;
  seasonId?: string;
  quantity?: number;
  unitType?: string;
  unitPrice?: number;
};
