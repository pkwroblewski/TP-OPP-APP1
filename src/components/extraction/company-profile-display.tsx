// src/components/extraction/company-profile-display.tsx
// Displays extracted company profile information

'use client';

import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CompanyProfile } from '@/lib/parser';

interface CompanyProfileDisplayProps {
  profile: CompanyProfile;
}

export function CompanyProfileDisplay({ profile }: CompanyProfileDisplayProps) {
  const getSizeColor = () => {
    switch (profile.company_size) {
      case 'LARGE':
        return 'bg-purple-100 text-purple-700';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-700';
      case 'SMALL':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getAccountTypeLabel = () => {
    switch (profile.account_type) {
      case 'FULL':
        return 'Full Accounts';
      case 'ABRIDGED':
        return 'Abridged Accounts';
      case 'ABBREVIATED':
        return 'Abbreviated Accounts';
      default:
        return profile.account_type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Company Information</h3>
            <div className="flex gap-2">
              <Badge className={getSizeColor()}>{profile.company_size}</Badge>
              <Badge className="bg-gray-100 text-gray-700">{getAccountTypeLabel()}</Badge>
              <Badge className="bg-gray-100 text-gray-700">{profile.reporting_standard}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoItem label="Company Name" value={profile.name} />
            <InfoItem label="RCS Number" value={profile.rcs_number} />
            <InfoItem label="Legal Form" value={profile.legal_form} />
            <InfoItem label="Registered Office" value={profile.registered_office} />
            <InfoItem label="Financial Year End" value={profile.financial_year_end} />
            <InfoItem
              label="Average Employees"
              value={profile.average_employees?.toString()}
              subtext={profile.average_employees_source ? `Source: ${profile.average_employees_source}` : undefined}
            />
          </div>
        </CardBody>
      </Card>

      {/* Size Thresholds */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Size Classification</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <ThresholdCard
              label="Balance Sheet Total"
              value={profile.size_thresholds_met.balance_sheet_total}
              smallThreshold={4_400_000}
              mediumThreshold={20_000_000}
            />
            <ThresholdCard
              label="Net Turnover"
              value={profile.size_thresholds_met.net_turnover}
              smallThreshold={8_800_000}
              mediumThreshold={40_000_000}
            />
            <ThresholdCard
              label="Average Employees"
              value={profile.size_thresholds_met.average_employees}
              smallThreshold={50}
              mediumThreshold={250}
              isCount
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  profile.size_thresholds_met.exceeds_small ? 'bg-yellow-500' : 'bg-green-500'
                }`}
              />
              <span>
                {profile.size_thresholds_met.exceeds_small
                  ? 'Exceeds small thresholds'
                  : 'Within small thresholds'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  profile.size_thresholds_met.exceeds_medium ? 'bg-purple-500' : 'bg-gray-300'
                }`}
              />
              <span>
                {profile.size_thresholds_met.exceeds_medium
                  ? 'Exceeds medium thresholds'
                  : 'Within medium thresholds'}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Size determined by: {profile.size_determination_source}
          </p>
        </CardBody>
      </Card>

      {/* Consolidation Status */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Consolidation Status</h3>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <Badge
              className={
                profile.is_consolidated
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              }
            >
              {profile.is_consolidated ? 'Consolidated' : 'Standalone'}
            </Badge>
            {profile.consolidation_source && (
              <span className="text-sm text-gray-600">
                Detected from: &quot;{profile.consolidation_source}&quot;
              </span>
            )}
          </div>
          {profile.is_consolidated && (
            <p className="text-sm text-orange-600 mt-2">
              Note: IC eliminations may apply in consolidated accounts
            </p>
          )}
        </CardBody>
      </Card>

      {/* SOPARFI Indicators */}
      <Card className={profile.soparfi_indicators.is_likely_soparfi ? 'border-orange-200' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">SOPARFI Analysis</h3>
            <Badge
              className={
                profile.soparfi_indicators.is_likely_soparfi
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-600'
              }
            >
              {profile.soparfi_indicators.is_likely_soparfi ? 'Likely SOPARFI' : 'Not SOPARFI'}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-1">Confidence</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  profile.soparfi_indicators.confidence >= 0.7
                    ? 'bg-orange-500'
                    : profile.soparfi_indicators.confidence >= 0.4
                    ? 'bg-yellow-500'
                    : 'bg-gray-400'
                }`}
                style={{ width: `${profile.soparfi_indicators.confidence * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(profile.soparfi_indicators.confidence * 100).toFixed(0)}%
            </div>
          </div>

          {profile.soparfi_indicators.indicators_found.length > 0 ? (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Indicators Found</div>
              <ul className="space-y-1">
                {profile.soparfi_indicators.indicators_found.map((indicator, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-orange-500 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <span>{indicator}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No SOPARFI indicators detected</p>
          )}

          {profile.soparfi_indicators.is_likely_soparfi && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-700">
                <strong>TP Implication:</strong> As a likely holding/SOPARFI structure, focus
                analysis on:
              </p>
              <ul className="text-sm text-orange-600 mt-2 space-y-1">
                <li>• IC financing arrangements and interest rates</li>
                <li>• Substance requirements (employees, premises, decision-making)</li>
                <li>• Management fees and cost allocations</li>
                <li>• Dividend flows and participation exemption</li>
              </ul>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value: string | null | undefined;
  subtext?: string;
}

function InfoItem({ label, value, subtext }: InfoItemProps) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value || '-'}</div>
      {subtext && <div className="text-xs text-gray-400">{subtext}</div>}
    </div>
  );
}

interface ThresholdCardProps {
  label: string;
  value: number | null;
  smallThreshold: number;
  mediumThreshold: number;
  isCount?: boolean;
}

function ThresholdCard({
  label,
  value,
  smallThreshold,
  mediumThreshold,
  isCount,
}: ThresholdCardProps) {
  const formatValue = () => {
    if (value === null) return 'N/A';
    if (isCount) return value.toString();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatThreshold = (threshold: number) => {
    if (isCount) return threshold.toString();
    if (threshold >= 1_000_000) {
      return `${(threshold / 1_000_000).toFixed(1)}M`;
    }
    return `${(threshold / 1_000).toFixed(0)}K`;
  };

  const getLevel = () => {
    if (value === null) return 'unknown';
    if (value > mediumThreshold) return 'large';
    if (value > smallThreshold) return 'medium';
    return 'small';
  };

  const level = getLevel();
  const levelColors = {
    large: 'border-purple-200 bg-purple-50',
    medium: 'border-blue-200 bg-blue-50',
    small: 'border-green-200 bg-green-50',
    unknown: 'border-gray-200 bg-gray-50',
  };

  return (
    <div className={`p-3 rounded-lg border ${levelColors[level]}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold">{formatValue()}</div>
      <div className="text-xs text-gray-400 mt-1">
        Small: &lt;{formatThreshold(smallThreshold)} | Medium: &lt;{formatThreshold(mediumThreshold)}
      </div>
    </div>
  );
}
