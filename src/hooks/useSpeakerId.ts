import { useState, useEffect } from 'react';
import { generateSpeakerId, type SpeakerId } from '@/services/speaker-id';

export function useSpeakerId() {
  const [speakerId, setSpeakerId] = useState<SpeakerId | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrGenerateId() {
      try {
        const id = await generateSpeakerId();
        setSpeakerId(id);
      } catch (error) {
        console.error("Failed to generate Speaker ID:", error);
        // Potentially set an error state here
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrGenerateId();
  }, []);

  return { speakerId, isLoading };
}