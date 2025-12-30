// src/app/companies/page.tsx
// Companies list page showing all uploaded companies

import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { CompanyList, type CompanyCardData } from '@/components/companies';
import { Button } from '@/components/ui';
import { createServiceClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Companies | TP Opportunity Finder',
  description: 'View all uploaded companies and their transfer pricing analysis status',
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function getCompanies(): Promise<CompanyCardData[]> {
  const supabase = createServiceClient();

  // Fetch companies with their financial years
  const { data: companies, error } = await supabase
    .from('companies')
    .select(`
      id,
      name,
      rcs_number,
      gdrive_folder_id,
      financial_years (
        id,
        year_end,
        extraction_status,
        analysis_status
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching companies:', error);
    return [];
  }

  // Transform data for CompanyCard
  return (companies || []).map((company) => {
    const financialYears = company.financial_years || [];
    const latestYear = financialYears.sort((a, b) =>
      new Date(b.year_end).getTime() - new Date(a.year_end).getTime()
    )[0];

    return {
      id: company.id,
      name: company.name,
      rcsNumber: company.rcs_number,
      gdriveFolderId: company.gdrive_folder_id,
      financialYearsCount: financialYears.length,
      latestExtractionStatus: latestYear?.extraction_status || null,
      latestAnalysisStatus: latestYear?.analysis_status || null,
      latestYearEnd: latestYear?.year_end || null,
    };
  });
}

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <PageContainer
      title="Companies"
      description={`${companies.length} ${companies.length === 1 ? 'company' : 'companies'} uploaded`}
      action={
        <Link href="/upload">
          <Button>Upload New</Button>
        </Link>
      }
    >
      <CompanyList companies={companies} />
    </PageContainer>
  );
}
