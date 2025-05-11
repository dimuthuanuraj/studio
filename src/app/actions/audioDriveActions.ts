'use server';

import {
  uploadFileToDrive as serviceUploadFile,
  listFilesFromDrive as serviceListFiles,
  downloadFileFromDrive as serviceDownloadFile,
} from '@/services/google-drive-service';
import type { SpeakerProfile } from '@/contexts/auth-context';

export interface DriveAudioFileMetadata {
  id: string;
  name: string;
  speakerId?: string;
  recordedLanguage?: string;
  phraseIndex?: number;
  phraseText?: string;
  timestamp?: string; // from createdTime
  duration?: string; // This might be harder to get/store with Drive
  status?: 'pending' | 'verified' | 'rejected'; // Status would be managed in your app's DB, not Drive directly
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
    
    // Construct a unique filename, e.g., id90000_sinhala_phrase1_20231026T123000.webm
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${speakerId}_${sessionLanguage.toLowerCase()}_phrase${phraseIndex + 1}_${timestamp}.${file.name.split('.').pop() || 'webm'}`;

    const result = await serviceUploadFile(
        fileName, 
        buffer, 
        file.type,
        speakerId,
        sessionLanguage,
        phraseIndex,
        phraseText
    );

    if (result.id) {
      return { success: true, fileId: result.id, fileName: result.name };
    } else {
      return { success: false, error: 'Failed to upload file to Drive (mock service).' };
    }
  } catch (error) {
    console.error('Error in uploadAudioToDriveAction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred during upload.' };
  }
}

export async function listAudioFilesFromDriveAction(): Promise<DriveAudioFileMetadata[]> {
  try {
    const files = await serviceListFiles();
    // Map the raw file list from the service to the expected AdminDashboard structure
    return files.map(file => ({
      id: file.id!,
      name: file.name!,
      speakerId: file.speakerId,
      recordedLanguage: file.recordedLanguage as 'Sinhala' | 'Tamil' | 'English' | undefined,
      phraseIndex: file.phraseIndex,
      phraseText: file.phraseText,
      timestamp: file.createdTime,
      duration: file.duration || 'N/A', // Drive doesn't easily provide audio duration
      status: 'pending', // Default status, would be managed elsewhere
    }));
  } catch (error) {
    console.error('Error in listAudioFilesFromDriveAction:', error);
    return [];
  }
}

export async function getAudioFileFromDriveAction(fileId: string): Promise<{ success: boolean; data?: string; mimeType?: string; error?: string, fileName?: string }> {
  try {
    const filesMeta = await serviceListFiles(); // Using list to get metadata including name and mimeType
    const fileMeta = filesMeta.find(f => f.id === fileId);

    if (!fileMeta || !fileMeta.name || !fileMeta.mimeType) {
        return { success: false, error: 'File metadata not found in mock service.' };
    }

    const buffer = await serviceDownloadFile(fileId);
    if (buffer) {
      // Convert buffer to base64 data URL for client-side playback/download
      const base64Data = buffer.toString('base64');
      return { success: true, data: `data:${fileMeta.mimeType};base64,${base64Data}`, mimeType: fileMeta.mimeType, fileName: fileMeta.name };
    } else {
      return { success: false, error: 'File not found in Drive (mock service).' };
    }
  } catch (error) {
    console.error('Error in getAudioFileFromDriveAction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred while fetching file.' };
  }
}
