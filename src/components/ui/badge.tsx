// src/components/ui/badge.tsx
// Badge/tag component with color and size variants

import { HTMLAttributes } from 'react';

export type BadgeColor = 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  size?: BadgeSize;
  dot?: boolean;
}

const colorStyles: Record<BadgeColor, string> = {
  gray: 'bg-gray-100 text-gray-800',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
};

const dotColorStyles: Record<BadgeColor, string> = {
  gray: 'bg-gray-400',
  green: 'bg-green-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
  blue: 'bg-blue-400',
  purple: 'bg-purple-400',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-sm',
};

export function Badge({
  color = 'gray',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center font-medium rounded-full whitespace-nowrap';

  return (
    <span
      className={`${baseStyles} ${colorStyles[color]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColorStyles[color]}`}
        />
      )}
      {children}
    </span>
  );
}

// Status badge helper for common statuses
export type StatusType =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'ready'
  | 'blocked';

const statusColorMap: Record<StatusType, BadgeColor> = {
  pending: 'gray',
  processing: 'yellow',
  completed: 'green',
  failed: 'red',
  ready: 'blue',
  blocked: 'red',
};

const statusLabelMap: Record<StatusType, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  ready: 'Ready',
  blocked: 'Blocked',
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'color'> {
  status: StatusType;
  customLabel?: string;
}

export function StatusBadge({
  status,
  customLabel,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge color={statusColorMap[status]} dot {...props}>
      {customLabel || statusLabelMap[status]}
    </Badge>
  );
}
