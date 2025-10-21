
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
      setFirebaseUser(user); // Keep track of the raw firebase user object
      if (user) {
        // If a user is authenticated via Firebase, but we don't have the profile
        // in our React state yet (e.g., on a page refresh), fetch it.
        if (!loggedInUser) {
          setIsLoading(true);
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setLoggedInUser(profile);
          } else {
             // This case is unlikely if registration is transactional, but handles edge cases.
            console.error("User is authenticated but profile is missing in Firestore. Logging out.");
            auth.signOut();
          }
          setIsLoading(false);
        }
      } else {
        // User logged out
        setLoggedInUser(null);
      }
      // Only set loading to false here after the initial check is done
      if(isLoading) setIsLoading(false);
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
    setLoggedInUser, // This is called by the login form on successful login
  };

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
