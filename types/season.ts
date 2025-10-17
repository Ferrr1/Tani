export const SEASON_NO_OPTIONS = ["1", "2", "3"] as const;

export const CROP_OPTIONS: string[] = [
  "pakcoi",
  "selada air",
  "sawi",
  "kangkung",
  "jagung",
  "bayam",
  "terong",
  "cabai",
  "labu siam",
  "timun",
  "buncis",
  "kacang Panjang",
  "ubijalar",
  "seledri",
  "daun bawang",
  "kacang merah",
  "edamame",
];

export type SeasonFormValues = {
  seasonNo: string; // "1", "2"
  cropType: string;
  cropTypeOther?: string;
  startDate: string;
  endDate: string;
  seasonYear: string;
};

export type SeasonRow = {
  id: string;
  user_id: string;
  season_no: number;
  season_year: string | null;
  crop_type: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
};

export type CreateSeasonInput = {
  seasonNo: number;
  cropType: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  seasonYear?: string;
};

export type UpdateSeasonInput = {
  id: string;
  seasonNo?: number;
  cropType: string[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  seasonYear?: string;
};
