export type Role = "user" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  nama_desa: string | null;
  jenis_tanaman: string | null;
  luas_lahan: number | null;
  role: Role;
};
