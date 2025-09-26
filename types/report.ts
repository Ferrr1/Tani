import { Colors } from "@/constants/theme";

export const CATEGORY_LABEL_REPORT: Record<string, string> = {
  seed: "Benih",
  seedling: "Bibit",
  fertilizer: "Pupuk",
  insecticide: "Insektisida",
  herbicide: "Herbisida",
  fungicide: "Fungisida",
  land_rent: "Sewa Lahan",
  transport: "Transportasi",
  labor_outside: "TK Luar Keluarga",
  tax: "Pajak",
};

export type Theme = (typeof Colors)["light"];
