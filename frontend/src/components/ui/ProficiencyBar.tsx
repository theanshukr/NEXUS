import React from 'react';
import clsx from 'clsx';

interface ProficiencyBarProps {
  level: number; // 1 - 5
  maxLevel?: number;
  label?: string;
  verified?: boolean;
  className?: string;
}

export const ProficiencyBar: React.FC<ProficiencyBarProps> = ({
  level,
  maxLevel = 5,
  label,
  verified = false,
  className,
}) => {
  const percentage = (level / maxLevel) * 100;

  const getColor = (lvl: number) => {
    if (lvl >= 4) return 'bg-gradient-to-r from-cyan-400 to-blue-500';
    if (lvl === 3) return 'bg-gradient-to-r from-blue-400 to-indigo-500';
    return 'bg-gradient-to-r from-amber-400 to-orange-500';
  };

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            {label}
            {verified && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" title="Verified Skill" />
            )}
          </span>
          <span className="text-slate-400 font-mono">
            Level {level}/{maxLevel}
          </span>
        </div>
      )}
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', getColor(level))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
