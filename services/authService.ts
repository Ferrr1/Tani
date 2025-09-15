import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";

const AUTH_TOKEN_KEY = "auth-token";

export async function restoreSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session;

  const raw = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (!raw) return null;

  try {
    const stored: Session = JSON.parse(raw);

    if (!stored?.access_token || !stored?.refresh_token) {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }

    const { data: setRes, error: setErr } = await supabase.auth.setSession({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
    });
    if (setErr) {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }

    if (setRes.session) {
      await AsyncStorage.setItem(
        AUTH_TOKEN_KEY,
        JSON.stringify(setRes.session)
      );
      return setRes.session;
    }

    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  } catch {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  }
}
