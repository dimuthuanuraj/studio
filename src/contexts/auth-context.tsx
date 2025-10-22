
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // The profile is now set via the login form's onLoginSuccess callback.
        // We only fetch here if the user is already logged in on page load.
        if (!loggedInUser) {
           const profile = await getUserProfile(user.uid);
           if (profile) {
            setLoggedInUser(profile);
           } else {
             console.error("User is authenticated but profile is missing in Firestore. Logging out.");
             // Avoid automatic logout in case of temporary network issue during profile fetch
             // auth.signOut();
           }
        }
      } else {
        setLoggedInUser(null);
      }
      setIsLoading(false);
    });

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
    // Render nothing on the server to avoid hydration mismatch
    return null;
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
