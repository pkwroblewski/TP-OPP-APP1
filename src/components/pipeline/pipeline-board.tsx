// src/components/pipeline/pipeline-board.tsx
// Kanban-style pipeline board

'use client';

import { useState } from 'react';
import { PipelineColumn } from './pipeline-column';
import { PipelineDetailModal } from './pipeline-detail-modal';
import type { PipelineItem } from './pipeline-card';

interface PipelineBoardProps {
  items: PipelineItem[];
  onStatusChange: (itemId: string, newStatus: string) => Promise<void>;
  onItemUpdate: (itemId: string, updates: Partial<PipelineItem>) => Promise<void>;
  onItemDelete: (itemId: string) => Promise<void>;
}

const PIPELINE_STAGES = [
  { status: 'identified', label: 'Identified', color: 'gray' },
  { status: 'contacted', label: 'Contacted', color: 'blue' },
  { status: 'meeting', label: 'Meeting', color: 'purple' },
  { status: 'proposal', label: 'Proposal', color: 'orange' },
  { status: 'won', label: 'Won', color: 'green' },
  { status: 'lost', label: 'Lost', color: 'red' },
];

export function PipelineBoard({
  items,
  onStatusChange,
  onItemUpdate,
  onItemDelete,
}: PipelineBoardProps) {
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const getItemsByStatus = (status: string) => {
    return items.filter((item) => item.status === status);
  };

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      await onStatusChange(itemId, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleItemUpdate = async (itemId: string, updates: Partial<PipelineItem>) => {
    setIsUpdating(true);
    try {
      await onItemUpdate(itemId, updates);
      // Update selected item if it's the one being updated
      if (selectedItem?.id === itemId) {
        setSelectedItem({ ...selectedItem, ...updates });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleItemDelete = async (itemId: string) => {
    setIsUpdating(true);
    try {
      await onItemDelete(itemId);
      setSelectedItem(null);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-6 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const count = getItemsByStatus(stage.status).length;
          return (
            <div
              key={stage.status}
              className="bg-white rounded-lg border p-3 text-center"
            >
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-500">{stage.label}</div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <PipelineColumn
            key={stage.status}
            status={stage.status}
            label={stage.label}
            color={stage.color}
            items={getItemsByStatus(stage.status)}
            onItemClick={(item) => setSelectedItem(item)}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <PipelineDetailModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleItemUpdate}
          onDelete={handleItemDelete}
          onStatusChange={handleStatusChange}
          isUpdating={isUpdating}
        />
      )}
    </>
  );
}
