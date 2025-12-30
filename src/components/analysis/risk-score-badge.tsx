// src/components/analysis/risk-score-badge.tsx
// Visual risk score display

'use client';

interface RiskScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function RiskScoreBadge({ score, size = 'md', showLabel = true }: RiskScoreBadgeProps) {
  const getColorClass = () => {
    if (score >= 67) return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500' };
    if (score >= 34) return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-500' };
    return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-500' };
  };

  const getLabel = () => {
    if (score >= 67) return 'High Risk';
    if (score >= 34) return 'Medium Risk';
    return 'Low Risk';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return { container: 'w-12 h-12', score: 'text-sm', label: 'text-xs' };
      case 'lg':
        return { container: 'w-24 h-24', score: 'text-3xl', label: 'text-sm' };
      default:
        return { container: 'w-16 h-16', score: 'text-xl', label: 'text-xs' };
    }
  };

  const colors = getColorClass();
  const sizes = getSizeClasses();

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizes.container} ${colors.bg} rounded-full flex items-center justify-center ring-2 ${colors.ring}`}
      >
        <span className={`${sizes.score} font-bold ${colors.text}`}>{score}</span>
      </div>
      {showLabel && (
        <span className={`${sizes.label} font-medium ${colors.text}`}>{getLabel()}</span>
      )}
    </div>
  );
}

interface RiskScoreBarProps {
  score: number;
  className?: string;
}

export function RiskScoreBar({ score, className = '' }: RiskScoreBarProps) {
  const getGradientPosition = () => {
    return Math.min(Math.max(score, 0), 100);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
      <div className="relative h-3 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-full">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-800 shadow-md transition-all"
          style={{ left: `calc(${getGradientPosition()}% - 8px)` }}
        />
      </div>
      <div className="text-center mt-2">
        <span className="text-lg font-bold text-gray-900">{score}</span>
        <span className="text-sm text-gray-500">/100</span>
      </div>
    </div>
  );
}
