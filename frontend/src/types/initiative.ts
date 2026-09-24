import { Skill, ExtractedSkill } from './skill';

export interface InitiativeSkill {
  id: string;
  skill_id: string;
  skill: Skill;
  min_proficiency: number;
  importance: 'Required' | 'Preferred' | 'Nice-to-have';
  weight: number;
  source: string;
}

export interface Initiative {
  id: string;
  title: string;
  description: string;
  business_unit?: string;
  status: 'Draft' | 'Analyzing' | 'Active' | 'Staffed' | 'Completed';
  target_start_date?: string;
  target_end_date?: string;
  team_size: number;
  created_by?: string;
  raw_requirements?: string;
  created_at: string;
  updated_at?: string;
  required_skills: InitiativeSkill[];
}

export interface AnalyzeInitiativeResponse {
  title: string;
  summary: string;
  complexity_level: string;
  estimated_roles: string[];
  suggested_skills: ExtractedSkill[];
}
