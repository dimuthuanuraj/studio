'use server';
/**
 * @fileOverview Central Google API Service
 * This service handles authentication and provides wrapper functions for interacting
 * with Google Drive and Google Sheets APIs using a service account.
 */
import { google } from 'googleapis';

// Interface for file metadata, aligned with what we extract and store.
export interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  speakerId?: string;
  recordedLanguage?: string;
  phraseIndex?: number;
  phraseText?: string;
  duration?: string;
  driveLink?: string;
}


// --- Authentication ---
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];

// This function creates an authenticated Google API client.
// It uses service account credentials stored in environment variables.
function getAuthenticatedClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!process.env.GOOGLE_CLIENT_EMAIL || !privateKey) {
    throw new Error('Google service account credentials (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) are not set in .env');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });
  return auth;
}

// --- Google Drive Functions ---

const driveFolderId = process.env.DRIVE_FOLDER_ID;

/**
 * Uploads a file to the configured Google Drive folder.
 * @param fileName The desired name of the file in Drive.
 * @param fileBuffer The file content.
 * @param mimeType The MIME type of the file.
 * @returns The file metadata from the Drive API response.
 */
export async function uploadFile(fileName: string, fileBuffer: Buffer, mimeType: string) {
  if (!driveFolderId) {
    throw new Error("DRIVE_FOLDER_ID is not set in the environment variables.");
  }
  const auth = getAuthenticatedClient();
  const drive = google.drive({ version: 'v3', auth });
  
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [driveFolderId],
      mimeType,
    },
    media: {
      mimeType,
      body: require('stream').Readable.from(fileBuffer),
    },
    fields: 'id, name',
  });
  
  return response.data;
}

/**
 * Lists all files in the configured Google Drive folder.
 * It also parses metadata from the filenames.
 * @returns An array of file metadata objects.
 */
export async function listFiles(): Promise<FileMetadata[]> {
  if (!driveFolderId) {
    throw new Error("DRIVE_FOLDER_ID is not set in the environment variables.");
  }
  const auth = getAuthenticatedClient();
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.list({
    q: `'${driveFolderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, createdTime)',
    orderBy: 'createdTime desc',
  });

  if (!response.data.files) {
    return [];
  }

  // Enrich metadata by parsing the filename
  return response.data.files.map(file => {
    const [speakerId, recordedLanguage, phraseInfo] = (file.name || '').split('_');
    const phraseIndex = phraseInfo ? parseInt(phraseInfo.replace('phrase', ''), 10) : undefined;
    
    return {
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      createdTime: file.createdTime || '',
      speakerId: speakerId,
      recordedLanguage: recordedLanguage,
      phraseIndex: isNaN(phraseIndex as any) ? undefined : phraseIndex,
      driveLink: `https://drive.google.com/file/d/${file.id}/view`,
    };
  });
}

/**
 * Downloads a file from Google Drive by its ID.
 * @param fileId The ID of the file to download.
 * @returns A Buffer with the file content, or null if not found.
 */
export async function downloadFile(fileId: string): Promise<Buffer | null> {
  const auth = getAuthenticatedClient();
  const drive = google.drive({ version: 'v3', auth });

  try {
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(response.data as any);
  } catch (error: any) {
    if (error.code === 404) {
      console.warn(`File not found in Drive with ID: ${fileId}`);
      return null;
    }
    console.error(`Error downloading file from Drive:`, error);
    throw new Error('Could not download file from Google Drive.');
  }
}


// --- Google Sheets Functions ---

const sheetId = process.env.SHEET_ID;
const sheetRange = 'Sheet1'; // Assuming data is in 'Sheet1'

/**
 * Appends a row of data to the configured Google Sheet.
 * @param rowData An array of values for the new row.
 */
export async function appendSheetData(rowData: any[]) {
  if (!sheetId) {
    throw new Error("SHEET_ID is not set in the environment variables.");
  }
  const auth = getAuthenticatedClient();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: sheetRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [rowData],
    },
  });
}

/**
 * Retrieves the header row from the Google Sheet.
 * This is useful for ensuring data is inserted correctly.
 * @returns An array of strings representing the header columns.
 */
export async function getGoogleSheetHeaders(): Promise<string[]> {
    if (!sheetId) {
        throw new Error("SHEET_ID is not set in the environment variables.");
    }
    const auth = getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetRange}!1:1`, // Get the first row
    });

    return response.data.values?.[0] || [];
}
