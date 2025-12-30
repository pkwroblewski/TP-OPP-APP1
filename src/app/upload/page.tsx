// src/app/upload/page.tsx
// Upload Annual Accounts page

import { PageContainer } from '@/components/layout';
import { UploadForm } from '@/components/upload';

export const metadata = {
  title: 'Upload Annual Accounts | TP Opportunity Finder',
  description: 'Upload Luxembourg company annual accounts for transfer pricing analysis',
};

export default function UploadPage() {
  return (
    <PageContainer
      title="Upload Annual Accounts"
      description="Upload a Luxembourg company's annual accounts PDF for transfer pricing opportunity analysis."
      maxWidth="2xl"
    >
      <UploadForm />
    </PageContainer>
  );
}
