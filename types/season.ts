export type SeasonFormValues = {
  seasonNo: string; // "1", "2"
  startDate: string;
  endDate: string;
};

export type SeasonRow = {
  id: string;
  user_id: string;
  season_no: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
};

export type CreateSeasonInput = {
  seasonNo: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export type UpdateSeasonInput = {
  id: string;
  seasonNo?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
};
