
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
  const [isClient, setIsClient] = useState(false); // New state to track client-side mounting

  useEffect(() => {
    setIsClient(true); // Component has mounted, we are on the client

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user); 
      if (user) {
        if (!loggedInUser || loggedInUser.email !== user.email) {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setLoggedInUser(profile);
          } else {
            console.error("User is authenticated but profile is missing in Firestore. Logging out.");
            auth.signOut();
          }
        }
      } else {
        setLoggedInUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoutUser = async () => {
    await auth.signOut();
    setLoggedInUser(null);
    setFirebaseUser(null);
  };

  const value = { 
    loggedInUser, 
    firebaseUser, 
    logoutUser, 
    isLoading,
    setLoggedInUser, 
  };
  
  if (!isClient) {
    // On the server, or before the first client-side render, render a static loading state
    return (
      <div className="flex flex-col min-h-screen bg-secondary items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? (
         <div className="flex flex-col min-h-screen bg-secondary items-center justify-center">
             <p className="text-lg text-muted-foreground">Loading Session...</p>
         </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
