
import { Header } from '@/components/header';
import { RegistrationForm } from '@/components/registration-form';

export default function RegisterPage() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Register for VoiceID Lanka
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Create your account to start contributing voice samples.
            </p>
          </div>
          <RegistrationForm />
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t bg-card">
        © {new Date().getFullYear()} VoiceID Lanka. All rights reserved.
      </footer>
    </div>
  );
}
