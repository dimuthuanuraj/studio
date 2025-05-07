
'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect } from 'react';
import type { SpeakerProfile as OriginalSpeakerProfile} from '@/services/speaker-id'; // Use original type

export interface SpeakerProfile extends OriginalSpeakerProfile {}

interface AuthContextType {
  loggedInUser: SpeakerProfile | null;
  loginUser: (user: SpeakerProfile) => void;
  logoutUser: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedInUser, setLoggedInUser] = useState<SpeakerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to load user from localStorage on initial load
    try {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        setLoggedInUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
      localStorage.removeItem('loggedInUser'); // Clear corrupted data
    }
    setIsLoading(false);
  }, []);

  const loginUser = (user: SpeakerProfile) => {
    setLoggedInUser(user);
    try {
      localStorage.setItem('loggedInUser', JSON.stringify(user));
    } catch (error) {
      console.error("Failed to save user to localStorage", error);
    }
  };

  const logoutUser = () => {
    setLoggedInUser(null);
    try {
      localStorage.removeItem('loggedInUser');
    } catch (error) {
      console.error("Failed to remove user from localStorage", error);
    }
  };

  if (isLoading) {
    // You might want to render a loading spinner here or null
    return null; 
  }

  return (
    <AuthContext.Provider value={{ loggedInUser, loginUser, logoutUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
