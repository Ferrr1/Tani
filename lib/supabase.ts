// src/lib/supabase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import "react-native-url-polyfill/auto";

export const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL as string;
export const supabaseAnonKey = Constants.expoConfig?.extra
  ?.SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN: tidak ada URL fragment seperti web
  },
});
