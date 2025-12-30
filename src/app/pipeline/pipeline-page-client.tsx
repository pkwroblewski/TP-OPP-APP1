// src/app/pipeline/pipeline-page-client.tsx
// Client-side pipeline page with interactive features

'use client';

import { useState, useMemo } from 'react';
import { PipelineBoard, type PipelineItem } from '@/components/pipeline';
import { Button } from '@/components/ui/button';

interface PipelinePageClientProps {
  initialItems: PipelineItem[];
}

type StatusFilter = 'all' | 'identified' | 'contacted' | 'meeting' | 'proposal' | 'won' | 'lost';
type RiskFilter = 'all' | 'high' | 'medium' | 'low';

export function PipelinePageClient({ initialItems }: PipelinePageClientProps) {
  const [items, setItems] = useState<PipelineItem[]>(initialItems);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Apply filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Risk filter
      if (riskFilter !== 'all') {
        const riskScore = item.analysis?.risk_score ?? null;
        if (riskFilter === 'high' && (riskScore === null || riskScore < 67)) return false;
        if (riskFilter === 'medium' && (riskScore === null || riskScore < 34 || riskScore >= 67)) return false;
        if (riskFilter === 'low' && (riskScore === null || riskScore >= 34)) return false;
      }

      return true;
    });
  }, [items, statusFilter, riskFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {
      identified: 0,
      contacted: 0,
      meeting: 0,
      proposal: 0,
      won: 0,
      lost: 0,
    };

    let highRisk = 0;
    let mediumRisk = 0;
    let lowRisk = 0;

    items.forEach((item) => {
      if (byStatus[item.status] !== undefined) {
        byStatus[item.status]++;
      }

      const riskScore = item.analysis?.risk_score ?? null;
      if (riskScore !== null) {
        if (riskScore >= 67) highRisk++;
        else if (riskScore >= 34) mediumRisk++;
        else lowRisk++;
      }
    });

    return {
      total: items.length,
      byStatus,
      highRisk,
      mediumRisk,
      lowRisk,
      active: items.length - byStatus.won - byStatus.lost,
    };
  }, [items]);

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pipeline/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, status: newStatus, updated_at: new Date().toISOString() } : item
          )
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemUpdate = async (itemId: string, updates: Partial<PipelineItem>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pipeline/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: updates.notes,
          nextAction: updates.next_action,
          nextActionDate: updates.next_action_date,
        }),
      });

      if (response.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ...updates,
                  updated_at: new Date().toISOString(),
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemDelete = async (itemId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pipeline/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setRiskFilter('all');
  };

  const hasFilters = statusFilter !== 'all' || riskFilter !== 'all';

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No opportunities in pipeline</h3>
        <p className="text-gray-500 mb-6">
          Analyze companies to find transfer pricing opportunities, then add them to your pipeline.
        </p>
        <a href="/companies">
          <Button variant="primary">Browse Companies</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total in Pipeline</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          <div className="text-sm text-gray-500">Active Opportunities</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-red-600">{stats.highRisk}</div>
          <div className="text-sm text-gray-500">High Risk</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.mediumRisk}</div>
          <div className="text-sm text-gray-500">Medium Risk</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">{stats.lowRisk}</div>
          <div className="text-sm text-gray-500">Low Risk</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="identified">Identified</option>
              <option value="contacted">Contacted</option>
              <option value="meeting">Meeting</option>
              <option value="proposal">Proposal</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Risk Level</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
              className="rounded border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High (67+)</option>
              <option value="medium">Medium (34-66)</option>
              <option value="low">Low (0-33)</option>
            </select>
          </div>

          {hasFilters && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}

          {hasFilters && (
            <div className="flex items-end text-sm text-gray-500">
              Showing {filteredItems.length} of {items.length} items
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Board */}
      {filteredItems.length > 0 ? (
        <PipelineBoard
          items={filteredItems}
          onStatusChange={handleStatusChange}
          onItemUpdate={handleItemUpdate}
          onItemDelete={handleItemDelete}
        />
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No items match your filters.</p>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
            Clear Filters
          </Button>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </div>
      )}
    </div>
  );
}
