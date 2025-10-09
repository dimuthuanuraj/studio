'use server';
/**
 * @fileOverview Local File System-based Google Drive Mock Service.
 * This service simulates interactions with Google Drive API by storing and retrieving audio files
 * from the local file system. In a real application, this would use the `googleapis` library.
 */

import fs from 'fs/promises';
import path from 'path';

// Define the storage path relative to the project root
const LOCAL_STORAGE_PATH = path.join(process.cwd(), 'local_file_storage');
const METADATA_FILE_PATH = path.join(LOCAL_STORAGE_PATH, 'metadata.json');

interface FileMetadata {
  id: string; // Will be the filename
  name: string;
  mimeType: string;
  createdTime: string;
  speakerId?: string;
  recordedLanguage?: string;
  phraseIndex?: number;
  phraseText?: string;
  duration?: string;
}

// In-memory cache for metadata to reduce file reads, populated on first access.
let metadataCache: Record<string, FileMetadata> | null = null;

/**
 * Ensures the storage directory exists.
 */
async function ensureStorageDirectory(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_STORAGE_PATH, { recursive: true });
  } catch (error) {
    console.error(`Error creating local storage directory at ${LOCAL_STORAGE_PATH}:`, error);
    throw new Error('Could not create local storage directory.');
  }
}

/**
 * Reads the metadata file from the local file system.
 * @returns A promise that resolves to the metadata object.
 */
async function readMetadata(): Promise<Record<string, FileMetadata>> {
  if (metadataCache) {
    return metadataCache;
  }
  
  await ensureStorageDirectory();
  try {
    const metadataJson = await fs.readFile(METADATA_FILE_PATH, 'utf-8');
    metadataCache = JSON.parse(metadataJson);
    return metadataCache!;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty object
      return {};
    }
    console.error('Error reading metadata.json:', error);
    throw new Error('Could not read metadata file.');
  }
}

/**
 * Writes the metadata object to the local file system.
 * @param metadata The metadata object to write.
 */
async function writeMetadata(metadata: Record<string, FileMetadata>): Promise<void> {
  await ensureStorageDirectory();
  try {
    await fs.writeFile(METADATA_FILE_PATH, JSON.stringify(metadata, null, 2));
    metadataCache = metadata; // Update cache
  } catch (error) {
    console.error('Error writing metadata.json:', error);
    throw new Error('Could not write metadata file.');
  }
}


/**
 * Simulates uploading a file to Google Drive by saving it to the local file system.
 * @param fileName The name of the file.
 * @param fileBuffer The content of the file as a Buffer.
 * @param mimeType The MIME type of the file.
 * @param speakerId The ID of the speaker.
 * @param recordedLanguage The language of the recording.
 * @param phraseIndex The index of the phrase.
 * @param phraseText The text of the phrase.
 * @returns A promise that resolves to the file metadata including its name as the ID.
 */
export async function uploadFileToDrive(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  speakerId: string,
  recordedLanguage: string,
  phraseIndex: number,
  phraseText: string
): Promise<{ id: string; name: string }> {
  console.log(`Local FS saving: ${fileName}, size: ${fileBuffer.length} bytes, mimeType: ${mimeType}`);
  
  await ensureStorageDirectory();
  const filePath = path.join(LOCAL_STORAGE_PATH, fileName);

  try {
    await fs.writeFile(filePath, fileBuffer);

    const metadata = await readMetadata();
    const newFileMetadata: FileMetadata = {
      id: fileName, // Use filename as the unique ID for local storage
      name: fileName,
      mimeType,
      createdTime: new Date().toISOString(),
      speakerId,
      recordedLanguage,
      phraseIndex,
      phraseText,
      // duration could be handled by a library if needed
    };
    
    metadata[fileName] = newFileMetadata;
    await writeMetadata(metadata);
    
    console.log(`File saved locally to ${filePath}`);
    return { id: newFileMetadata.id, name: newFileMetadata.name };

  } catch (error) {
      console.error(`Error saving file locally or updating metadata:`, error);
      throw new Error('Failed to save file locally.');
  }
}

/**
 * Simulates listing files from a Google Drive folder by reading from local metadata.
 * @returns A promise that resolves to an array of file metadata.
 */
export async function listFilesFromDrive(): Promise<Partial<FileMetadata>[]> {
  console.log(`Local FS listing files from: ${LOCAL_STORAGE_PATH}`);
  const metadata = await readMetadata();
  return Object.values(metadata);
}

/**
 * Simulates downloading a file from Google Drive by reading it from the local file system.
 * @param fileId The ID of the file to download (which is its filename).
 * @returns A promise that resolves to the file content as a Buffer, or null if not found.
 */
export async function downloadFileFromDrive(fileId: string): Promise<Buffer | null> {
  console.log(`Local FS reading file: ${fileId}`);
  const filePath = path.join(LOCAL_STORAGE_PATH, fileId);

  try {
    const fileBuffer = await fs.readFile(filePath);
    return fileBuffer;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`File not found at ${filePath}`);
      return null;
    }
    console.error(`Error reading file from local storage:`, error);
    throw new Error('Could not read file.');
  }
}

/**
 * Clears all mock files and metadata. Useful for testing.
 */
export async function clearMockDriveFiles() {
  metadataCache = null;
  await ensureStorageDirectory();
  try {
    const files = await fs.readdir(LOCAL_STORAGE_PATH);
    for (const file of files) {
      await fs.unlink(path.join(LOCAL_STORAGE_PATH, file));
    }
    console.log("Local storage directory cleared.");
  } catch (error) {
     console.error("Error clearing local storage directory:", error);
  }
}
