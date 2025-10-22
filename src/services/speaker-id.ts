
/**
 * Represents the profile of a registered speaker.
 * This interface is now the single source of truth for the SpeakerProfile type.
 */
export interface SpeakerProfile {
  speakerId: string;
  fullName: string;
  language: 'Sinhala' | 'Tamil';
  email: string;
  whatsappNumber: string;
  // registrationDate?: string; // Optional: ISO date string
}
