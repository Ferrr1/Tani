// services/superAdminUserService.ts
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Role } from "@/types/profile";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ===== Types ===== */
export type SuperAdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  nama_desa: string | null;
  luas_lahan: number | null;
  role: Role;
  created_at: string;
  updated_at: string;
};

export type SuperAdminCreateUserInput = {
  email: string;
  password: string;
  fullName?: string;
  namaDesa?: string;
  luasLahan?: number; // hanya dipakai untuk role "user"
  role: Role; // "user" | "admin" | "superadmin"
};

export type SuperAdminUpdateUserInput = {
  targetUserId: string;
  newEmail?: string;
  newPassword?: string;
  newFullName?: string;
  newNamaDesa?: string;
  newLuasLahan?: number;
  newRole: Role;
};

export type SuperAdminListUsersOpts = {
  q?: string;
  limit?: number;
  offset?: number;
};

type DeleteUserResult = { selfDelete: boolean };

/** ===== Repo ===== */
export const superAdminUserRepo = {
  async list(opts?: SuperAdminListUsersOpts): Promise<SuperAdminUserRow[]> {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    let q = supabase
      .from("profiles")
      .select("*")
      .neq("role", "superadmin") // superadmin tidak ditampilkan
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (opts?.q && opts.q.trim()) {
      const key = `%${opts.q.trim()}%`;
      q = q.or(
        [
          `full_name.ilike.${key}`,
          `email.ilike.${key}`,
          `nama_desa.ilike.${key}`,
        ].join(",")
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as SuperAdminUserRow[];
  },

  async getById(id: string): Promise<SuperAdminUserRow | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as SuperAdminUserRow) ?? null;
  },

  async create(input: SuperAdminCreateUserInput): Promise<SuperAdminUserRow> {
    const { email, password, fullName, role } = input;

    // Enforce per-role: non-user => null fields
    const namaDesa = role === "user" ? input.namaDesa ?? null : null;
    const luasLahan =
      role === "user" && typeof input.luasLahan === "number"
        ? input.luasLahan
        : null;

    const { data, error } = await supabase.functions.invoke(
      "admin-create-user",
      {
        body: {
          email,
          password,
          fullName: fullName ?? null,
          namaDesa,
          luasLahan,
          role,
        },
      }
    );

    if (error) {
      if (error instanceof FunctionsHttpError) {
        const payload = await error.context.json().catch(() => ({} as any));
        throw new Error(payload?.error || "Gagal membuat user");
      }
      if (
        error instanceof FunctionsRelayError ||
        error instanceof FunctionsFetchError
      ) {
        throw new Error(error.message || "Gagal membuat user");
      }
      throw error;
    }

    const row: SuperAdminUserRow =
      (data?.user as SuperAdminUserRow) ?? (data as SuperAdminUserRow);

    if (!row || !row.id) {
      throw new Error("Respon pembuatan user tidak valid.");
    }
    return row;
  },

  async update(input: SuperAdminUpdateUserInput): Promise<void> {
    const {
      targetUserId,
      newEmail,
      newPassword,
      newFullName,
      newNamaDesa,
      newLuasLahan,
      newRole,
    } = input;

    // 1) Update email/password via Edge Function bila ada perubahan
    if (newEmail || newPassword) {
      const { data, error } = await supabase.functions.invoke(
        "admin-update-user",
        {
          body: { targetUserId, newEmail, newPassword },
        }
      );
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const payload = await error.context.json().catch(() => ({} as any));
          throw new Error(payload?.error || "Gagal memperbarui email/password");
        }
        if (
          error instanceof FunctionsRelayError ||
          error instanceof FunctionsFetchError
        ) {
          throw new Error(error.message || "Gagal memperbarui email/password");
        }
        throw error;
      }
      if (data && data.ok === false) {
        throw new Error(data?.error || "Gagal memperbarui email/password");
      }
    }

    // 2) Update profil via RPC, patuhi aturan per-role:
    //    jika role !== 'user' maka nama_desa & luas_lahan = null
    const roleIsUser = newRole === "user";
    const namaDesaFinal = roleIsUser ? newNamaDesa ?? null : null;
    const luasLahanFinal = roleIsUser ? newLuasLahan ?? null : null;

    const { error: eRpc } = await supabase.rpc("admin_update_profile_only", {
      target_user_id: targetUserId,
      new_full_name: newFullName ?? null,
      new_nama_desa: namaDesaFinal,
      new_luas_lahan: luasLahanFinal,
      new_role: newRole,
    });
    if (eRpc) throw eRpc;
  },

  async remove(targetUserId: string): Promise<DeleteUserResult> {
    const { data, error } = await supabase.functions.invoke(
      "admin-delete-user",
      {
        body: { targetUserId },
      }
    );

    if (error) {
      if (error instanceof FunctionsHttpError) {
        const payload = await error.context.json().catch(() => ({} as any));
        throw new Error(payload?.error || "Gagal menghapus user");
      }
      if (
        error instanceof FunctionsRelayError ||
        error instanceof FunctionsFetchError
      ) {
        throw new Error(error.message || "Gagal menghapus user");
      }
      throw error;
    }

    if (!data?.ok) {
      throw new Error(data?.error || "Gagal menghapus user");
    }

    return { selfDelete: Boolean(data.selfDelete) };
  },
};

/** ===== Hooks ===== */
export function useSuperAdminUserService() {
  const { user, authReady, role } = useAuth();

  const ensureSuperadmin = useCallback(() => {
    if (!authReady) throw new Error("Auth belum siap.");
    if (!user) throw new Error("Tidak ada sesi login.");
    if (role !== "superadmin")
      throw new Error("Hanya superadmin yang diizinkan.");
    return user;
  }, [authReady, user, role]);

  const listUsers = useCallback(
    (opts?: SuperAdminListUsersOpts) => {
      ensureSuperadmin();
      return superAdminUserRepo.list(opts);
    },
    [ensureSuperadmin]
  );

  const getUserById = useCallback(
    (id: string) => {
      ensureSuperadmin();
      return superAdminUserRepo.getById(id);
    },
    [ensureSuperadmin]
  );

  const createUser = useCallback(
    (input: SuperAdminCreateUserInput) => {
      ensureSuperadmin();
      return superAdminUserRepo.create(input);
    },
    [ensureSuperadmin]
  );

  const updateUser = useCallback(
    (input: SuperAdminUpdateUserInput) => {
      ensureSuperadmin();
      return superAdminUserRepo.update(input);
    },
    [ensureSuperadmin]
  );

  const deleteUser = useCallback(
    (id: string) => {
      ensureSuperadmin();
      return superAdminUserRepo.remove(id); // -> Promise<{ selfDelete: boolean }>
    },
    [ensureSuperadmin]
  );

  return useMemo(
    () => ({
      authReady,
      listUsers,
      getUserById,
      createUser,
      updateUser,
      deleteUser, // kembalikan { selfDelete }
    }),
    [authReady, listUsers, getUserById, createUser, updateUser, deleteUser]
  );
}

export function useSuperAdminUserList(initialQ = "", initialLimit = 50) {
  const [rows, setRows] = useState<SuperAdminUserRow[]>([]);
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
      const data = await superAdminUserRepo.list({ q, limit, offset });
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
      const data = await superAdminUserRepo.list({ q, limit, offset });
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

export function useSuperAdminUserDetail(targetUserId?: string) {
  const [row, setRow] = useState<SuperAdminUserRow | null>(null);
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
      const data = await superAdminUserRepo.getById(targetUserId);
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
      const data = await superAdminUserRepo.getById(targetUserId);
      if (!mounted.current) return;
      setRow(data);
    } finally {
      inFlight.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, [targetUserId]);

  const update = useCallback(
    async (input: Omit<SuperAdminUpdateUserInput, "targetUserId">) => {
      if (!targetUserId) throw new Error("targetUserId tidak ada.");
      await superAdminUserRepo.update({ targetUserId, ...input });
      await refresh();
    },
    [targetUserId, refresh]
  );

  const remove = useCallback(async () => {
    if (!targetUserId) throw new Error("targetUserId tidak ada.");
    // kembalikan selfDelete ke caller (UI)
    const res = await superAdminUserRepo.remove(targetUserId);
    return res; // { selfDelete: boolean }
  }, [targetUserId]);

  return { loading, refreshing, row, fetchOnce, refresh, update, remove };
}
