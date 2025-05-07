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
  // email?: string; // Optional: if email is collected
  // registrationDate?: string; // Optional: ISO date string
}


const SPEAKER_ID_STORAGE_KEY = 'voiceIdLankaSpeakerId';

/**
 * Generates a pseudo-random alphanumeric string with a prefix.
 * Not cryptographically secure, intended for client-side unique ID generation.
 * @param length The length of the random part of the ID to generate (excluding prefix).
 * @returns A pseudo-random string (e.g., "sid-xxxxxxxxxxxxxxxx").
 */
function generatePseudoRandomId(length: number = 16): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < length; i++) {
    randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `sid-${randomPart}`;
}

/**
 * Asynchronously generates or retrieves a unique Speaker ID.
 * This implementation prioritizes retrieving an ID from localStorage if one exists.
 * If no ID is found, a new one is generated and stored.
 * This is suitable for client-side speaker identification before full authentication/backend integration.
 *
 * @returns A promise that resolves to a SpeakerId object containing the unique identifier.
 */
export async function generateSpeakerId(): Promise<SpeakerId> {
  // Ensure this runs only on the client-side
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      let storedId = localStorage.getItem(SPEAKER_ID_STORAGE_KEY);
      if (storedId) {
        // Basic validation for the stored ID format (optional but good practice)
        if (storedId.startsWith('sid-') && storedId.length > 4) {
          return { id: storedId };
        } else {
          console.warn("Invalid Speaker ID format in localStorage. Generating a new one.");
          // Fall through to generate a new ID if format is invalid
        }
      }
      
      // If no valid ID is stored, generate a new one
      const newId = generatePseudoRandomId();
      localStorage.setItem(SPEAKER_ID_STORAGE_KEY, newId);
      return { id: newId };

    } catch (error) {
      console.warn("LocalStorage access failed or an error occurred. Using a temporary ID.", error);
      // Fallback for environments where localStorage is not available or errors occur (e.g., private browsing, full storage)
      // This ID will not persist.
      return {
        id: generatePseudoRandomId() + '-temp-error',
      };
    }
  } else {
    // Fallback for non-browser environments (e.g., server-side rendering if used inappropriately)
    // This ID will not persist.
    console.warn("LocalStorage is not available (not in a browser environment). Using a temporary ID.");
    return {
      id: generatePseudoRandomId() + '-temp-nobrowser',
    };
  }
}