
'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { getUserProfile } from '@/services/user-service';
import type { SpeakerProfile as OriginalSpeakerProfile} from '@/services/speaker-id';

export interface SpeakerProfile extends OriginalSpeakerProfile {}

interface AuthContextType {
  loggedInUser: SpeakerProfile | null;
  firebaseUser: User | null;
  logoutUser: () => void;
  isLoading: boolean;
  setLoggedInUser: (user: SpeakerProfile | null) => void;
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
        // If the user is logged in but we don't have their profile yet, fetch it.
        // This handles session restoration on page reload.
        if (!loggedInUser) {
            const profile = await getUserProfile(user.uid);
            if (profile) {
                setLoggedInUser(profile);
            } else {
                console.error("User authenticated, but no speaker profile found for UID:", user.uid);
                auth.signOut();
            }
        }
      } else {
        setFirebaseUser(null);
        setLoggedInUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [loggedInUser]);

  const logoutUser = () => {
    auth.signOut();
    setLoggedInUser(null);
  };

  if (isLoading) {
    return (
        <div className="flex flex-col min-h-screen bg-secondary items-center justify-center">
            <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ loggedInUser, firebaseUser, logoutUser, isLoading, setLoggedInUser }}>
      {children}
    </AuthContext.Provider>
  );
}
