export interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string;
  created_at: string;
}

export interface ExtractedSkill {
  name: string;
  category: string;
  min_proficiency: number;
  importance: 'Required' | 'Preferred' | 'Nice-to-have';
  weight: number;
  rationale?: string;
}
