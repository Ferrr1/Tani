export type Role = "user" | "admin" | "superadmin";

export type LoginForm = { email: string; password: string };

export type RegisterForm = {
  fullName: string;
  motherName: string;
  email: string;
  password: string;
  village: string;
  landAreaHa: string;
};
export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  nama_desa: string | null;
  luas_lahan: number | null;
  role: Role | null;
};
