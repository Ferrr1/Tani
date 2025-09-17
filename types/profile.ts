export type Role = "user" | "admin";

export const CROP_OPTIONS: string[] = [
  "Padi",
  "Jagung",
  "Kedelai",
  "Cabai",
  "Bawang Merah",
  "Kopi",
  "Kakao",
  "Tebu",
  "Sawit",
  "Tembakau",
  "Lainnya",
];

export type LoginForm = { email: string; password: string };

export type RegisterForm = {
  fullName: string;
  email: string;
  password: string;
  village: string;
  cropType: string;
  cropTypeOther?: string;
  landAreaHa: string;
};
export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  nama_desa: string | null;
  jenis_tanaman: string | null;
  luas_lahan: number | null;
  role: Role | null;
};
