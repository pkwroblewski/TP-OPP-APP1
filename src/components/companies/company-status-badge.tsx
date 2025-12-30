// src/components/companies/company-status-badge.tsx
// Status badge component for company extraction/analysis status

import { Badge, type BadgeColor } from '@/components/ui';

export type CompanyStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface StatusConfig {
  color: BadgeColor;
  label: string;
}

const statusConfigs: Record<CompanyStatus, StatusConfig> = {
  pending: { color: 'gray', label: 'Pending' },
  processing: { color: 'yellow', label: 'Processing' },
  completed: { color: 'green', label: 'Completed' },
  failed: { color: 'red', label: 'Failed' },
};

export interface CompanyStatusBadgeProps {
  status: CompanyStatus;
  type?: 'extraction' | 'analysis';
  size?: 'sm' | 'md';
}

export function CompanyStatusBadge({
  status,
  type,
  size = 'sm',
}: CompanyStatusBadgeProps) {
  // Fallback to 'pending' if status is undefined or invalid
  const config = statusConfigs[status] || statusConfigs.pending;
  const label = type ? `${config.label}` : config.label;

  return (
    <Badge color={config.color} size={size} dot>
      {label}
    </Badge>
  );
}

// Helper to determine overall status from extraction and analysis status
export function getOverallStatus(
  extractionStatus: string | null,
  analysisStatus: string | null
): CompanyStatus {
  if (!extractionStatus || extractionStatus === 'pending') {
    return 'pending';
  }
  if (extractionStatus === 'processing') {
    return 'processing';
  }
  if (extractionStatus === 'failed') {
    return 'failed';
  }
  if (extractionStatus === 'completed') {
    if (!analysisStatus || analysisStatus === 'pending') {
      return 'completed'; // Extraction done, analysis pending
    }
    if (analysisStatus === 'processing') {
      return 'processing';
    }
    if (analysisStatus === 'failed') {
      return 'failed';
    }
    return 'completed';
  }
  return 'pending';
}
