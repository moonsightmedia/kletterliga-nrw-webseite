export type UserRole = "guest" | "participant" | "gym_admin" | "league_admin";

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  gender: "m" | "w" | null;
  home_gym_id: string | null;
  league: "toprope" | "lead" | null;
  role: UserRole | null;
};

export type Gym = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  website: string | null;
  logo_url: string | null;
  opening_hours: string | null;
};

export type Route = {
  id: string;
  gym_id: string;
  discipline: "toprope" | "lead";
  code: string;
  name: string | null;
  setter: string | null;
  color: string | null;
  grade_range: string | null;
  active: boolean;
};

export type Result = {
  id: string;
  profile_id: string;
  route_id: string;
  points: number;
  flash: boolean;
  status: string | null;
  created_at: string;
};

export type ChangeRequest = {
  id: string;
  profile_id: string;
  email: string | null;
  current_league: string | null;
  current_gender: string | null;
  requested_league: string | null;
  requested_gender: string | null;
  message: string | null;
  status: string | null;
  created_at: string;
};

export type GymCode = {
  id: string;
  gym_id: string;
  code: string;
  status: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type GymAdmin = {
  id: string;
  profile_id: string;
  gym_id: string;
  created_at: string;
};

export type Stage = {
  key: string;
  label: string;
  start: string;
  end: string;
};

export type AdminSettings = {
  id: string;
  season_year: string | null;
  qualification_start: string | null;
  qualification_end: string | null;
  stage_months: string[] | null;
  age_u16_max: number | null;
  age_u40_min: number | null;
  age_cutoff_date: string | null;
  class_labels: Record<string, string> | null;
  finale_enabled: boolean | null;
  finale_date: string | null;
  finale_registration_deadline: string | null;
  top_30_per_class: number | null;
  wildcards_per_class: number | null;
  preparation_start: string | null;
  preparation_end: string | null;
  stages: Stage[] | null;
  updated_at: string;
};

export type ProfileOverride = {
  id: string;
  profile_id: string;
  override_league: string | null;
  override_gender: string | null;
  override_class: string | null;
  reason: string | null;
  created_at: string;
};

export type FinaleRegistration = {
  id: string;
  profile_id: string;
  created_at: string;
};
