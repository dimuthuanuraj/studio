
'use server';
/**
 * @fileOverview Service layer that acts as a bridge to the main Google API service.
 * This file provides an abstraction layer, so if the underlying Google service changes,
 * we only need to update this file and not all the components that use it.
 */

import {
  uploadFile as apiUploadFile,
  listFiles as apiListFiles,
  downloadFile as apiDownloadFile,
  appendSheetData as apiAppendSheet,
} from './google-service';
import type { FileMetadata } from './google-service';

/**
 * Uploads a file to Google Drive.
 * @param fileName The name of the file.
 * @param fileBuffer The content of the file as a Buffer.
 * @param mimeType The MIME type of the file.
 * @returns A promise that resolves to the file metadata.
 */
export async function uploadFileToDrive(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<{ id: string; name: string }> {
  const result = await apiUploadFile(fileName, fileBuffer, mimeType);
  if (!result || !result.id || !result.name) {
    throw new Error('File upload to Google Drive failed to return expected data.');
  }
  return { id: result.id, name: result.name };
}

/**
 * Lists files from the Google Drive folder.
 * @returns A promise that resolves to an array of file metadata.
 */
export async function listFilesFromDrive(): Promise<FileMetadata[]> {
  return await apiListFiles();
}

/**
 * Downloads a file from Google Drive.
 * @param fileId The ID of the file to download.
 * @returns A promise that resolves to the file content as a Buffer, or null if not found.
 */
export async function downloadFileFromDrive(fileId: string): Promise<Buffer | null> {
  return await apiDownloadFile(fileId);
}

/**
 * Appends a row of data to the configured Google Sheet.
 * @param rowData An array of values for the new row.
 * @returns A promise that resolves when the data has been appended.
 */
export async function appendDataToGoogleSheet(rowData: any[]): Promise<void> {
  await apiAppendSheet(rowData);
}
