// src/components/ui/card.tsx
// Card component with optional header and footer

import { HTMLAttributes, ReactNode } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  const baseStyles =
    'bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden';

  return (
    <div className={`${baseStyles} ${className}`} {...props}>
      <div className={paddingStyles[padding]}>{children}</div>
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className = '',
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between border-b border-gray-200 px-4 py-3 sm:px-6 ${className}`}
      {...props}
    >
      <div>
        {title && (
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
        {children}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-4 py-4 sm:px-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = '',
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={`border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
