export type DetailForm = {
  fullName: string;
  email: string;
  password?: string; // opsional (hanya update jika diisi)
  village: string;
  cropType: string;
  cropTypeOther?: string;
  landAreaHa: string; // string untuk input, dikonversi saat submit
  motherName?: string;
};
