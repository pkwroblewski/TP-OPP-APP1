// src/components/pipeline/pipeline-card.tsx
// Card for company in pipeline

'use client';

import { Badge } from '@/components/ui/badge';

export interface PipelineItem {
  id: string;
  company_id: string;
  status: string;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
  updated_at: string;
  company: {
    id: string;
    name: string;
    rcs_number: string;
  };
  analysis?: {
    risk_score: number | null;
    opportunities_count: number | null;
    priority_ranking: string | null;
    company_classification: string | null;
  } | null;
}

interface PipelineCardProps {
  item: PipelineItem;
  onClick?: () => void;
  onStatusChange?: (newStatus: string) => void;
}

export function PipelineCard({ item, onClick, onStatusChange }: PipelineCardProps) {
  const getRiskColor = () => {
    if (!item.analysis?.risk_score) return 'bg-gray-100 text-gray-600';
    if (item.analysis.risk_score >= 67) return 'bg-red-100 text-red-700';
    if (item.analysis.risk_score >= 34) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getPriorityColor = () => {
    switch (item.analysis?.priority_ranking) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const isOverdue = () => {
    if (!item.next_action_date) return false;
    return new Date(item.next_action_date) < new Date();
  };

  return (
    <div
      className={`bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        isOverdue() ? 'border-red-300' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">{item.company.name}</h4>
          <p className="text-xs text-gray-500">{item.company.rcs_number}</p>
        </div>
        {item.analysis?.risk_score !== null && item.analysis?.risk_score !== undefined && (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getRiskColor()}`}
          >
            {item.analysis.risk_score}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-3">
        {item.analysis?.priority_ranking && (
          <Badge className={`text-xs ${getPriorityColor()}`}>
            {item.analysis.priority_ranking}
          </Badge>
        )}
        {item.analysis?.opportunities_count !== null &&
          item.analysis?.opportunities_count !== undefined && (
            <Badge className="text-xs bg-blue-100 text-blue-700">
              {item.analysis.opportunities_count} opp
            </Badge>
          )}
        {item.analysis?.company_classification && (
          <Badge className="text-xs bg-gray-100 text-gray-600">
            {item.analysis.company_classification}
          </Badge>
        )}
      </div>

      {/* Next Action */}
      {item.next_action && (
        <div
          className={`text-xs p-2 rounded ${
            isOverdue() ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
          }`}
        >
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">{item.next_action}</span>
          </div>
          {item.next_action_date && (
            <div className="mt-1">
              {new Date(item.next_action_date).toLocaleDateString()}
              {isOverdue() && <span className="ml-1 font-medium">(Overdue)</span>}
            </div>
          )}
        </div>
      )}

      {/* Quick Status Change */}
      {onStatusChange && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <select
            value={item.status}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs rounded border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="identified">Identified</option>
            <option value="contacted">Contacted</option>
            <option value="meeting">Meeting</option>
            <option value="proposal">Proposal</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      )}
    </div>
  );
}
