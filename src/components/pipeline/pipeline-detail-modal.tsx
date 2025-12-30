// src/components/pipeline/pipeline-detail-modal.tsx
// Full detail modal for pipeline item

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/loading';
import type { PipelineItem } from './pipeline-card';

interface PipelineDetailModalProps {
  item: PipelineItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (itemId: string, updates: Partial<PipelineItem>) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onStatusChange: (itemId: string, newStatus: string) => Promise<void>;
  isUpdating: boolean;
}

export function PipelineDetailModal({
  item,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onStatusChange,
  isUpdating,
}: PipelineDetailModalProps) {
  const [notes, setNotes] = useState(item.notes || '');
  const [nextAction, setNextAction] = useState(item.next_action || '');
  const [nextActionDate, setNextActionDate] = useState(
    item.next_action_date ? item.next_action_date.split('T')[0] : ''
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setNotes(item.notes || '');
    setNextAction(item.next_action || '');
    setNextActionDate(item.next_action_date ? item.next_action_date.split('T')[0] : '');
    setHasChanges(false);
  }, [item]);

  useEffect(() => {
    const notesChanged = notes !== (item.notes || '');
    const actionChanged = nextAction !== (item.next_action || '');
    const dateChanged =
      nextActionDate !== (item.next_action_date ? item.next_action_date.split('T')[0] : '');
    setHasChanges(notesChanged || actionChanged || dateChanged);
  }, [notes, nextAction, nextActionDate, item]);

  const handleSave = async () => {
    await onUpdate(item.id, {
      notes: notes || null,
      next_action: nextAction || null,
      next_action_date: nextActionDate || null,
    });
    setHasChanges(false);
  };

  const handleDelete = async () => {
    await onDelete(item.id);
    onClose();
  };

  const getRiskColor = () => {
    if (!item.analysis?.risk_score) return 'text-gray-600';
    if (item.analysis.risk_score >= 67) return 'text-red-600';
    if (item.analysis.risk_score >= 34) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{item.company.name}</h2>
              <p className="text-sm text-gray-500">{item.company.rcs_number}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={item.status}
                onChange={(e) => onStatusChange(item.id, e.target.value)}
                disabled={isUpdating}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="identified">Identified</option>
                <option value="contacted">Contacted</option>
                <option value="meeting">Meeting</option>
                <option value="proposal">Proposal</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {/* Analysis Summary */}
            {item.analysis && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Analysis Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Risk Score</div>
                    <div className={`text-lg font-bold ${getRiskColor()}`}>
                      {item.analysis.risk_score ?? 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Opportunities</div>
                    <div className="text-lg font-bold text-gray-900">
                      {item.analysis.opportunities_count ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Priority</div>
                    <Badge
                      className={
                        item.analysis.priority_ranking === 'high'
                          ? 'bg-red-100 text-red-700'
                          : item.analysis.priority_ranking === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }
                    >
                      {item.analysis.priority_ranking || 'N/A'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Classification</div>
                    <div className="text-sm font-medium text-gray-900">
                      {item.analysis.company_classification || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Link
                    href={`/companies/${item.company_id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Full Analysis
                  </Link>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Add notes about this opportunity..."
              />
            </div>

            {/* Next Action */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Action
                </label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Send proposal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Timestamps */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              <span>Created: {new Date(item.created_at).toLocaleString()}</span>
              <span className="mx-2">|</span>
              <span>Updated: {new Date(item.updated_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Remove from pipeline?</span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isUpdating}
                  >
                    Yes, Remove
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove from Pipeline
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!hasChanges || isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
