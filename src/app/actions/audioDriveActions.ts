
'use server';

import {
  uploadFileToDrive as serviceUploadFile,
  listFilesFromDrive as serviceListFiles,
  downloadFileFromDrive as serviceDownloadFile,
  appendDataToGoogleSheet,
} from '@/services/google-drive-service';
import type { SpeakerProfile } from '@/contexts/auth-context';
import type { FileMetadata as DriveFileMetadata } from '@/services/google-service';


export interface EnrichedDriveAudioFile extends DriveFileMetadata {
    // Client-side specific fields
    status?: 'pending' | 'verified' | 'rejected';
}


export async function uploadAudioToDriveAction(
  formData: FormData,
  userProfile: SpeakerProfile,
  sessionLanguage: string,
  phraseIndex: number,
  phraseText: string
): Promise<{ success: boolean; fileId?: string; fileName?: string; error?: string }> {
  try {
    const file = formData.get('audioBlob') as File | null;
    const speakerId = userProfile.speakerId;

    if (!file) {
      return { success: false, error: 'No audio file provided.' };
    }
    if (!speakerId) {
      return { success: false, error: 'Speaker ID is missing.' };
    }
    if(!sessionLanguage || !phraseText) {
        return { success: false, error: 'Session language or phrase text missing.' };
    }


    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const timestamp = new Date();
    const isoTimestamp = timestamp.toISOString();
    const formattedTimestamp = timestamp.toLocaleString('en-US', { timeZone: 'Asia/Colombo' });

    const fileName = `${speakerId}_${sessionLanguage.toLowerCase()}_phrase${phraseIndex + 1}_${isoTimestamp.replace(/[:.]/g, '-')}.${file.name.split('.').pop() || 'webm'}`;

    // 1. Upload the file to Google Drive
    const uploadResult = await serviceUploadFile(
        fileName, 
        buffer, 
        file.type,
    );

    if (uploadResult.id) {
      // 2. If upload is successful, log the metadata to Google Sheets
      const fileLink = `https://drive.google.com/file/d/${uploadResult.id}/view`;
      
      const sheetRow = [
        speakerId,
        userProfile.fullName,
        userProfile.language, // Native Language
        sessionLanguage, // Recorded Language
        phraseIndex + 1,
        phraseText,
        fileName,
        fileLink,
        formattedTimestamp, // Timestamp
        '', // Placeholder for Duration
        'pending' // Default Status
      ];

      await appendDataToGoogleSheet(sheetRow);
      
      return { success: true, fileId: uploadResult.id, fileName: uploadResult.name };
    } else {
      return { success: false, error: 'Failed to upload file to Drive.' };
    }
  } catch (error) {
    console.error('Error in uploadAudioToDriveAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during upload.';
    return { success: false, error: `Upload Action Failed: ${errorMessage}` };
  }
}

export async function listAudioFilesFromDriveAction(): Promise<EnrichedDriveAudioFile[]> {
  try {
    const files = await serviceListFiles();
    // The service now returns enriched metadata directly from the file names.
    // Let's sort them by creation time descending.
    return files
        .sort((a, b) => new Date(b.createdTime || 0).getTime() - new Date(a.createdTime || 0).getTime())
        .map(file => ({
            ...file,
            status: 'pending' // Default status, would be managed elsewhere (e.g. in the sheet or a DB)
        }));

  } catch (error) {
    console.error('Error in listAudioFilesFromDriveAction:', error);
    return [];
  }
}

export async function getAudioFileFromDriveAction(fileId: string): Promise<{ success: boolean; data?: string; mimeType?: string; error?: string, fileName?: string }> {
  try {
    const fileContent = await serviceDownloadFile(fileId);
    
    if (fileContent) {
        // We need metadata to get the name and mimeType. For now, let's list and find.
        // This is inefficient but works for the current structure.
        const filesMeta = await serviceListFiles();
        const fileMeta = filesMeta.find(f => f.id === fileId);
        
        if (!fileMeta || !fileMeta.name || !fileMeta.mimeType) {
            // Fallback if metadata isn't found (should be rare)
            console.warn(`Could not find metadata for fileId ${fileId} during download.`);
            return { success: false, error: 'File content found, but metadata is missing.' };
        }

        const base64Data = fileContent.toString('base64');
        return { 
            success: true, 
            data: `data:${fileMeta.mimeType};base64,${base64Data}`, 
            mimeType: fileMeta.mimeType, 
            fileName: fileMeta.name 
        };
    } else {
      return { success: false, error: 'File not found in Google Drive.' };
    }
  } catch (error) {
    console.error('Error in getAudioFileFromDriveAction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred while fetching file.' };
  }
}
