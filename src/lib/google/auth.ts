// src/lib/google/auth.ts
// Google authentication setup using service account credentials

import { google } from 'googleapis';

export interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

let cachedCredentials: GoogleCredentials | null = null;

/**
 * Parse and cache Google service account credentials from environment variable
 */
export function getCredentials(): GoogleCredentials {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!credentialsJson) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set'
    );
  }

  try {
    cachedCredentials = JSON.parse(credentialsJson) as GoogleCredentials;
    return cachedCredentials;
  } catch (error) {
    throw new Error(
      `Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create an authenticated Google Auth client for API requests
 * @param scopes - Array of OAuth scopes required for the APIs
 * @param impersonateUser - Optional email to impersonate (for domain-wide delegation)
 */
export function getAuthClient(scopes: string[], impersonateUser?: string) {
  const credentials = getCredentials();

  // If impersonating a user (domain-wide delegation), use JWT client
  const subjectEmail = impersonateUser || process.env.GOOGLE_IMPERSONATE_USER;

  if (subjectEmail) {
    // Use JWT with subject for impersonation
    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes,
      subject: subjectEmail, // Impersonate this user
    });
    return jwtClient;
  }

  // Standard service account auth (no impersonation)
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes,
  });

  return auth;
}

/**
 * Create an authenticated JWT client for service account authentication
 * Used primarily for Document AI and Drive APIs
 */
export function getJwtClient() {
  const credentials = getCredentials();

  const jwtClient = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  return jwtClient;
}

/**
 * Get the project ID from credentials
 */
export function getProjectId(): string {
  const credentials = getCredentials();
  return credentials.project_id;
}

/**
 * Get the service account email
 */
export function getServiceAccountEmail(): string {
  const credentials = getCredentials();
  return credentials.client_email;
}
