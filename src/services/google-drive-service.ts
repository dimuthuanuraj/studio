'use server';
/**
 * @fileOverview Mocked Google Drive Service.
 * This service simulates interactions with Google Drive API for storing and retrieving audio files.
 * In a real application, this would use the `googleapis` library and proper authentication.
 */

import type { Readable } from 'stream';

// Mock in-memory store for Drive files
interface MockDriveFile {
  id: string;
  name: string;
  mimeType: string;
  parentId?: string; // To simulate folder structure
  content: Buffer; // Store file content as Buffer for simulation
  createdTime: string;
  speakerId?: string;
  recordedLanguage?: string;
  phraseIndex?: number;
  phraseText?: string;
  duration?: string; // duration might be tricky to get reliably from Drive API without processing
}

let mockDriveFiles: MockDriveFile[] = [];
let fileIdCounter = 0;

const MOCK_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || 'mock_voiceid_lanka_folder';

/**
 * Simulates uploading a file to Google Drive.
 * @param fileName The name of the file.
 * @param fileBuffer The content of the file as a Buffer.
 * @param mimeType The MIME type of the file.
 * @param speakerId The ID of the speaker.
 * @param recordedLanguage The language of the recording.
 * @param phraseIndex The index of the phrase.
 * @param phraseText The text of the phrase.
 * @returns A promise that resolves to the mock file metadata including a generated ID.
 */
export async function uploadFileToDrive(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  speakerId: string,
  recordedLanguage: string,
  phraseIndex: number,
  phraseText: string
): Promise<Pick<MockDriveFile, 'id' | 'name'>> {
  console.log(`Mock uploading to Drive: ${fileName}, size: ${fileBuffer.length} bytes, mimeType: ${mimeType}`);
  
  const newFile: MockDriveFile = {
    id: `mock_drive_file_${fileIdCounter++}`,
    name: fileName,
    mimeType,
    parentId: MOCK_DRIVE_FOLDER_ID,
    content: fileBuffer,
    createdTime: new Date().toISOString(),
    speakerId,
    recordedLanguage,
    phraseIndex,
    phraseText,
    // duration could be estimated or passed if known
  };
  mockDriveFiles.push(newFile);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log('Mock Drive files after upload:', mockDriveFiles.map(f => ({id: f.id, name: f.name})));
  return { id: newFile.id, name: newFile.name };
}

/**
 * Simulates listing files from a Google Drive folder.
 * @returns A promise that resolves to an array of mock file metadata.
 */
export async function listFilesFromDrive(): Promise<Partial<MockDriveFile>[]> {
  console.log(`Mock listing files from Drive folder: ${MOCK_DRIVE_FOLDER_ID}`);
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Return relevant metadata, not the full content buffer for listings
  return mockDriveFiles
    .filter(file => file.parentId === MOCK_DRIVE_FOLDER_ID)
    .map(({ content, ...metadata }) => metadata);
}

/**
 * Simulates downloading a file from Google Drive.
 * @param fileId The ID of the file to download.
 * @returns A promise that resolves to the file content as a Buffer, or null if not found.
 */
export async function downloadFileFromDrive(fileId: string): Promise<Buffer | null> {
  console.log(`Mock downloading file from Drive: ${fileId}`);
  const file = mockDriveFiles.find(f => f.id === fileId);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 150));
  
  if (file) {
    return file.content;
  }
  return null;
}

/**
 * Clears all mock files. Useful for testing or resetting state.
 */
export async function clearMockDriveFiles() {
  mockDriveFiles = [];
  fileIdCounter = 0;
  console.log("Mock Drive files cleared.");
}

// Example of how you might initialize the Google API client in a real scenario (NOT USED BY MOCK)
/*
import { google } from 'googleapis';
async function getDriveClient() {
  // For service account:
  // const auth = new google.auth.GoogleAuth({
  //   keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, // path to JSON key file
  //   scopes: ['https://www.googleapis.com/auth/drive'],
  // });
  // const client = await auth.getClient();
  // const drive = google.drive({ version: 'v3', auth: client });
  // return drive;

  // For OAuth2 (more complex setup involving user consent flow):
  // const oauth2Client = new google.auth.OAuth2(
  //   process.env.GOOGLE_CLIENT_ID,
  //   process.env.GOOGLE_CLIENT_SECRET,
  //   process.env.GOOGLE_REDIRECT_URI
  // );
  // oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN }); // Refresh token needs to be obtained and stored
  // const drive = google.drive({ version: 'v3', auth: oauth2Client });
  // return drive;
  
  throw new Error("Real Google Drive client not implemented in this mock service.");
}
*/

// To make functions callable from client components via Server Actions,
// they need to be exported and the file marked with 'use server'.
// The functions above are already structured for this.

