
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateSpeakerId, type SpeakerProfile } from '@/services/speaker-id'; 
import { Loader2, UserPlus } from 'lucide-react';
// import { useRouter } from 'next/navigation'; // If redirection is needed after registration

// Basic regex for Sri Lankan WhatsApp numbers (starts with 07 or +947, followed by 8 digits)
// This is a basic validation, a more robust one might be needed for production
const whatsappRegex = /^(?:\+94|0)?7[0-9]{8}$/;

const registrationSchema = z.object({
  fullName: z.string().min(3, { message: 'Full name must be at least 3 characters.' }).max(50),
  email: z.string().email({ message: "Invalid email address." }),
  whatsappNumber: z.string().regex(whatsappRegex, { message: 'Invalid WhatsApp number. Use format like +947XXXXXXXX or 07XXXXXXXX.' }),
  language: z.enum(['Sinhala', 'Tamil'], { required_error: 'Please select your primary language.' }),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export function RegistrationForm() {
  const { toast } = useToast();
  // const router = useRouter(); // For redirection
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedSpeakerId, setGeneratedSpeakerId] = useState<string | null>(null);


  const {
    register,
    handleSubmit,
    formState: { errors },
    control, // for react-hook-form's Controller
    reset,
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      whatsappNumber: '',
      language: undefined, // Default to undefined for Select placeholder
    }
  });

  const onSubmit: SubmitHandler<RegistrationFormValues> = async (data) => {
    setIsSubmitting(true);
    setGeneratedSpeakerId(null);

    try {
      const speakerIdObj = await generateSpeakerId(); 
      const newSpeakerId = speakerIdObj.id;
      
      const speakerProfile: SpeakerProfile = {
        speakerId: newSpeakerId,
        fullName: data.fullName,
        email: data.email,
        whatsappNumber: data.whatsappNumber,
        language: data.language,
      };

      // Simulate storing user data (e.g., in Firestore)
      console.log('User Registered:', speakerProfile);
      // Example: await createUserInFirestore(speakerProfile);

      setGeneratedSpeakerId(newSpeakerId);

      toast({
        title: 'Registration Successful!',
        description: `Welcome, ${data.fullName}! Your Speaker ID is ${newSpeakerId}.`,
      });
      reset(); // Reset form fields
      // Optionally redirect: router.push('/dashboard'); 
    } catch (error) {
      console.error('Registration failed:', error);
      toast({
        title: 'Registration Failed',
        description: 'An error occurred during registration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full shadow-xl bg-card">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Create Your Account</CardTitle>
        <CardDescription>Enter your details to get started.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="e.g., Kamal Perera"
              {...register('fullName')}
              className={errors.fullName ? 'border-destructive' : ''}
            />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
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

          <div className="space-y-2">
            <Label htmlFor="whatsappNumber" className="text-foreground">WhatsApp Number</Label>
            <Input
              id="whatsappNumber"
              type="tel"
              placeholder="e.g., +94771234567 or 0771234567"
              {...register('whatsappNumber')}
              className={errors.whatsappNumber ? 'border-destructive' : ''}
            />
            {errors.whatsappNumber && <p className="text-sm text-destructive">{errors.whatsappNumber.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="language" className="text-foreground">Primary Language</Label>
            <Controller
              name="language"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="language" className={errors.language ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sinhala">Sinhala (සිංහල)</SelectItem>
                    <SelectItem value="Tamil">Tamil (தமிழ்)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.language && <p className="text-sm text-destructive">{errors.language.message}</p>}
          </div>
          
        </CardContent>
        <CardFooter className="flex flex-col items-stretch space-y-4">
           <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-5 w-5" />
            )}
            {isSubmitting ? 'Registering...' : 'Register'}
          </Button>
          {generatedSpeakerId && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary rounded-md text-center">
              <p className="text-sm text-primary">
                Registration successful! Your Speaker ID: <strong>{generatedSpeakerId}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Please note down your Speaker ID for future reference.</p>
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
