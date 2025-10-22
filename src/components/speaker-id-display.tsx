
'use client';

import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, UserSquare2 } from 'lucide-react';

interface SpeakerIdDisplayProps {
  speakerId: string | undefined | null; 
  isLoading?: boolean; // Optional loading state, defaults to false
}

export function SpeakerIdDisplay({ speakerId, isLoading = false }: SpeakerIdDisplayProps) {
  const { toast } = useToast();

  const handleCopyId = () => {
    if (speakerId) {
      navigator.clipboard.writeText(speakerId)
        .then(() => {
          toast({
            title: "Speaker ID Copied!",
            description: "Your unique Speaker ID has been copied to the clipboard.",
          });
        })
        .catch(err => {
          console.error("Failed to copy Speaker ID: ", err);
          toast({
            title: "Copy Failed",
            description: "Could not copy Speaker ID. Please try again.",
            variant: "destructive",
          });
        });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          <UserSquare2 className="mr-3 h-6 w-6" />
          Your Unique Speaker ID
        </CardTitle>
        <CardDescription>
          This ID is unique to you and will be associated with your voice samples.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full rounded-md bg-muted" />
        ) : speakerId ? (
          <div className="flex items-center justify-between space-x-3 p-3 bg-secondary rounded-md">
            <p className="text-lg font-mono text-foreground flex-grow break-all">
              {speakerId}
            </p>
            <Button variant="ghost" size="icon" onClick={handleCopyId} aria-label="Copy Speaker ID" className="text-accent hover:text-accent/90">
              <Copy className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <p className="text-destructive font-medium p-3 bg-destructive/10 rounded-md">Speaker ID not available.</p>
        )}
      </CardContent>
    </Card>
  );
}
