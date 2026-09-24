import React from 'react';
import clsx from 'clsx';

interface ScoreRingProps {
  score: number; // 0 - 100
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showPercentage?: boolean;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 'md',
  label,
  showPercentage = true,
}) => {
  const sizeMap = {
    sm: { dimension: 48, stroke: 4, text: 'text-sm' },
    md: { dimension: 64, stroke: 5, text: 'text-lg font-bold' },
    lg: { dimension: 96, stroke: 7, text: 'text-2xl font-extrabold' },
  };

  const { dimension, stroke, text } = sizeMap[size];
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getStrokeColor = (s: number) => {
    if (s >= 85) return '#00f2fe'; // Cyan
    if (s >= 70) return '#4facfe'; // Blue
    if (s >= 50) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center" style={{ width: dimension, height: dimension }}>
        <svg width={dimension} height={dimension} className="transform -rotate-90">
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={stroke}
            fill="transparent"
          />
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            stroke={getStrokeColor(score)}
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className={clsx('absolute font-mono text-white', text)}>
          {Math.round(score)}{showPercentage && '%'}
        </span>
      </div>
      {label && <span className="text-xs text-slate-400 mt-1 font-medium">{label}</span>}
    </div>
  );
};
