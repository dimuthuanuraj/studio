
'use client';

import { useState, useRef, useEffect, type RefObject } from 'react';
import { useSpeakerId } from '@/hooks/useSpeakerId';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, StopCircle, Send, Play, Download, AlertTriangle, Trash2, Loader2, ChevronRight, ChevronLeft, RefreshCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type RecordingStatus = 'idle' | 'recording' | 'stopped' | 'submitting' | 'error';

const MAX_RECORDING_TIME_MS = 30000; // 30 seconds

// Predefined phrases - assuming user language is Sinhala for now
// TODO: Dynamically load phrases based on registered user's language
const sinhalaPhrases = [
  "මාගේ නම [ඔබගේ නම]", // My name is [Your Name]
  "අද හොඳ දවසක්", // Today is a good day
  "කරුණාකර මෙය නැවත කියන්න", // Please say this again
  "ශ්‍රී ලංකාව ලස්සන රටක්", // Sri Lanka is a beautiful country
  "මට සිංහල කතා කරන්න පුළුවන්" // I can speak Sinhala
];

const tamilPhrases = [
  "என் பெயர் [உங்கள் பெயர்]", // My name is [Your Name]
  "இன்று நல்ல நாள்", // Today is a good day
  "தயவுசெய்து இதை மீண்டும் சொல்லுங்கள்", // Please say this again
  "இலங்கை ஒரு அழகான நாடு", // Sri Lanka is a beautiful country
  "என்னால் தமிழ் பேச முடியும்" // I can speak Tamil
];

// For now, default to Sinhala. This should be determined by user's profile later.
const currentLanguage = 'Sinhala'; // or 'Tamil'
const phrases = currentLanguage === 'Sinhala' ? sinhalaPhrases : tamilPhrases;

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
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [recordedSamples, setRecordedSamples] = useState<Array<{ phraseIndex: number; audioUrl: string; speakerId: string | undefined; fileName: string }>>([]);

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
      recordedSamples.forEach(sample => URL.revokeObjectURL(sample.audioUrl));
    };
  }, [audioUrl, recordedSamples]);

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
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setRecordingStatus('stopped');
        stream.getTracks().forEach(track => track.stop());
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

  const saveAndNextPhrase = () => {
    if (audioUrl && speakerId) {
      const fileName = `${speakerId.id}_phrase${currentPhraseIndex + 1}.webm`;
      setRecordedSamples(prev => [...prev, { phraseIndex: currentPhraseIndex, audioUrl, speakerId: speakerId.id, fileName }]);
      setAudioUrl(null); // Clear current audio for next recording
      
      if (currentPhraseIndex < phrases.length - 1) {
        setCurrentPhraseIndex(prev => prev + 1);
        setRecordingStatus('idle');
      } else {
        toast({ title: "All Phrases Recorded!", description: "You can now submit all samples." });
        setRecordingStatus('idle'); // Or a new status like 'all_recorded'
      }
    }
  };

  const resetCurrentRecording = () => {
    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingStatus('idle');
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordingTime(0);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const discardAllSamples = () => {
    recordedSamples.forEach(sample => URL.revokeObjectURL(sample.audioUrl));
    setRecordedSamples([]);
    setCurrentPhraseIndex(0);
    resetCurrentRecording();
    toast({ title: "All samples discarded.", variant: "default" });
  }

  const handleSubmitAll = async () => {
    if (recordedSamples.length === 0) {
      toast({
        title: 'Submission Error',
        description: 'No audio samples recorded. Please record samples for the phrases.',
        variant: 'destructive',
      });
      return;
    }
    if (!speakerId) {
        toast({ title: 'Submission Error', description: 'Speaker ID is missing.', variant: 'destructive' });
        return;
    }

    setRecordingStatus('submitting');
    toast({
      title: 'Submitting All Samples...',
      description: `Submitting ${recordedSamples.length} samples for Speaker ID: ${speakerId.id}`,
    });

    // Simulate API calls for each sample
    for (const sample of recordedSamples) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call per sample
      console.log('Submitted audio:', sample.fileName, 'for Speaker ID:', sample.speakerId);
      // In a real app, you'd send `sample.audioUrl` (or its blob) to your backend.
      // Example:
      // const audioBlob = await fetch(sample.audioUrl).then(res => res.blob());
      // const formData = new FormData();
      // formData.append('audio', audioBlob, sample.fileName);
      // formData.append('speakerId', sample.speakerId);
      // formData.append('phraseIndex', sample.phraseIndex.toString());
      // formData.append('language', currentLanguage);
      // await fetch('/api/submit-audio', { method: 'POST', body: formData });
    }
    
    toast({
      title: 'All Samples Submitted!',
      description: 'Your audio samples have been submitted for verification.',
      variant: 'default',
    });
    setRecordedSamples([]);
    setCurrentPhraseIndex(0);
    resetCurrentRecording(); // Resets to 'idle'
  };

  const recordingProgress = (recordingTime / MAX_RECORDING_TIME_MS) * 100;
  const isActionDisabled = isLoadingSpeakerId || recordingStatus === 'recording' || recordingStatus === 'submitting';
  const allPhrasesRecorded = currentPhraseIndex >= phrases.length -1 && audioUrl === null && recordedSamples.length === phrases.length;


  return (
    <Card className="w-full max-w-lg shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          <Mic className="mr-3 h-6 w-6" />
          Record Your Voice (Phrase {currentPhraseIndex + 1} of {phrases.length})
        </CardTitle>
        <CardDescription>
          Read the following phrase clearly. Max {MAX_RECORDING_TIME_MS / 1000}s per phrase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-md bg-muted min-h-[60px] flex items-center justify-center">
            <p className="text-lg font-semibold text-center text-foreground">
                {phrases[currentPhraseIndex]}
            </p>
        </div>

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
            <p className="font-medium text-center text-primary">Preview for "{phrases[currentPhraseIndex]}"</p>
            <audio controls src={audioUrl} className="w-full rounded-md" />
            <div className="flex justify-center space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => {
                const a = document.createElement('a');
                a.href = audioUrl;
                a.download = `${speakerId?.id || 'unknown'}_phrase${currentPhraseIndex + 1}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }} disabled={recordingStatus === 'submitting'}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
               <Button variant="destructive" size="sm" onClick={resetCurrentRecording} disabled={recordingStatus === 'submitting'}>
                <Trash2 className="mr-2 h-4 w-4" /> Re-record Phrase
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
          {(recordingStatus === 'idle' || recordingStatus === 'error') && !allPhrasesRecorded && (
            <Button 
              onClick={startRecording} 
              disabled={!speakerId || isActionDisabled || isLoadingSpeakerId || !!audioUrl} 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoadingSpeakerId ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mic className="mr-2 h-5 w-5" />}
              {isLoadingSpeakerId ? 'Loading ID...' : `Record Phrase ${currentPhraseIndex + 1}`}
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

          {recordingStatus === 'stopped' && audioUrl && !allPhrasesRecorded && (
             <Button 
              onClick={saveAndNextPhrase} 
              disabled={!speakerId || isActionDisabled || !audioUrl} 
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Save & Next Phrase <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
         {isLoadingSpeakerId && recordingStatus === 'idle' && (
            <p className="text-xs text-muted-foreground text-center">Please wait, generating your Speaker ID...</p>
        )}
        {!speakerId && !isLoadingSpeakerId && recordingStatus === 'idle' && (
            <p className="text-xs text-destructive text-center">Cannot record without a Speaker ID. Please refresh or register.</p>
        )}
        
        {recordedSamples.length > 0 && (
            <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Recorded Samples: {recordedSamples.length} / {phrases.length}</h4>
                 <Progress value={(recordedSamples.length / phrases.length) * 100} className="w-full h-2 [&>div]:bg-accent" />
                {allPhrasesRecorded && <p className="text-sm text-center text-primary font-medium">All phrases recorded! Ready to submit.</p>}
            </div>
        )}

      </CardContent>
      <CardFooter className="flex flex-col space-y-3">
        <Button 
          onClick={handleSubmitAll} 
          disabled={recordingStatus === 'submitting' || recordedSamples.length === 0 || recordedSamples.length < phrases.length || !speakerId} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {recordingStatus === 'submitting' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
          {recordingStatus === 'submitting' ? 'Submitting All...' : `Submit All (${recordedSamples.length}) Samples`}
        </Button>
        {recordedSamples.length > 0 && (
             <Button variant="outline" onClick={discardAllSamples} className="w-full" disabled={recordingStatus === 'submitting'}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Discard All & Restart
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
