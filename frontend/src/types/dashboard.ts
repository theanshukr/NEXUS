export interface MetricCardData {
  title: string;
  value: string;
  change?: string;
  change_type?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export interface SkillCoverageData {
  category: string;
  total_skills: number;
  covered_skills: number;
  coverage_percentage: number;
  high_demand_skills: string[];
}

export interface DepartmentReadinessData {
  department: string;
  headcount: number;
  readiness_score: number;
  top_initiative_fit?: string;
}

export interface DashboardOverviewData {
  metrics: MetricCardData[];
  skill_coverage: SkillCoverageData[];
  department_readiness: DepartmentReadinessData[];
  recent_initiatives_count: number;
  top_critical_gaps: string[];
}
