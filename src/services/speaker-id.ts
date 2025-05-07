/**
 * Represents a unique Speaker ID.
 */
export interface SpeakerId {
  /**
   * The unique identifier for the speaker.
   */
  id: string;
}

/**
 * Represents the profile of a registered speaker.
 */
export interface SpeakerProfile {
  speakerId: string;
  fullName: string;
  language: 'Sinhala' | 'Tamil';
  email: string;
  whatsappNumber: string;
  // registrationDate?: string; // Optional: ISO date string
}


const LAST_SPEAKER_NUMERIC_ID_KEY = 'voiceIdLankaLastNumericId';
const STARTING_NUMERIC_ID = 90000;

/**
 * Asynchronously generates or retrieves a unique Speaker ID in a sequential manner.
 * Starts from 'id90000', 'id90001', and so on.
 * This implementation uses localStorage to keep track of the last assigned numeric ID.
 * Note: This client-side sequential ID generation is suitable for prototypes
 * but is NOT ROBUST for production environments with multiple concurrent users,
 * as race conditions can occur. A backend-managed atomic counter is required for production.
 *
 * @returns A promise that resolves to a SpeakerId object containing the unique identifier.
 */
export async function generateSpeakerId(): Promise<SpeakerId> {
  // Ensure this runs only on the client-side
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      let lastNumericIdStr = localStorage.getItem(LAST_SPEAKER_NUMERIC_ID_KEY);
      let currentNumericId: number;

      if (lastNumericIdStr) {
        const lastNumericId = parseInt(lastNumericIdStr, 10);
        if (!isNaN(lastNumericId) && lastNumericId >= STARTING_NUMERIC_ID) {
          currentNumericId = lastNumericId + 1;
        } else {
          // Invalid stored value or value less than starting, reset
          console.warn(`Invalid or outdated numeric ID (${lastNumericIdStr}) in localStorage. Resetting to starting ID.`);
          currentNumericId = STARTING_NUMERIC_ID;
        }
      } else {
        // No ID stored, start from the beginning
        currentNumericId = STARTING_NUMERIC_ID;
      }

      localStorage.setItem(LAST_SPEAKER_NUMERIC_ID_KEY, currentNumericId.toString());
      return { id: `id${currentNumericId}` };

    } catch (error) {
      console.warn("LocalStorage access failed for sequential ID. Using a temporary ID with random suffix.", error);
      // Fallback for environments where localStorage is not available or errors occur
      // This ID will not persist reliably and might not be unique.
      const randomSuffix = Math.floor(Math.random() * 1000);
      return {
        id: `id${STARTING_NUMERIC_ID}_err${randomSuffix}`,
      };
    }
  } else {
    // Fallback for non-browser environments
    console.warn("LocalStorage is not available (not in a browser environment). Using a temporary ID with random suffix.");
    const randomSuffix = Math.floor(Math.random() * 1000);
    return {
      id: `id${STARTING_NUMERIC_ID}_tmp${randomSuffix}`,
    };
  }
}
