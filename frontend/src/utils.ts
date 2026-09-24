export const getProgressColor = (progress: number): string => {
  if (progress >= 100) return '#10b981'; // Emerald
  if (progress >= 75) return '#38bdf8';  // Sky Blue
  if (progress >= 50) return '#8b5cf6';  // Violet
  if (progress >= 25) return '#f59e0b';  // Amber
  return '#ef4444';                      // Red
};

export const getUsageColor = (usage: number): string => {
  if (usage >= 90) return '#ef4444'; // Red (Critical)
  if (usage >= 75) return '#f59e0b'; // Amber (Warning)
  if (usage >= 50) return '#8b5cf6'; // Violet
  if (usage >= 25) return '#38bdf8'; // Sky Blue
  return '#10b981';                  // Emerald (Healthy)
};
