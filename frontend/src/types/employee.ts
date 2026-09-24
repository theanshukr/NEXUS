import { Skill } from './skill';

export interface EmployeeSkill {
  id: string;
  skill_id: string;
  skill: Skill;
  proficiency: number;
  years_experience: number;
  verified: boolean;
  last_used?: string;
  evidence_count: number;
}

export interface EmployeeProject {
  id: string;
  project_id: string;
  role: string;
  technologies_used: string[];
  outcomes?: string;
  start_date?: string;
  end_date?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  seniority: string;
  years_experience: number;
  availability: 'Available' | 'Partially Available' | 'Allocated';
  location?: string;
  bio?: string;
  certifications: string[];
  created_at: string;
  updated_at?: string;
  skills: EmployeeSkill[];
  projects: EmployeeProject[];
}

export interface EmployeeListItem {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  seniority: string;
  years_experience: number;
  availability: string;
  location?: string;
  bio?: string;
  certifications: string[];
  created_at: string;
  skills_count: number;
  top_skills: string[];
}
