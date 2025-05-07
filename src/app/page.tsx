import { Header } from '@/components/header';
import { SpeakerIdDisplay } from '@/components/speaker-id-display';
import { AudioRecorder } from '@/components/audio-recorder';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
            Welcome to VoiceID Lanka
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Record your voice sample for speaker verification.
          </p>
        </div>
        <SpeakerIdDisplay />
        <AudioRecorder />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t bg-card">
        © {new Date().getFullYear()} VoiceID Lanka. All rights reserved.
      </footer>
    </div>
  );
}
