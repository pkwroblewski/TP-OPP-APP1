// src/components/pipeline/pipeline-column.tsx
// Single column in the pipeline board

'use client';

import { PipelineCard, type PipelineItem } from './pipeline-card';

interface PipelineColumnProps {
  status: string;
  label: string;
  items: PipelineItem[];
  color: string;
  onItemClick?: (item: PipelineItem) => void;
  onStatusChange?: (itemId: string, newStatus: string) => void;
}

export function PipelineColumn({
  status,
  label,
  items,
  color,
  onItemClick,
  onStatusChange,
}: PipelineColumnProps) {
  const getHeaderColor = () => {
    switch (color) {
      case 'gray':
        return 'bg-gray-100 border-gray-300';
      case 'blue':
        return 'bg-blue-100 border-blue-300';
      case 'purple':
        return 'bg-purple-100 border-purple-300';
      case 'orange':
        return 'bg-orange-100 border-orange-300';
      case 'green':
        return 'bg-green-100 border-green-300';
      case 'red':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      {/* Column Header */}
      <div className={`px-3 py-2 rounded-t-lg border-t-4 ${getHeaderColor()}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{label}</h3>
          <span className="bg-white px-2 py-0.5 rounded-full text-sm font-medium text-gray-600">
            {items.length}
          </span>
        </div>
      </div>

      {/* Column Body */}
      <div className="bg-gray-50 rounded-b-lg p-2 min-h-[400px] space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <PipelineCard
              key={item.id}
              item={item}
              onClick={() => onItemClick?.(item)}
              onStatusChange={(newStatus) => onStatusChange?.(item.id, newStatus)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            No items
          </div>
        )}
      </div>
    </div>
  );
}
