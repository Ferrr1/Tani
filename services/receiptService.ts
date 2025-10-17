import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  CreateReceiptInput,
  ReceiptRow,
  UpdateReceiptInput,
} from "@/types/receipt";
import { ensureMoneyNum, ensureText } from "@/utils/expense";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

async function assertSeasonOwnership(userId: string, seasonId: string) {
  const { data, error } = await supabase
    .from("seasons")
    .select("id,user_id")
    .eq("id", seasonId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Season tidak ditemukan.");
  if (data.user_id !== userId) {
    throw new Error("Season bukan milik user ini.");
  }
}

export const receiptRepo = {
  async list(
    userId: string,
    opts?: { seasonId?: string } // undefined = semua season
  ): Promise<ReceiptRow[]> {
    let q = supabase
      .from("receipts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (opts?.seasonId) {
      q = q.eq("season_id", opts.seasonId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as ReceiptRow[];
  },

  async getById(userId: string, id: string): Promise<ReceiptRow | null> {
    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as ReceiptRow) ?? null;
  },

  async create(userId: string, input: CreateReceiptInput): Promise<ReceiptRow> {
    if (!userId) throw new Error("Tidak ada userId dari AuthContext.");
    ensureText(input.seasonId, "Season");
    ensureMoneyNum(input.quantity, "Kuantitas");
    ensureText(input.unitType, "Jenis satuan");
    ensureMoneyNum(input.unitPrice, "Harga satuan");

    // Validasi kepemilikan season
    await assertSeasonOwnership(userId, input.seasonId);

    const payload = {
      user_id: userId,
      season_id: input.seasonId,
      item_name: input.itemName,
      quantity: input.quantity,
      unit_type: input.unitType,
      unit_price: input.unitPrice,
      // total dihitung di DB
    };

    const { data, error } = await supabase
      .from("receipts")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as ReceiptRow;
  },

  async update(userId: string, input: UpdateReceiptInput): Promise<ReceiptRow> {
    if (!input.id) throw new Error("ID receipt wajib diisi.");

    const patch: Record<string, any> = {};

    if (input.seasonId != null) {
      ensureText(input.seasonId, "Season");
      await assertSeasonOwnership(userId, input.seasonId);
      patch.season_id = input.seasonId;
    }
    if (input.itemName != null) {
      ensureText(input.itemName, "Nama Tanaman");
      patch.item_name = input.itemName;
    }
    if (input.quantity != null) {
      ensureMoneyNum(input.quantity, "Kuantitas");
      patch.quantity = input.quantity;
    }
    if (input.unitType != null) {
      ensureText(input.unitType, "Jenis satuan");
      patch.unit_type = input.unitType;
    }
    if (input.unitPrice != null) {
      ensureMoneyNum(input.unitPrice, "Harga satuan");
      patch.unit_price = input.unitPrice;
    }

    const { data, error } = await supabase
      .from("receipts")
      .update(patch)
      .eq("user_id", userId)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw error;
    return data as ReceiptRow;
  },

  async remove(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw error;
  },
};

export function useReceiptService() {
  const { user, authReady } = useAuth(); // dari AuthContext

  const ensureUser = useCallback(() => {
    if (!authReady) throw new Error("Auth masih loading.");
    if (!user) throw new Error("Tidak ada sesi login.");
    return user;
  }, [authReady, user]);

  return {
    listReceipts: async (opts?: { seasonId?: string }) => {
      const u = ensureUser();
      return receiptRepo.list(u.id, opts);
    },

    getReceiptById: async (id: string) => {
      const u = ensureUser();
      return receiptRepo.getById(u.id, id);
    },

    createReceipt: async (input: CreateReceiptInput) => {
      const u = ensureUser();
      return receiptRepo.create(u.id, input);
    },

    updateReceipt: async (input: UpdateReceiptInput) => {
      const u = ensureUser();
      return receiptRepo.update(u.id, input);
    },

    deleteReceipt: async (id: string) => {
      const u = ensureUser();
      return receiptRepo.remove(u.id, id);
    },
  };
}

/**
 * Hook daftar receipts — menerima seasonId dari luar (single source of truth).
 * - Anti-race: reqIdRef memastikan hanya response terbaru yang dipakai.
 * - Refresh kuat: refresh({force:true}) akan mengalahkan request lain.
 * - Auto-refetch ketika seasonId berubah.
 */
export function useReceiptList(seasonId?: string) {
  const { user } = useAuth();

  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const reqIdRef = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchOnce = useCallback(async () => {
    if (!user || !seasonId) return;
    setLoading(true);
    const myReq = ++reqIdRef.current;
    try {
      const data = await receiptRepo.list(user.id, { seasonId });
      if (!mounted.current || myReq !== reqIdRef.current) return;
      setRows(data);
    } catch (e) {
      console.warn(e);
    } finally {
      if (!mounted.current || myReq !== reqIdRef.current) return;
      setLoading(false);
    }
  }, [user, seasonId]);

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!user || !seasonId) return;
      const myReq = ++reqIdRef.current; // paksa request baru jadi "terbaru"
      if (opts?.force) {
        // optional: bisa tambahkan UX reset bila mau
        // setRows([]);
      }
      setRefreshing(true);
      try {
        const data = await receiptRepo.list(user.id, { seasonId });
        if (!mounted.current || myReq !== reqIdRef.current) return;
        setRows(data);
      } catch (e) {
        console.warn(e);
      } finally {
        if (!mounted.current || myReq !== reqIdRef.current) return;
        setRefreshing(false);
      }
    },
    [user, seasonId]
  );

  // Auto refetch saat user/seasonId berubah
  useEffect(() => {
    // reset tampilan agar tidak menahan hasil season sebelumnya
    setRows([]);
    if (user && seasonId) {
      refresh({ force: true });
    }
  }, [user?.id, seasonId, refresh]);

  const data = useMemo(() => rows, [rows]);

  const grandTotal = useMemo(
    () => data.reduce((acc, r) => acc + (Number(r.total) || 0), 0),
    [data]
  );

  return {
    loading,
    refreshing,
    rows,
    data,
    grandTotal,
    fetchOnce, // optional: kalau butuh panggil manual sekali
    refresh, // onRefresh FlatList → refresh({ force: true })
  };
}
