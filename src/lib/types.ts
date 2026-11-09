import type { PaperStatus, PaperType, ReadMethod, SubmissionStatus, VenueType } from "./constants";

export type Role = "admin" | "member";

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  research_area: string | null;
  bio: string | null;
  role: Role;
  is_active: boolean;
  must_change_password: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

/** Minimal author info joined onto papers / submissions. */
export type ProfileLite = Pick<Profile, "id" | "username" | "full_name" | "avatar_url">;

export interface Topic {
  id: string;
  name: string;
  color: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Paper {
  id: string;
  user_id: string;
  title: string;
  authors: string | null;
  year: number | null;
  venue: string | null;
  doi_url: string | null;
  pdf_path: string | null;
  paper_type: PaperType;
  status: PaperStatus;
  date_read: string | null;
  read_method: ReadMethod | null;
  time_spent_minutes: number | null;
  summary: string | null;
  key_contributions: string | null;
  methodology: string | null;
  results: string | null;
  limitations: string | null;
  notes: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

/** Paper as returned by PAPER_SELECT (author + topics joined). */
export interface PaperWithRelations extends Paper {
  author: ProfileLite | null;
  topics: Topic[];
}

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  website: string | null;
  location: string | null;
  field: string | null;
  abstract_deadline: string | null;
  submission_deadline: string | null;
  notification_date: string | null;
  camera_ready_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  venue_id: string;
  user_id: string;
  paper_title: string;
  status: SubmissionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionWithRelations extends Submission {
  author: ProfileLite | null;
  venue?: Pick<Venue, "id" | "name" | "type"> | null;
}

export interface AppSettings {
  id: number;
  allow_member_venues: boolean;
  lab_name: string;
}

export interface PasswordResetRequest {
  id: string;
  username: string;
  user_id: string | null;
  note: string | null;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}
