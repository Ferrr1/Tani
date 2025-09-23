// types/information.ts

/** Row seperti yang tersimpan di DB (mis. Supabase). */
export interface InformationRow {
  id: string;
  title: string;
  description: string;
  note?: string | null; // opsional
  is_active: boolean; // buat hide/show tanpa hapus
  sort_index: number; // urutan tampil di screen
  created_at: string; // ISO
  updated_at: string; // ISO
}

/** Payload untuk create (admin). */
export type CreateInformationInput = {
  title: string;
  description: string;
  note?: string | null;
  isActive?: boolean; // default true
};

/** Payload untuk update (admin). */
export type UpdateInformationInput = {
  id: string;
  title?: string;
  description?: string;
  note?: string | null;
  isActive?: boolean;
};

/** Filter opsional saat ambil list (untuk service). */
export type InformationListParams = {
  q?: string; // search judul/desc
  isActive?: boolean; // default true
};

/** Bentuk data yang dipakai di UI (frontend friendly). */
export type InformationCard = {
  id: string;
  title: string;
  description: string;
  note?: string | null;
};
