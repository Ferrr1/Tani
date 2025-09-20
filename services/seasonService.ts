import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  CreateSeasonInput,
  SeasonRow,
  UpdateSeasonInput,
} from "@/types/season";
import { ensureDates } from "@/utils/season";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const seasonRepo = {
  async list(userId: string): Promise<SeasonRow[]> {
    // Hard filter ke user_id selain mengandalkan RLS
    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return (data || []) as SeasonRow[];
  },

  async getById(userId: string, id: string): Promise<SeasonRow | null> {
    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as SeasonRow) ?? null;
  },

  async create(userId: string, input: CreateSeasonInput): Promise<SeasonRow> {
    if (!userId) throw new Error("Tidak ada userId dari AuthContext.");
    if (!Number.isFinite(input.seasonNo) || input.seasonNo < 1) {
      throw new Error("Musim ke- harus angka ≥ 1.");
    }
    ensureDates(input.startDate, input.endDate);

    const payload = {
      user_id: userId,
      season_no: input.seasonNo,
      start_date: input.startDate,
      end_date: input.endDate,
    };

    const { data, error } = await supabase
      .from("seasons")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as SeasonRow;
  },

  async update(userId: string, input: UpdateSeasonInput): Promise<SeasonRow> {
    if (!input.id) throw new Error("ID season wajib diisi.");
    if (
      input.seasonNo != null &&
      (!Number.isFinite(input.seasonNo) || input.seasonNo < 1)
    ) {
      throw new Error("Musim ke- harus angka ≥ 1.");
    }

    if (input.startDate || input.endDate) {
      const { data: current, error: curErr } = await supabase
        .from("seasons")
        .select("start_date, end_date")
        .eq("user_id", userId)
        .eq("id", input.id)
        .maybeSingle();
      if (curErr) throw curErr;

      const start = input.startDate ?? current?.start_date;
      const end = input.endDate ?? current?.end_date;
      if (!start || !end)
        throw new Error("Tanggal mulai/selesai tidak lengkap.");
      ensureDates(start, end);
    }

    const patch: Record<string, any> = {};
    if (input.seasonNo != null) patch.season_no = input.seasonNo;
    if (input.startDate) patch.start_date = input.startDate;
    if (input.endDate) patch.end_date = input.endDate;

    const { data, error } = await supabase
      .from("seasons")
      .update(patch)
      .eq("user_id", userId)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw error;
    return data as SeasonRow;
  },

  async remove(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from("seasons")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw error;
  },
};
export function useSeasonService() {
  const { user, authReady } = useAuth(); // dari AuthContext

  const ensureUser = useCallback(() => {
    if (!authReady) throw new Error("Auth masih loading.");
    if (!user) throw new Error("Tidak ada sesi login.");
    return user;
  }, [authReady, user]);

  return {
    listSeasons: async () => {
      const u = ensureUser();
      return seasonRepo.list(u.id);
    },

    getSeasonById: async (id: string) => {
      const u = ensureUser();
      return seasonRepo.getById(u.id, id);
    },

    createSeason: async (input: CreateSeasonInput) => {
      const u = ensureUser();
      return seasonRepo.create(u.id, input);
    },

    updateSeason: async (input: UpdateSeasonInput) => {
      const u = ensureUser();
      return seasonRepo.update(u.id, input);
    },

    deleteSeason: async (id: string) => {
      const u = ensureUser();
      return seasonRepo.remove(u.id, id);
    },
  };
}
export function useSeasonList() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SeasonRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [year, setYear] = useState<number | "all">("all");

  // guard: jangan fetch paralel
  const inFlight = useRef(false);
  // set default year hanya sekali
  const didSetDefaultYear = useRef(false);
  // mounted guard
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const computeYears = useCallback((items: SeasonRow[]) => {
    const ys = Array.from(
      new Set(
        items.flatMap((r) => {
          const y1 = new Date(r.start_date).getFullYear();
          const y2 = new Date(r.end_date).getFullYear();
          return [y1, y2];
        })
      )
    ).sort((a, b) => b - a);
    return ys;
  }, []);

  const fetchOnce = useCallback(async () => {
    if (!user) {
      // auth belum siap → tunda tanpa fetch
      return;
    }
    if (inFlight.current) return; // cegah duplikasi
    inFlight.current = true;
    try {
      if (mounted.current) setLoadingList(true);
      const data = await seasonRepo.list(user.id);
      if (!mounted.current) return;
      setRows(data);

      if (!didSetDefaultYear.current) {
        const ys = computeYears(data);
        if (ys.length) setYear(ys[0]); // set default tahun terbaru SEKALI
        didSetDefaultYear.current = true;
      }
    } catch (e) {
      console.warn(e);
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoadingList(false);
    }
  }, [user, computeYears]);

  // initial fetch, & setiap kali user berubah
  useEffect(() => {
    // reset flags saat user berubah
    didSetDefaultYear.current = false;
    fetchOnce();
  }, [user, fetchOnce]);

  const refresh = useCallback(async () => {
    if (!user) return;
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (mounted.current) setRefreshing(true);
      const data = await seasonRepo.list(user.id);
      if (!mounted.current) return;
      setRows(data);
      // Saat refresh, JANGAN mengubah 'year' meskipun "all" — biarkan pilihan user
    } catch (e) {
      console.warn(e);
    } finally {
      inFlight.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, [user]);

  const years = useMemo(() => computeYears(rows), [rows, computeYears]);

  const data = useMemo(() => {
    const filtered =
      year === "all"
        ? rows
        : rows.filter((r) => {
            const y1 = new Date(r.start_date).getFullYear();
            const y2 = new Date(r.end_date).getFullYear();
            return y1 === year || y2 === year;
          });

    return filtered.sort(
      (a, b) =>
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [rows, year]);

  return {
    // state untuk UI
    loading: loadingList, // gabungan
    refreshing,
    rows, // full rows kalau kamu butuh mentahnya
    data, // rows yang sudah terfilter & tersort untuk FlatList
    years, // daftar tahun tersedia
    year,
    setYear, // kontrol filter tahun

    // action siap pakai
    fetchOnce, // panggil di useEffect awal (idempotent)
    refresh, // pasang ke onRefresh FlatList
  };
}
