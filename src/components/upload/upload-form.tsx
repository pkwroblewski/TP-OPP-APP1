// src/components/upload/upload-form.tsx
// Upload form with company details and PDF uploader

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { PDFUploader } from './pdf-uploader';
import { Button, Input, Card, CardBody } from '@/components/ui';

interface FormData {
  rcsNumber: string;
  companyName: string;
  yearEnd: string;
}

interface FormErrors {
  rcsNumber?: string;
  companyName?: string;
  yearEnd?: string;
  file?: string;
  submit?: string;
}

interface UploadResponse {
  success: boolean;
  companyId?: string;
  financialYearId?: string;
  message?: string;
  error?: string;
}

export function UploadForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>({
    rcsNumber: '',
    companyName: '',
    yearEnd: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    companyId: string;
    financialYearId: string;
  } | null>(null);

  const validateRcsNumber = (value: string): string | undefined => {
    // Luxembourg RCS format: B followed by 5-6 digits
    const rcsRegex = /^B\d{5,6}$/i;
    if (!value) {
      return 'RCS Number is required';
    }
    if (!rcsRegex.test(value)) {
      return 'RCS Number must be in format B followed by 5-6 digits (e.g., B123456)';
    }
    return undefined;
  };

  const validateCompanyName = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Company Name is required';
    }
    if (value.trim().length < 2) {
      return 'Company Name must be at least 2 characters';
    }
    return undefined;
  };

  const validateYearEnd = (value: string): string | undefined => {
    if (!value) {
      return 'Year End Date is required';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Invalid date format';
    }
    // Check if date is not in the future
    if (date > new Date()) {
      return 'Year End Date cannot be in the future';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    newErrors.rcsNumber = validateRcsNumber(formData.rcsNumber);
    newErrors.companyName = validateCompanyName(formData.companyName);
    newErrors.yearEnd = validateYearEnd(formData.yearEnd);

    if (!file) {
      newErrors.file = 'Please select a PDF file to upload';
    }

    // Filter out undefined errors
    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([, v]) => v !== undefined)
    ) as FormErrors;

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const submitData = new FormData();
      submitData.append('file', file!);
      submitData.append('rcsNumber', formData.rcsNumber.toUpperCase());
      submitData.append('companyName', formData.companyName.trim());
      submitData.append('yearEnd', formData.yearEnd);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: submitData,
      });

      const result: UploadResponse = await response.json();

      if (!response.ok || !result.success) {
        setErrors({ submit: result.error || 'Upload failed. Please try again.' });
        return;
      }

      // Success
      setSuccessData({
        companyId: result.companyId!,
        financialYearId: result.financialYearId!,
      });
    } catch (error) {
      console.error('Upload error:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Not authenticated state
  if (!session) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sign in Required
            </h3>
            <p className="text-gray-600 mb-6">
              Please sign in with your Google account to upload files.
              <br />
              Files will be stored in your own Google Drive.
            </p>
            <Button onClick={() => signIn('google')}>
              Sign in with Google
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Success state
  if (successData) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Successful!
            </h3>
            <p className="text-gray-600 mb-6">
              The annual accounts have been uploaded and are ready for processing.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => router.push(`/companies/${successData.companyId}`)}
              >
                View Company
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setSuccessData(null);
                  setFile(null);
                  setFormData({ rcsNumber: '', companyName: '', yearEnd: '' });
                }}
              >
                Upload Another
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PDF Uploader */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Accounts PDF <span className="text-red-500">*</span>
            </label>
            <PDFUploader
              file={file}
              onFileSelect={setFile}
              error={errors.file}
              disabled={isSubmitting}
            />
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="RCS Number"
              name="rcsNumber"
              value={formData.rcsNumber}
              onChange={handleInputChange}
              placeholder="B123456"
              error={errors.rcsNumber}
              disabled={isSubmitting}
              required
              helperText="Luxembourg company registry number"
            />

            <Input
              label="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              placeholder="Company S.A."
              error={errors.companyName}
              disabled={isSubmitting}
              required
            />
          </div>

          <Input
            label="Year End Date"
            name="yearEnd"
            type="date"
            value={formData.yearEnd}
            onChange={handleInputChange}
            error={errors.yearEnd}
            disabled={isSubmitting}
            required
            helperText="Financial year end date"
          />

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? 'Uploading...' : 'Upload Annual Accounts'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
