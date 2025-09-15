import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

// ---- Ambil dari app.config.ts -> extra ----
type Extra = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const SUPABASE_URL =
  extra.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_ANON_KEY =
  extra.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// (Opsional) warning ramah saat dev
if (__DEV__ && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.warn(
    "[supabase] SUPABASE_URL/ANON_KEY belum di-set. " +
      "Isi di app.config.ts -> extra atau pakai EXPO_PUBLIC_* env."
  );
}

// ---- Singleton client ----
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: Platform.OS === "web" ? undefined : (AsyncStorage as any),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return _client;
}

export const supabase = getSupabase();
