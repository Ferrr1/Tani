// services/adminUserService.ts
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ===== Types ===== */
export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  nama_desa: string | null;
  jenis_tanaman: string | null;
  luas_lahan: number | null;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
};

export type UpdateUserInput = {
  targetUserId: string;
  newEmail?: string;
  newPassword?: string;
  newFullName?: string;
  newNamaDesa?: string;
  newJenisTanaman?: string;
  newLuasLahan?: number;
  newRole?: "user" | "admin";
};

export type ListUsersOpts = {
  q?: string;
  limit?: number;
  offset?: number;
};

/** ===== Repo ===== */
export const adminUserRepo = {
  async list(opts?: ListUsersOpts): Promise<AdminUserRow[]> {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;
    let q = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (opts?.q && opts.q.trim()) {
      const key = `%${opts.q.trim()}%`;
      q = q.or(
        [
          `full_name.ilike.${key}`,
          `email.ilike.${key}`,
          `nama_desa.ilike.${key}`,
          `jenis_tanaman.ilike.${key}`,
        ].join(",")
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as AdminUserRow[];
  },

  async getById(id: string): Promise<AdminUserRow | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as AdminUserRow) ?? null;
  },

  async update(input: UpdateUserInput): Promise<void> {
    const {
      targetUserId,
      newEmail,
      newPassword,
      newFullName,
      newNamaDesa,
      newJenisTanaman,
      newLuasLahan,
      newRole,
    } = input;

    // 1) Ubah email/password via Edge Function (kalau diisi)
    if (newEmail || newPassword) {
      const { error } = await supabase.functions.invoke("admin-update-user", {
        body: { targetUserId, newEmail, newPassword },
      });
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const { error: msg } = await error.context
            .json()
            .catch(() => ({ error: "Function error" }));
          throw new Error(msg || "Gagal memperbarui email/password");
        }
        throw error;
      }
    }

    // 2) Ubah kolom profile via RPC (selalu boleh dipanggil; hanya nilai yang tidak null yang di-set)
    const { error: eRpc } = await supabase.rpc("admin_update_profile_only", {
      target_user_id: targetUserId,
      new_full_name: newFullName ?? null,
      new_nama_desa: newNamaDesa ?? null,
      new_jenis_tanaman: newJenisTanaman ?? null,
      new_luas_lahan: newLuasLahan ?? null,
      new_role: newRole ?? null,
    });
    if (eRpc) throw eRpc;
  },

  async remove(targetUserId: string): Promise<void> {
    // (opsional) punya function admin-delete-user sendiri
    const { error } = await supabase.functions.invoke("admin-delete-user", {
      body: { targetUserId },
    });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const { error: msg } = await error.context
          .json()
          .catch(() => ({ error: "Function error" }));
        throw new Error(msg || "Gagal menghapus user");
      }
      throw error;
    }
  },
};

/** ===== Service (auth-aware) ===== */
export function useAdminUserService() {
  const { user, loading } = useAuth();

  const ensureAdmin = useCallback(() => {
    if (loading) throw new Error("Auth masih loading.");
    if (!user) throw new Error("Tidak ada sesi login.");
    return user;
  }, [loading, user]);

  const listUsers = useCallback(
    (opts?: ListUsersOpts) => {
      ensureAdmin();
      return adminUserRepo.list(opts);
    },
    [ensureAdmin]
  );

  const getUserById = useCallback(
    (id: string) => {
      ensureAdmin();
      return adminUserRepo.getById(id);
    },
    [ensureAdmin]
  );

  const updateUser = useCallback(
    (input: UpdateUserInput) => {
      ensureAdmin();
      return adminUserRepo.update(input);
    },
    [ensureAdmin]
  );

  const deleteUser = useCallback(
    (id: string) => {
      ensureAdmin();
      return adminUserRepo.remove(id);
    },
    [ensureAdmin]
  );

  return useMemo(
    () => ({
      loading,
      listUsers,
      getUserById,
      updateUser,
      deleteUser,
    }),
    [loading, listUsers, getUserById, updateUser, deleteUser]
  );
}

/** ===== List hook ===== */
export function useAdminUserList(initialQ = "", initialLimit = 50) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState(initialQ);
  const [limit, setLimit] = useState(initialLimit);
  const [offset, setOffset] = useState(0);

  const inFlight = useRef(false);
  const mounted = useRef(true);

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
      if (mounted.current) setLoadingList(true);
      const data = await adminUserRepo.list({ q, limit, offset });
      if (!mounted.current) return;
      setRows(data);
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoadingList(false);
    }
  }, [q, limit, offset]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (mounted.current) setRefreshing(true);
      const data = await adminUserRepo.list({ q, limit, offset });
      if (!mounted.current) return;
      setRows(data);
    } finally {
      inFlight.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, [q, limit, offset]);

  return {
    loading: loadingList,
    refreshing,
    rows,
    q,
    setQ,
    limit,
    setLimit,
    offset,
    setOffset,
    fetchOnce,
    refresh,
  };
}

/** ===== Detail hook ===== */
export function useAdminUserDetail(targetUserId?: string) {
  const [row, setRow] = useState<AdminUserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchOnce = useCallback(async () => {
    if (!targetUserId || inFlight.current) return;
    inFlight.current = true;
    try {
      if (mounted.current) setLoading(true);
      const data = await adminUserRepo.getById(targetUserId);
      if (!mounted.current) return;
      setRow(data);
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  const refresh = useCallback(async () => {
    if (!targetUserId || inFlight.current) return;
    inFlight.current = true;
    try {
      if (mounted.current) setRefreshing(true);
      const data = await adminUserRepo.getById(targetUserId);
      if (!mounted.current) return;
      setRow(data);
    } finally {
      inFlight.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, [targetUserId]);

  const update = useCallback(
    async (input: Omit<UpdateUserInput, "targetUserId">) => {
      if (!targetUserId) throw new Error("targetUserId tidak ada.");
      await adminUserRepo.update({ targetUserId, ...input });
      await refresh();
    },
    [targetUserId, refresh]
  );

  const remove = useCallback(async () => {
    if (!targetUserId) throw new Error("targetUserId tidak ada.");
    await adminUserRepo.remove(targetUserId);
  }, [targetUserId]);

  return { loading, refreshing, row, fetchOnce, refresh, update, remove };
}
