
'use client';

import { useContext } from 'react';
import { Header } from '@/components/header';
import { SpeakerIdDisplay } from '@/components/speaker-id-display';
import { AudioRecorder } from '@/components/audio-recorder';
import { LoginForm } from '@/components/login-form';
import { AuthContext, type SpeakerProfile } from '@/contexts/auth-context'; // Assuming SpeakerProfile is exported from AuthContext
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function HomePage() {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    // This should ideally not happen if AuthProvider is correctly set up in layout
    return (
      <div>
        Error: AuthContext not found. Please ensure AuthProvider wraps your application.
      </div>
    );
  }

  const { loggedInUser, loginUser, logoutUser } = authContext;

  const handleLoginSuccess = (user: SpeakerProfile) => {
    loginUser(user);
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center space-y-8">
        {!loggedInUser ? (
          <>
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                Welcome to VoiceID Lanka
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Please log in to record your voice samples.
              </p>
            </div>
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          </>
        ) : (
          <>
            <div className="text-center w-full">
              <div className="flex justify-between items-center mb-6">
                 <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                    Voice Recording
                 </h1>
                <Button variant="outline" onClick={logoutUser} size="sm">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </div>
              <p className="mt-2 text-lg text-muted-foreground">
                Welcome back, {loggedInUser.fullName}! Record your voice sample for speaker verification.
              </p>
            </div>
            <SpeakerIdDisplay speakerId={loggedInUser.speakerId} />
            <AudioRecorder userProfile={loggedInUser} />
          </>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t bg-card">
        © {new Date().getFullYear()} VoiceID Lanka. All rights reserved.
      </footer>
    </div>
  );
}

