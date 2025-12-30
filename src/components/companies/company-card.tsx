// src/components/companies/company-card.tsx
// Company card component for displaying company summary

import Link from 'next/link';
import { Card, CardBody } from '@/components/ui';
import { CompanyStatusBadge, getOverallStatus, type CompanyStatus } from './company-status-badge';

export interface CompanyCardData {
  id: string;
  name: string;
  rcsNumber: string;
  gdriveFolderId?: string | null;
  financialYearsCount: number;
  latestExtractionStatus: string | null;
  latestAnalysisStatus: string | null;
  latestYearEnd?: string | null;
}

export interface CompanyCardProps {
  company: CompanyCardData;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const overallStatus = getOverallStatus(
    company.latestExtractionStatus,
    company.latestAnalysisStatus
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Company Name */}
            <Link
              href={`/companies/${company.id}`}
              className="block group"
            >
              <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {company.name}
              </h3>
            </Link>

            {/* RCS Number */}
            <p className="text-sm text-gray-500 mt-0.5">
              RCS: {company.rcsNumber}
            </p>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mt-3">
              <div className="text-sm">
                <span className="text-gray-500">Financial Years:</span>{' '}
                <span className="font-medium text-gray-900">
                  {company.financialYearsCount}
                </span>
              </div>

              {company.latestYearEnd && (
                <div className="text-sm">
                  <span className="text-gray-500">Latest:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {company.latestYearEnd}
                  </span>
                </div>
              )}
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500">Extraction:</span>
              <CompanyStatusBadge
                status={(company.latestExtractionStatus as CompanyStatus) || 'pending'}
              />

              <span className="text-xs text-gray-500 ml-2">Analysis:</span>
              <CompanyStatusBadge
                status={(company.latestAnalysisStatus as CompanyStatus) || 'pending'}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            {/* Google Drive Link */}
            {company.gdriveFolderId && (
              <a
                href={`https://drive.google.com/drive/folders/${company.gdriveFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Open in Google Drive"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}

            {/* View Company Link */}
            <Link
              href={`/companies/${company.id}`}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="View details"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
