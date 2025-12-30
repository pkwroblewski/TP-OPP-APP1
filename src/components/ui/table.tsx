// src/components/ui/table.tsx
// Table components with sortable header support

import { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';

// Icons for sorting
function SortIcon({ direction }: { direction?: 'asc' | 'desc' | null }) {
  if (!direction) {
    return (
      <svg
        className="w-4 h-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }

  if (direction === 'asc') {
    return (
      <svg
        className="w-4 h-4 text-gray-700"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-4 h-4 text-gray-700"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  compact?: boolean;
}

export function Table({ compact = false, className = '', children, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className={`min-w-full divide-y divide-gray-200 ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function TableHeader({
  className = '',
  children,
  ...props
}: TableHeaderProps) {
  return (
    <thead className={`bg-gray-50 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function TableBody({
  className = '',
  children,
  ...props
}: TableBodyProps) {
  return (
    <tbody
      className={`bg-white divide-y divide-gray-200 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
  selected?: boolean;
}

export function TableRow({
  hoverable = true,
  selected = false,
  className = '',
  children,
  ...props
}: TableRowProps) {
  const hoverClass = hoverable ? 'hover:bg-gray-50' : '';
  const selectedClass = selected ? 'bg-blue-50' : '';

  return (
    <tr className={`${hoverClass} ${selectedClass} ${className}`} {...props}>
      {children}
    </tr>
  );
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export function TableHead({
  sortable = false,
  sortDirection,
  onSort,
  className = '',
  children,
  ...props
}: TableHeadProps) {
  const baseStyles =
    'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';

  const sortableStyles = sortable
    ? 'cursor-pointer hover:bg-gray-100 select-none'
    : '';

  return (
    <th
      className={`${baseStyles} ${sortableStyles} ${className}`}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && <SortIcon direction={sortDirection} />}
      </div>
    </th>
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  truncate?: boolean;
}

export function TableCell({
  truncate = false,
  className = '',
  children,
  ...props
}: TableCellProps) {
  const baseStyles = 'px-4 py-3 text-sm text-gray-900';
  const truncateStyles = truncate ? 'truncate max-w-xs' : '';

  return (
    <td className={`${baseStyles} ${truncateStyles} ${className}`} {...props}>
      {children}
    </td>
  );
}

// Empty state component for tables
export interface TableEmptyProps {
  message?: string;
  colSpan?: number;
}

export function TableEmpty({
  message = 'No data available',
  colSpan = 1,
}: TableEmptyProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-sm text-gray-500"
      >
        {message}
      </td>
    </tr>
  );
}
