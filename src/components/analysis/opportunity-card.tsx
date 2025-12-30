// src/components/analysis/opportunity-card.tsx
// Card for displaying individual TP opportunities

'use client';

import { useState } from 'react';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TPOpportunity } from '@/lib/types/analysis';

interface OpportunityCardProps {
  opportunity: TPOpportunity;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityConfig = () => {
    switch (opportunity.severity) {
      case 'high':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-l-red-500',
          badgeClass: 'bg-red-100 text-red-700',
          icon: (
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case 'medium':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-l-yellow-500',
          badgeClass: 'bg-yellow-100 text-yellow-700',
          icon: (
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-l-blue-500',
          badgeClass: 'bg-blue-100 text-blue-700',
          icon: (
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
    }
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      zero_spread: 'Zero Spread',
      thin_cap: 'Thin Capitalization',
      unremunerated_guarantee: 'Unremunerated Guarantee',
      undocumented_services: 'Undocumented Services',
      pricing_anomaly: 'Pricing Anomaly',
      missing_documentation: 'Missing Documentation',
      related_party_flag: 'Related Party Issue',
      substance_concern: 'Substance Concern',
      maturity_mismatch: 'Maturity Mismatch',
      soparfi_substance_risk: 'SOPARFI Substance Risk',
      circular_56_1_concern: 'Circular 56/1 Concern',
    };
    return labels[type] || type;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const config = getSeverityConfig();

  return (
    <Card className={`${config.bgColor} border-l-4 ${config.borderColor}`}>
      <CardBody>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">{config.icon}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={config.badgeClass}>{opportunity.severity.toUpperCase()}</Badge>
                <Badge className="bg-gray-100 text-gray-600">{getTypeLabel(opportunity.type)}</Badge>
              </div>
              {opportunity.affected_amount !== null && (
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(opportunity.affected_amount)}
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className="font-semibold text-gray-900 mb-1">{opportunity.title}</h4>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-3">{opportunity.description}</p>

            {/* Data References */}
            {opportunity.data_references && opportunity.data_references.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {opportunity.data_references.map((ref, index) => (
                  <span
                    key={index}
                    className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            )}

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              {isExpanded ? 'Show less' : 'Show details'}
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                {/* Recommendation */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Recommendation</h5>
                  <p className="text-sm text-gray-600">{opportunity.recommendation}</p>
                </div>

                {/* Potential Adjustment */}
                {opportunity.potential_adjustment !== null && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Potential Adjustment</h5>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(opportunity.potential_adjustment)}
                    </p>
                  </div>
                )}

                {/* Regulatory Reference */}
                {opportunity.regulatory_reference && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Regulatory Reference</h5>
                    <p className="text-sm text-gray-600">{opportunity.regulatory_reference}</p>
                  </div>
                )}

                {/* Substance Indicators */}
                {opportunity.substance_indicators && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Substance Indicators</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {opportunity.substance_indicators.ic_debt_amount !== undefined && (
                        <div>
                          <span className="text-gray-500">IC Debt:</span>{' '}
                          {formatCurrency(opportunity.substance_indicators.ic_debt_amount)}
                        </div>
                      )}
                      {opportunity.substance_indicators.staff_costs !== undefined && (
                        <div>
                          <span className="text-gray-500">Staff Costs:</span>{' '}
                          {formatCurrency(opportunity.substance_indicators.staff_costs)}
                        </div>
                      )}
                      {opportunity.substance_indicators.employee_count !== undefined && (
                        <div>
                          <span className="text-gray-500">Employees:</span>{' '}
                          {opportunity.substance_indicators.employee_count}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Readiness Level */}
                {opportunity.generated_at_readiness_level && (
                  <div className="text-xs text-gray-400">
                    Generated at: {opportunity.generated_at_readiness_level}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
