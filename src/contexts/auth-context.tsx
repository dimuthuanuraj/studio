
'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { getUserBySpeakerId, getAllUsers } from '@/services/user-service';
import type { SpeakerProfile as OriginalSpeakerProfile} from '@/services/speaker-id'; // Use original type

export interface SpeakerProfile extends OriginalSpeakerProfile {}

interface AuthContextType {
  loggedInUser: SpeakerProfile | null;
  firebaseUser: User | null; // Keep track of the raw firebase user
  logoutUser: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedInUser, setLoggedInUser] = useState<SpeakerProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        setFirebaseUser(user);
        
        // This is a workaround because we can't directly query Firestore by email without specific rules.
        // In a real app, you would fetch the user profile based on the Firebase UID.
        // For this prototype, we'll find the user profile by matching the email.
        const allUsers = await getAllUsers();
        const profile = allUsers.find(p => p.email.toLowerCase() === user.email?.toLowerCase());

        if (profile) {
            setLoggedInUser(profile);
        } else {
            // This might happen if a user exists in Auth but their profile wasn't created in Firestore.
            console.error("User authenticated, but no speaker profile found for email:", user.email);
            setLoggedInUser(null);
        }
      } else {
        setFirebaseUser(null);
        setLoggedInUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const logoutUser = () => {
    auth.signOut();
  };

  if (isLoading) {
    return (
        <div className="flex flex-col min-h-screen bg-secondary items-center justify-center">
            <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
    );
  }

  // We are not exporting loginUser anymore as it is handled by the components directly
  return (
    <AuthContext.Provider value={{ loggedInUser, firebaseUser, logoutUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
