
'use client';

import { useState } from 'react';
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
import { mockUsers, validateUser } from '@/services/user-service'; // Using user-service

const loginSchema = z.object({
  speakerId: z.string().min(1, { message: 'Speaker ID is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLoginSuccess: (user: SpeakerProfile) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      speakerId: '',
      email: '',
    }
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsSubmitting(true);
    
    // Simulate API call for login
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = validateUser(data.speakerId, data.email);

    if (user) {
      toast({
        title: 'Login Successful!',
        description: `Welcome back, ${user.fullName}!`,
      });
      onLoginSuccess(user);
    } else {
      toast({
        title: 'Login Failed',
        description: 'Invalid Speaker ID or Email. Please check your credentials or register.',
        variant: 'destructive',
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full max-w-md shadow-xl bg-card">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Login to Your Account</CardTitle>
        <CardDescription>Enter your Speaker ID and Email to continue.</CardDescription>
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
            <Label htmlFor="email" className="text-foreground">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., user@example.com"
              {...register('email')}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
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
