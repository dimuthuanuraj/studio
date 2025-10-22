
'use client';

import { useState, useContext } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn } from 'lucide-react';
import type { SpeakerProfile } from '@/contexts/auth-context';
import { AuthContext } from '@/contexts/auth-context';
import { auth } from '@/services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getUserBySpeakerId } from '@/services/user-service';

const loginSchema = z.object({
  speakerId: z.string().min(1, { message: 'Speaker ID is required.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLoginSuccess: (user: SpeakerProfile) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authContext = useContext(AuthContext);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      speakerId: '',
      password: '',
    }
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsSubmitting(true);
    
    try {
      // Step 1: Find user profile by Speaker ID to get their email
      const userProfile = await getUserBySpeakerId(data.speakerId);

      if (userProfile) {
        // Step 2: Attempt to sign in with Firebase Auth using the fetched email and provided password
        await signInWithEmailAndPassword(auth, userProfile.email, data.password);
        
        // Step 3: If Firebase auth is successful, call the main onLoginSuccess handler
        // with the complete user profile.
        toast({
          title: 'Login Successful!',
          description: `Welcome back, ${userProfile.fullName}!`,
        });
        
        onLoginSuccess(userProfile);

      } else {
        // This error is for when the Speaker ID itself is not found in the database
        throw new Error("Invalid Speaker ID.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      let message = 'Invalid Speaker ID or password. Please check your credentials or register.';
      if (error instanceof Error && (error.message.includes('auth/wrong-password') || error.message.includes('auth/invalid-credential'))) {
          message = 'Incorrect password. Please try again.';
      } else if (error instanceof Error && error.message.includes('Invalid Speaker ID')) {
          message = 'No user found with that Speaker ID.';
      } else if (error instanceof Error && error.message.includes('auth/invalid-api-key')) {
          message = 'The Firebase API key is not valid. Please check your configuration.';
      }


      toast({
        title: 'Login Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md shadow-xl bg-card">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Login to Your Account</CardTitle>
        <CardDescription>Enter your Speaker ID and Password to continue.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="speakerId" className="text-foreground">Speaker ID</Label>
            <Input
              id="speakerId"
              type="text"
              placeholder="e.g., id90000"
              {...register('speakerId')}
              className={errors.speakerId ? 'border-destructive' : ''}
            />
            {errors.speakerId && <p className="text-sm text-destructive">{errors.speakerId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-3">
          <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-5 w-5" />
            )}
            {isSubmitting ? 'Logging In...' : 'Login'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
