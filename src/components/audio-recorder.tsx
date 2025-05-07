
'use client';

import { useState, useRef, useEffect, type RefObject } from 'react';
import { useSpeakerId } from '@/hooks/useSpeakerId';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, StopCircle, Send, Play, Download, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type RecordingStatus = 'idle' | 'recording' | 'stopped' | 'submitting' | 'error';

const MAX_RECORDING_TIME_MS = 30000; // 30 seconds

export function AudioRecorder() {
  const { speakerId, isLoading: isLoadingSpeakerId } = useSpeakerId();
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if(audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setErrorMessage(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    audioChunksRef.current = [];
    setRecordingTime(0);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Audio recording is not supported by your browser. Please use a modern browser like Chrome or Firefox.");
      setRecordingStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Using webm for better compatibility
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setRecordingStatus('stopped');
        stream.getTracks().forEach(track => track.stop()); // Release microphone
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      };
      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setErrorMessage("An error occurred during recording. Please try again.");
        setRecordingStatus('error');
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
         stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setRecordingStatus('recording');

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prevTime => {
          const newTime = prevTime + 100;
          if (newTime >= MAX_RECORDING_TIME_MS) {
            stopRecording();
          }
          return newTime;
        });
      }, 100);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      if (err instanceof DOMException && (err.name === "NotFoundError" || err.name === "DevicesNotFoundError")) {
        setErrorMessage("No microphone found. Please connect a microphone and grant permission.");
      } else if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setErrorMessage("Microphone access denied. Please grant permission in your browser settings.");
      } else {
        setErrorMessage("Could not access microphone. Please ensure it's connected and permissions are granted.");
      }
      setRecordingStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingStatus('idle');
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordingTime(0);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  }

  const handleSubmit = async () => {
    if (!audioUrl || !speakerId) {
      toast({
        title: 'Submission Error',
        description: 'No audio recorded or Speaker ID is missing. Please record audio and ensure your Speaker ID is displayed.',
        variant: 'destructive',
      });
      return;
    }

    setRecordingStatus('submitting');
    toast({
      title: 'Submitting Audio...',
      description: `Submitting sample for Speaker ID: ${speakerId.id}`,
    });

    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
    
    console.log('Submitted audio for Speaker ID:', speakerId.id);
    // In a real app, you'd send `audioBlob` (from `new Blob(audioChunksRef.current, { type: 'audio/webm' })`) to your backend.
    // const audioBlob = await fetch(audioUrl).then(res => res.blob()); // This fetches the blob again, better to use audioChunksRef.current
    // const formData = new FormData();
    // formData.append('audio', new Blob(audioChunksRef.current, { type: 'audio/webm' }), `voiceid_lanka_sample_${speakerId.id}.webm`);
    // formData.append('speakerId', speakerId.id);
    // try {
    //   const response = await fetch('/api/submit-audio', { method: 'POST', body: formData });
    //   if (!response.ok) throw new Error('Submission failed');
    //   toast({ title: 'Submission Successful!', description: 'Your audio sample has been submitted.' });
    //   resetRecording();
    // } catch (error) {
    //   toast({ title: 'Submission Failed', description: 'Could not submit your audio. Please try again.', variant: 'destructive' });
    //   setRecordingStatus('stopped'); // Or 'error' if you prefer
    // }

    toast({
      title: 'Submission Successful!',
      description: 'Your audio sample has been submitted for verification.',
      variant: 'default', // Explicitly set for success
    });
    resetRecording(); // Resets to 'idle'
  };

  const recordingProgress = (recordingTime / MAX_RECORDING_TIME_MS) * 100;
  const isActionDisabled = isLoadingSpeakerId || recordingStatus === 'recording' || recordingStatus === 'submitting';

  return (
    <Card className="w-full max-w-md shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          <Mic className="mr-3 h-6 w-6" />
          Record Your Voice
        </CardTitle>
        <CardDescription>
          Please record a clear audio clip of your voice. Maximum {MAX_RECORDING_TIME_MS / 1000} seconds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {errorMessage && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive-foreground flex items-center border border-destructive">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {recordingStatus === 'recording' && (
          <div className="space-y-2">
            <p className="text-center text-destructive font-medium animate-pulse">Recording... Speak clearly.</p>
            <Progress value={recordingProgress} className="w-full [&>div]:bg-primary" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.floor(recordingTime / 1000)}s / {MAX_RECORDING_TIME_MS / 1000}s
            </p>
          </div>
        )}

        {audioUrl && (recordingStatus === 'stopped' || recordingStatus === 'submitting') && (
          <div className="space-y-3">
            <p className="font-medium text-center text-primary">Recording complete! Preview below.</p>
            <audio controls src={audioUrl} className="w-full rounded-md" />
            <div className="flex justify-center space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => {
                const a = document.createElement('a');
                a.href = audioUrl;
                a.download = `voiceid_lanka_sample_${speakerId?.id || 'unknown'}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                // URL.revokeObjectURL(audioUrl) is handled in useEffect cleanup
              }} disabled={recordingStatus === 'submitting'}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
               <Button variant="destructive" size="sm" onClick={resetRecording} disabled={recordingStatus === 'submitting'}>
                <Trash2 className="mr-2 h-4 w-4" /> Discard & Re-record
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
          {(recordingStatus === 'idle' || recordingStatus === 'error' || recordingStatus === 'stopped') && (
            <Button 
              onClick={startRecording} 
              disabled={!speakerId || isActionDisabled || isLoadingSpeakerId} 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoadingSpeakerId ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mic className="mr-2 h-5 w-5" />}
              {isLoadingSpeakerId ? 'Loading ID...' : 'Start Recording'}
            </Button>
          )}

          {recordingStatus === 'recording' && (
            <Button 
              onClick={stopRecording} 
              variant="destructive" 
              className="w-full sm:w-auto"
            >
              <StopCircle className="mr-2 h-5 w-5" /> Stop Recording
            </Button>
          )}
        </div>
         {isLoadingSpeakerId && recordingStatus === 'idle' && (
            <p className="text-xs text-muted-foreground text-center">Please wait, generating your Speaker ID...</p>
        )}
        {!speakerId && !isLoadingSpeakerId && recordingStatus === 'idle' && (
            <p className="text-xs text-destructive text-center">Cannot record without a Speaker ID. Please refresh.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={recordingStatus !== 'stopped' || !audioUrl || !speakerId || isActionDisabled} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {recordingStatus === 'submitting' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
          {recordingStatus === 'submitting' ? 'Submitting...' : 'Submit Audio Sample'}
        </Button>
      </CardFooter>
    </Card>
  );
}

