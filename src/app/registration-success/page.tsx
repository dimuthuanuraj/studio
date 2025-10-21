
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Safely get data from URL
  const speakerId = searchParams.get('speakerId') || 'N/A';
  const fullName = searchParams.get('fullName') || 'N/A';
  const email = searchParams.get('email') || 'N/A';
  const whatsapp = searchParams.get('whatsapp') || 'N/A';
  const language = searchParams.get('language') || 'N/A';

  const handleLoginRedirect = () => {
    router.push('/'); // Redirect to the main login/dashboard page
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold text-primary">Registration Successful!</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your account has been created. Please save your Speaker ID for future logins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <h3 className="font-semibold text-lg text-center text-accent">Your Speaker ID</h3>
            <p className="text-center text-2xl font-mono tracking-wider bg-accent/10 text-accent py-2 rounded-md">{speakerId}</p>
          </div>
          
          <div className="text-base space-y-2 text-foreground">
              <p><strong>Full Name:</strong> {fullName}</p>
              <p><strong>Email:</strong> {email}</p>
              <p><strong>WhatsApp:</strong> {whatsapp}</p>
              <p><strong>Language:</strong> {language}</p>
          </div>

          <Button onClick={handleLoginRedirect} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-6">
            Proceed to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Using Suspense as a wrapper is good practice for pages that use useSearchParams
export default function RegistrationSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

