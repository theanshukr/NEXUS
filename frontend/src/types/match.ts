import { Employee } from './employee';
import { Skill } from './skill';

export interface MatchSkill {
  id: string;
  skill_id: string;
  skill: Skill;
  required_proficiency: number;
  employee_proficiency: number;
  match_type: 'Direct' | 'Transferable' | 'Partial' | 'Missing';
  score: number;
}

export interface GapSummary {
  covered_skills: string[];
  partial_skills: string[];
  missing_skills: string[];
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  upskilling_recommendations: string[];
}

export interface Match {
  id: string;
  initiative_id: string;
  employee_id: string;
  employee: Employee;
  overall_score: number;
  skill_score: number;
  semantic_score: number;
  experience_score: number;
  evidence_score: number;
  rank?: number;
  explanation?: string;
  gap_summary: GapSummary;
  evidence_items?: Array<{
    type: string;
    name: string;
    role: string;
    tech: string[];
  }>;
  created_at: string;
  match_skills: MatchSkill[];
}
