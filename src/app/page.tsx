
'use client';

import { useContext, useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { SpeakerIdDisplay } from '@/components/speaker-id-display';
import { AudioRecorder } from '@/components/audio-recorder';
import { LoginForm } from '@/components/login-form';
import { AuthContext, type SpeakerProfile } from '@/contexts/auth-context'; 
import { Button } from '@/components/ui/button';
import { LogOut, Languages, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type RecordingLanguage = 'Sinhala' | 'Tamil' | 'English';

export default function HomePage() {
  const authContext = useContext(AuthContext);
  const [selectedRecordingLanguage, setSelectedRecordingLanguage] = useState<RecordingLanguage | null>(null);

  useEffect(() => {
    // Reset selected language if user logs out
    if (!authContext?.loggedInUser) {
      setSelectedRecordingLanguage(null);
    }
  }, [authContext?.loggedInUser]);

  if (!authContext) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary items-center justify-center">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
         <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>AuthContext not found. Please ensure AuthProvider wraps your application.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { loggedInUser, loginUser, logoutUser } = authContext;

  const handleLoginSuccess = (user: SpeakerProfile) => {
    loginUser(user);
    // Do not automatically set language here, let user choose
  };

  const handleLanguageSelect = (language: RecordingLanguage) => {
    setSelectedRecordingLanguage(language);
  };

  const handleChangeLanguage = () => {
    setSelectedRecordingLanguage(null); // Go back to language selection
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
        ) : !selectedRecordingLanguage ? (
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Select Recording Language</CardTitle>
              <CardDescription>Choose the language you want to record samples in for this session. Your native language is {loggedInUser.language}.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-3">
              {(['Sinhala', 'Tamil', 'English'] as RecordingLanguage[]).map((lang) => (
                <Button 
                  key={lang} 
                  onClick={() => handleLanguageSelect(lang)} 
                  variant={loggedInUser.language === lang ? "default" : "outline"}
                  className="justify-start text-lg py-6 group"
                >
                  <Languages className="mr-3 h-5 w-5 text-primary group-hover:text-primary-foreground" /> {lang}
                  {loggedInUser.language === lang && <span className="ml-auto text-xs text-primary-foreground/80">(Native)</span>}
                </Button>
              ))}
               <Button variant="ghost" onClick={logoutUser} size="sm" className="mt-4 self-start text-muted-foreground hover:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-center w-full max-w-lg">
              <div className="flex justify-between items-center mb-2">
                 <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                    Voice Recording
                 </h1>
                <Button variant="outline" onClick={logoutUser} size="sm" className="hover:border-destructive hover:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </div>
              <p className="mt-1 text-lg text-muted-foreground">
                Welcome back, {loggedInUser.fullName}! 
              </p>
              <div className="mt-2 flex items-center justify-center space-x-2">
                 <p className="text-md text-muted-foreground">
                    Recording in: <span className="font-semibold text-accent">{selectedRecordingLanguage}</span>
                 </p>
                 <Button variant="link" onClick={handleChangeLanguage} size="sm" className="text-accent p-0 h-auto hover:text-accent/80">
                    (Change Language)
                  </Button>
              </div>
            </div>
            <SpeakerIdDisplay speakerId={loggedInUser.speakerId} />
            <AudioRecorder userProfile={loggedInUser} sessionLanguage={selectedRecordingLanguage} />
          </>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t bg-card">
        © {new Date().getFullYear()} VoiceID Lanka. All rights reserved.
      </footer>
    </div>
  );
}

