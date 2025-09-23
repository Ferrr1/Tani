import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/profile";

export async function getMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
    error: uerr,
  } = await supabase.auth.getUser();
  if (uerr || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, nama_desa, luas_lahan, role, created_at, updated_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function updateMyProfile(
  patch: Partial<Pick<Profile, "full_name" | "nama_desa" | "luas_lahan">>
): Promise<Profile> {
  const {
    data: { user },
    error: uerr,
  } = await supabase.auth.getUser();
  if (uerr || !user) throw uerr ?? new Error("Not authenticated");

  // Normalisasi angka & string kosong -> null
  const body: Record<string, any> = { ...patch };
  if ("luas_lahan" in body) {
    const n = Number(body.luas_lahan);
    body.luas_lahan = Number.isFinite(n) && n >= 0 ? n : null;
  }
  ["full_name", "nama_desa"].forEach((k) => {
    if (k in body) {
      const v = (body as any)[k];
      (body as any)[k] = (v ?? "").toString().trim() || null;
    }
  });

  const { data, error } = await supabase
    .from("profiles")
    .update(body)
    .eq("id", user.id)
    .select(
      "id, email, full_name, nama_desa, luas_lahan, role, created_at, updated_at"
    )
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function changeMyPassword(newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password minimal 6 karakter");
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function changeMyEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}
