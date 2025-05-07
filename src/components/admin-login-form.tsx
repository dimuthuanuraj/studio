
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
import { Loader2, ShieldCheck } from 'lucide-react';

const adminLoginSchema = z.object({
  username: z.string().min(1, { message: 'Username is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

interface AdminLoginFormProps {
  onLoginSuccess: () => void;
}

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'passwordadmin';

export function AdminLoginForm({ onLoginSuccess }: AdminLoginFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit: SubmitHandler<AdminLoginFormValues> = async (data) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    if (data.username === ADMIN_USERNAME && data.password === ADMIN_PASSWORD) {
      toast({
        title: 'Admin Login Successful!',
        description: 'Welcome, Admin!',
      });
      onLoginSuccess();
    } else {
      toast({
        title: 'Admin Login Failed',
        description: 'Invalid username or password.',
        variant: 'destructive',
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full max-w-md shadow-xl bg-card">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Admin Panel Login</CardTitle>
        <CardDescription>Enter administrator credentials to access the dashboard.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="admin"
              {...register('username')}
              className={errors.username ? 'border-destructive' : ''}
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
        <CardFooter>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            {isSubmitting ? 'Authenticating...' : 'Login as Admin'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
