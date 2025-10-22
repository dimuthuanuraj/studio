
import { useState, useEffect } from 'react';
import { generateSpeakerId as generateNewSpeakerIdService, type SpeakerId } from '@/services/speaker-id'; // Renamed import

/**
 * Hook specifically for generating a *new* Speaker ID, typically during registration
 * or if one needs to be displayed outside of a logged-in user context.
 * For logged-in users, the Speaker ID should come from the AuthContext.
 */
export function useSpeakerIdGenerator() {
  const [generatedSpeakerId, setGeneratedSpeakerId] = useState<SpeakerId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateId = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const id = await generateNewSpeakerIdService();
      setGeneratedSpeakerId(id);
    } catch (err) {
      console.error("Failed to generate Speaker ID:", err);
      setError("Could not generate Speaker ID. Please try again.");
      setGeneratedSpeakerId(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Exposed function to allow re-generation if needed
  return { generatedSpeakerId, isLoading, error, generateId };
}
