export type UserRole = 'admin' | 'project_owner';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  owner_email: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectField {
  id: string;
  project_id: string;
  field_name: string;
  field_value: string;
  status: 'Confirmed' | 'Not Confirmed' | 'Might Still Change';
  updated_at: string;
}

export interface FAQ {
  id: string;
  project_id: string;
  question: string;
  answer: string;
}

export interface QuizQuestion {
  id: string;
  project_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
}