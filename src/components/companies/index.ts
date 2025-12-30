// src/components/companies/index.ts
// Export company components

export {
  CompanyCard,
  type CompanyCardData,
  type CompanyCardProps,
} from './company-card';

export { CompanyList, type CompanyListProps } from './company-list';

export {
  CompanyStatusBadge,
  getOverallStatus,
  type CompanyStatus,
  type CompanyStatusBadgeProps,
} from './company-status-badge';
