// services/informationService.ts
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  CreateInformationInput,
  InformationRow,
  UpdateInformationInput,
} from "@/types/information";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const informationRepo = {
  /** READ LIST (publik) – tidak perlu filter user */
  async list(): Promise<InformationRow[]> {
    const { data, error } = await supabase
      .from("informations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as InformationRow[];
  },

  /** READ BY ID (publik) */
  async getById(id: string): Promise<InformationRow | null> {
    const { data, error } = await supabase
      .from("informations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return (data as InformationRow) ?? null;
  },

  /** CREATE (admin-only via RLS) */
  async create(input: CreateInformationInput): Promise<InformationRow> {
    if (!input.title?.trim()) throw new Error("Judul wajib diisi.");
    if (!input.description?.trim()) throw new Error("Deskripsi wajib diisi.");

    const payload = {
      title: input.title.trim(),
      description: input.description.trim(),
      note: input.note?.trim() || null,
      is_active: !!input.isActive,
      // created_by diisi otomatis via RLS/DB trigger (opsional),
      // kalau tetap ingin set eksplisit dari client:
      // created_by: userId
    };

    const { data, error } = await supabase
      .from("informations")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as InformationRow;
  },

  /** UPDATE (admin-only via RLS) */
  async update(input: UpdateInformationInput): Promise<InformationRow> {
    const patch: Record<string, any> = {};
    if (input.title !== undefined) {
      if (!input.title.trim()) throw new Error("Judul wajib diisi.");
      patch.title = input.title.trim();
    }
    if (input.description !== undefined) {
      if (!input.description.trim()) throw new Error("Deskripsi wajib diisi.");
      patch.description = input.description.trim();
    }
    if (input.note !== undefined) {
      patch.note = input.note?.trim() || null;
    }
    if (input.isActive !== undefined) {
      patch.is_active = !!input.isActive;
    }

    const { data, error } = await supabase
      .from("informations")
      .update(patch)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw error;
    return data as InformationRow;
  },

  /** DELETE (admin-only via RLS) */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("informations").delete().eq("id", id);
    if (error) throw error;
  },
};

export function useInformationService() {
  // Tidak butuh user untuk read; write akan di-cek oleh RLS is_admin.
  // Tetap ambil context supaya siap kalau mau tampilkan error "bukan admin".
  const { authReady } = useAuth();

  const ensureReady = useCallback(() => {
    if (!authReady) throw new Error("Auth masih loading.");
  }, [authReady]);

  return {
    listInformation: async () => {
      ensureReady();
      return informationRepo.list();
    },
    getInformationById: async (id: string) => {
      ensureReady();
      return informationRepo.getById(id);
    },
    createInformation: async (input: CreateInformationInput) => {
      ensureReady();
      return informationRepo.create(input);
    },
    updateInformation: async (input: UpdateInformationInput) => {
      ensureReady();
      return informationRepo.update(input);
    },
    deleteInformation: async (id: string) => {
      ensureReady();
      return informationRepo.remove(id);
    },
  };
}

/** ===== List hook anti-spam (tanpa filter user_id) ===== */
export function useInformationList() {
  const [rows, setRows] = useState<InformationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (mounted.current) setLoading(true);
      const data = await informationRepo.list();
      if (!mounted.current) return;
      setRows(data);
    } catch (e) {
      console.warn("useInformationList", e);
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (mounted.current) setRefreshing(true);
      const data = await informationRepo.list();
      if (!mounted.current) return;
      setRows(data);
    } catch (e) {
      console.warn("useInformationList.refresh", e);
    } finally {
      inFlight.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  const data = useMemo(() => rows, [rows]);

  return {
    loading,
    refreshing,
    rows,
    data,
    fetchOnce,
    refresh,
  };
}
