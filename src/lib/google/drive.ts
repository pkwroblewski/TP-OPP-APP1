// src/lib/google/drive.ts
// Google Drive operations for PDF storage

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { getAuthClient } from './auth';

// Scopes required for Drive operations
const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Get an authenticated Drive client using service account (for read operations)
 */
function getDriveClient(): drive_v3.Drive {
  const auth = getAuthClient(DRIVE_SCOPES);
  return google.drive({ version: 'v3', auth });
}

/**
 * Get a Drive client using user's OAuth access token (for write operations)
 * @param accessToken - User's OAuth access token from NextAuth session
 */
function getDriveClientWithToken(accessToken: string): drive_v3.Drive {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Find a folder by name within a parent folder
 * @param name - Folder name to search for
 * @param parentId - Parent folder ID
 * @param accessToken - Optional OAuth access token for user authentication
 * @returns Folder ID if found, null otherwise
 */
export async function findFolderByName(
  name: string,
  parentId: string,
  accessToken?: string
): Promise<string | null> {
  const drive = accessToken ? getDriveClientWithToken(accessToken) : getDriveClient();

  const response = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const folders = response.data.files;
  if (folders && folders.length > 0) {
    return folders[0].id || null;
  }

  return null;
}

/**
 * Create a folder within a parent folder
 * @param name - Folder name
 * @param parentId - Parent folder ID
 * @param accessToken - Optional OAuth access token for user authentication
 * @returns Created folder ID
 */
export async function createFolder(
  name: string,
  parentId: string,
  accessToken?: string
): Promise<string> {
  const drive = accessToken ? getDriveClientWithToken(accessToken) : getDriveClient();

  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  if (!response.data.id) {
    throw new Error(`Failed to create folder: ${name}`);
  }

  return response.data.id;
}

/**
 * Find or create a folder by name within a parent folder
 * @param name - Folder name
 * @param parentId - Parent folder ID
 * @param accessToken - Optional OAuth access token for user authentication
 * @returns Folder ID (existing or newly created)
 */
export async function findOrCreateFolder(
  name: string,
  parentId: string,
  accessToken?: string
): Promise<string> {
  const existingId = await findFolderByName(name, parentId, accessToken);
  if (existingId) {
    return existingId;
  }
  return await createFolder(name, parentId, accessToken);
}

/**
 * Upload a PDF file to a specific folder
 * @param buffer - File buffer
 * @param fileName - Name for the file
 * @param folderId - Target folder ID
 * @param accessToken - Optional OAuth access token for user authentication
 * @returns Object with file ID and web view link
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  folderId: string,
  accessToken?: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = accessToken ? getDriveClientWithToken(accessToken) : getDriveClient();

  // Convert buffer to readable stream
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: 'application/pdf',
      body: stream,
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  if (!response.data.id) {
    throw new Error(`Failed to upload file: ${fileName}`);
  }

  // Make the file viewable by anyone with the link
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  return {
    fileId: response.data.id,
    webViewLink: response.data.webViewLink || generateViewUrl(response.data.id),
  };
}

/**
 * Download a file by ID
 * @param fileId - Google Drive file ID
 * @returns File buffer
 */
export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();

  const response = await drive.files.get(
    {
      fileId,
      alt: 'media',
      supportsAllDrives: true,
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Get file metadata
 * @param fileId - Google Drive file ID
 * @returns File metadata
 */
export async function getFileMetadata(fileId: string): Promise<{
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
  createdTime: string;
  modifiedTime: string;
}> {
  const drive = getDriveClient();

  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, webViewLink, createdTime, modifiedTime',
    supportsAllDrives: true,
  });

  return {
    id: response.data.id || fileId,
    name: response.data.name || 'Unknown',
    mimeType: response.data.mimeType || 'application/octet-stream',
    size: response.data.size || '0',
    webViewLink: response.data.webViewLink || generateViewUrl(fileId),
    createdTime: response.data.createdTime || new Date().toISOString(),
    modifiedTime: response.data.modifiedTime || new Date().toISOString(),
  };
}

/**
 * Generate a viewable URL for a Google Drive file
 * @param fileId - Google Drive file ID
 * @returns Viewable URL
 */
export function generateViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Generate a direct download URL for a Google Drive file
 * @param fileId - Google Drive file ID
 * @returns Download URL
 */
export function generateDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * List files in a folder
 * @param folderId - Folder ID
 * @returns Array of file metadata
 */
export async function listFilesInFolder(folderId: string): Promise<
  Array<{
    id: string;
    name: string;
    mimeType: string;
  }>
> {
  const drive = getDriveClient();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (response.data.files || []).map((file) => ({
    id: file.id || '',
    name: file.name || '',
    mimeType: file.mimeType || '',
  }));
}

/**
 * Delete a file by ID
 * @param fileId - Google Drive file ID
 */
export async function deleteFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

/**
 * Get the configured folder IDs from environment variables
 */
export function getFolderIds(): {
  rootFolderId: string;
  companiesFolderId: string;
} {
  const rootFolderId = process.env.GDRIVE_ROOT_FOLDER_ID;
  const companiesFolderId = process.env.GDRIVE_COMPANIES_FOLDER_ID;

  if (!rootFolderId) {
    throw new Error('GDRIVE_ROOT_FOLDER_ID environment variable is not set');
  }

  if (!companiesFolderId) {
    throw new Error('GDRIVE_COMPANIES_FOLDER_ID environment variable is not set');
  }

  return { rootFolderId, companiesFolderId };
}
