
'use client';

import { useState, useRef, useEffect, type RefObject } from 'react';
import { useSpeakerId } from '@/hooks/useSpeakerId';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, StopCircle, Send, Play, Download, AlertTriangle, Trash2, Loader2, ChevronRight, ChevronLeft, RefreshCcw, BrainCircuit } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generateReadingPhrase } from '@/ai/flows/generate-reading-phrase-flow'; // New AI flow

type RecordingStatus = 'idle' | 'recording' | 'stopped' | 'submitting' | 'error' | 'generating_phrase';

const MAX_RECORDING_TIME_MS = 20000; // 20 seconds, increased to accommodate longer phrases
const NUMBER_OF_PHRASES_TO_RECORD = 5;

// For now, default to Sinhala. This should be determined by user's profile later.
const currentLanguage = 'Sinhala'; // or 'Tamil'
// Phrases are now generated dynamically

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
  
  const [currentPhrase, setCurrentPhrase] = useState<string | null>(null);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0); // Tracks which phrase number we are on

  const [recordedSamples, setRecordedSamples] = useState<Array<{ phraseIndex: number; audioUrl: string; speakerId: string | undefined; fileName: string, phraseText: string }>>([]);

  const fetchNewPhrase = async () => {
    setRecordingStatus('generating_phrase');
    setCurrentPhrase(null);
    setErrorMessage(null);
    try {
      const generatedPhrase = await generateReadingPhrase({ language: currentLanguage });
      setCurrentPhrase(generatedPhrase.phrase);
      setRecordingStatus('idle');
    } catch (error) {
      console.error("Error generating phrase:", error);
      setErrorMessage("Could not generate a new phrase. Please try again.");
      setRecordingStatus('error');
      toast({
        title: "Phrase Generation Failed",
        description: "Could not fetch a new reading phrase.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (speakerId && currentPhraseIndex < NUMBER_OF_PHRASES_TO_RECORD && !currentPhrase && recordingStatus !== 'generating_phrase') {
      fetchNewPhrase();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakerId, currentPhraseIndex, recordingStatus]); // currentPhrase removed to prevent re-fetch when currentPhrase is set

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
    if (audioUrl && speakerId && currentPhrase) {
      const fileName = `${speakerId.id}_phrase${currentPhraseIndex + 1}.webm`;
      setRecordedSamples(prev => [...prev, { phraseIndex: currentPhraseIndex, audioUrl, speakerId: speakerId.id, fileName, phraseText: currentPhrase }]);
      setAudioUrl(null); // Clear current audio for next recording
      setCurrentPhrase(null); // Clear current phrase text
      
      if (currentPhraseIndex < NUMBER_OF_PHRASES_TO_RECORD - 1) {
        setCurrentPhraseIndex(prev => prev + 1);
        // fetchNewPhrase() will be called by useEffect
      } else {
        toast({ title: "All Phrases Recorded!", description: "You can now submit all samples." });
        setRecordingStatus('idle'); // Or a new status like 'all_recorded'
        setCurrentPhraseIndex(prev => prev + 1); // Move past the last index
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
    // Optionally re-fetch phrase if user wants to re-record current phrase instead of moving on
    // For now, it just resets the recording state, keeping the current phrase
  };

  const discardAllSamples = () => {
    recordedSamples.forEach(sample => URL.revokeObjectURL(sample.audioUrl));
    setRecordedSamples([]);
    setCurrentPhraseIndex(0);
    setCurrentPhrase(null); // This will trigger a new phrase fetch via useEffect
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

    for (const sample of recordedSamples) {
      await new Promise(resolve => setTimeout(resolve, 500)); 
      console.log('Submitted audio:', sample.fileName, 'for Speaker ID:', sample.speakerId, 'Phrase:', sample.phraseText);
      // In a real app:
      // const audioBlob = await fetch(sample.audioUrl).then(res => res.blob());
      // const formData = new FormData();
      // formData.append('audio', audioBlob, sample.fileName);
      // formData.append('speakerId', sample.speakerId);
      // formData.append('phraseIndex', sample.phraseIndex.toString());
      // formData.append('language', currentLanguage);
      // formData.append('phraseText', sample.phraseText);
      // await fetch('/api/submit-audio', { method: 'POST', body: formData });
    }
    
    toast({
      title: 'All Samples Submitted!',
      description: 'Your audio samples have been submitted for verification.',
      variant: 'default',
    });
    setRecordedSamples([]);
    setCurrentPhraseIndex(0);
    setCurrentPhrase(null); // Trigger new phrase fetch for next session
    resetCurrentRecording(); 
  };

  const recordingProgress = (recordingTime / MAX_RECORDING_TIME_MS) * 100;
  const isActionDisabled = isLoadingSpeakerId || recordingStatus === 'recording' || recordingStatus === 'submitting' || recordingStatus === 'generating_phrase';
  const allPhrasesRecorded = currentPhraseIndex >= NUMBER_OF_PHRASES_TO_RECORD && audioUrl === null && recordedSamples.length === NUMBER_OF_PHRASES_TO_RECORD;


  return (
    <Card className="w-full max-w-lg shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          <Mic className="mr-3 h-6 w-6" />
          Record Your Voice (Phrase {Math.min(currentPhraseIndex + 1, NUMBER_OF_PHRASES_TO_RECORD)} of {NUMBER_OF_PHRASES_TO_RECORD})
        </CardTitle>
        <CardDescription>
          Read the following phrase clearly. Max {MAX_RECORDING_TIME_MS / 1000}s per phrase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-md bg-muted min-h-[80px] flex items-center justify-center">
            {recordingStatus === 'generating_phrase' && (
                <div className="text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2 text-primary" />
                    <p className="text-sm">Generating a new phrase for you...</p>
                </div>
            )}
            {currentPhrase && recordingStatus !== 'generating_phrase' && (
                <p className="text-lg font-semibold text-center text-foreground">
                    {currentPhrase}
                </p>
            )}
            {!currentPhrase && recordingStatus === 'idle' && currentPhraseIndex < NUMBER_OF_PHRASES_TO_RECORD && (
                 <p className="text-sm text-muted-foreground">Waiting for phrase...</p>
            )}
             {allPhrasesRecorded && (
                <p className="text-lg font-semibold text-center text-primary">All phrases recorded. Ready to submit!</p>
            )}
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

        {audioUrl && (recordingStatus === 'stopped' || recordingStatus === 'submitting') && currentPhrase && (
          <div className="space-y-3">
            <p className="font-medium text-center text-primary">Preview for phrase {currentPhraseIndex + 1}</p>
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
        
        {/* Button to manually fetch new phrase if generation fails */}
        {recordingStatus === 'error' && !currentPhrase && currentPhraseIndex < NUMBER_OF_PHRASES_TO_RECORD && (
          <Button onClick={fetchNewPhrase} variant="outline" className="w-full sm:w-auto" disabled={isActionDisabled}>
            <BrainCircuit className="mr-2 h-5 w-5" />
            Try Generating Phrase Again
          </Button>
        )}


        <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
          {(recordingStatus === 'idle' || recordingStatus === 'error') && !allPhrasesRecorded && currentPhrase && (
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
            <p className="text-xs text-muted-foreground text-center">Please wait, fetching your Speaker ID...</p>
        )}
        {!speakerId && !isLoadingSpeakerId && recordingStatus === 'idle' && (
            <p className="text-xs text-destructive text-center">Cannot record without a Speaker ID. Please refresh or register.</p>
        )}
        
        {recordedSamples.length > 0 && (
            <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Recorded Samples: {recordedSamples.length} / {NUMBER_OF_PHRASES_TO_RECORD}</h4>
                 <Progress value={(recordedSamples.length / NUMBER_OF_PHRASES_TO_RECORD) * 100} className="w-full h-2 [&>div]:bg-accent" />
            </div>
        )}

      </CardContent>
      <CardFooter className="flex flex-col space-y-3">
        <Button 
          onClick={handleSubmitAll} 
          disabled={recordingStatus === 'submitting' || recordedSamples.length === 0 || recordedSamples.length < NUMBER_OF_PHRASES_TO_RECORD || !speakerId} 
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
