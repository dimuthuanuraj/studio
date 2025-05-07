/**
 * Represents a unique Speaker ID.
 */
export interface SpeakerId {
  /**
   * The unique identifier for the speaker.
   */
  id: string;
}

const SPEAKER_ID_STORAGE_KEY = 'voiceIdLankaSpeakerId';

/**
 * Generates a pseudo-random alphanumeric string.
 * Not cryptographically secure, for client-side placeholder only.
 * @param length The length of the ID to generate.
 * @returns A pseudo-random string.
 */
function generatePseudoRandomId(length: number = 16): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'sid-';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Asynchronously generates or retrieves a unique Speaker ID.
 * For demonstration purposes, this implementation uses localStorage.
 * In a production app, this should involve a backend service to ensure true uniqueness and persistence.
 *
 * @returns A promise that resolves to a SpeakerId object containing the unique identifier.
 */
export async function generateSpeakerId(): Promise<SpeakerId> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      let storedId = localStorage.getItem(SPEAKER_ID_STORAGE_KEY);
      if (storedId) {
        return { id: storedId };
      } else {
        const newId = generatePseudoRandomId();
        localStorage.setItem(SPEAKER_ID_STORAGE_KEY, newId);
        return { id: newId };
      }
    }
  } catch (error) {
    console.warn("LocalStorage is not available or access denied. Using a temporary ID.", error);
  }
  
  // Fallback if localStorage is not available or fails
  // This ID will not persist across sessions or tabs.
  return {
    id: generatePseudoRandomId() + '-temp',
  };
}
