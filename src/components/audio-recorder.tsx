
'use client';

import { useState, useRef, useEffect, type RefObject } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, StopCircle, Send, Play, Download, AlertTriangle, Trash2, Loader2, ChevronRight, RefreshCcw, BrainCircuit, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generateReadingPhrase } from '@/ai/flows/generate-reading-phrase-flow';
import type { SpeakerProfile } from '@/contexts/auth-context'; 

type RecordingStatus = 'idle' | 'recording' | 'stopped' | 'submitting' | 'error' | 'generating_phrase' | 'all_recorded';
type RecordingLanguage = 'Sinhala' | 'Tamil' | 'English';

const MAX_RECORDING_TIME_MS = 20000; 
const NUMBER_OF_PHRASES_TO_RECORD = 5;

interface AudioRecorderProps {
  userProfile: SpeakerProfile | null; 
  sessionLanguage: RecordingLanguage; 
}

export function AudioRecorder({ userProfile, sessionLanguage }: AudioRecorderProps) {
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [currentPhrase, setCurrentPhrase] = useState<string | null>(null);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  const [recordedSamples, setRecordedSamples] = useState<Array<{ phraseIndex: number; audioUrl: string; speakerId: string; fileName: string, phraseText: string, language: RecordingLanguage }>>([]);

  const speakerId = userProfile?.speakerId;


  const fetchNewPhrase = async () => {
    if (!sessionLanguage) {
      setErrorMessage("Session language not set. Cannot fetch phrase.");
      setRecordingStatus('error');
      return;
    }
    setRecordingStatus('generating_phrase');
    setCurrentPhrase(null);
    setErrorMessage(null);
    try {
      const generatedPhrase = await generateReadingPhrase({ language: sessionLanguage });
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

  // Effect to fetch a new phrase when sessionLanguage changes or when component mounts/resets for a new language
  useEffect(() => {
    setRecordedSamples([]); // Clear previous language samples
    setCurrentPhraseIndex(0);
    setAudioUrl(null); // Clear any previewed audio
    setRecordingStatus('idle'); // Reset status
    if (userProfile && sessionLanguage) {
      fetchNewPhrase();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLanguage, userProfile]); // Re-run when sessionLanguage or userProfile changes


  // Effect for phrase fetching logic based on currentPhraseIndex and status
  useEffect(() => {
    if (userProfile && sessionLanguage && currentPhraseIndex < NUMBER_OF_PHRASES_TO_RECORD && !currentPhrase && recordingStatus === 'idle') {
      fetchNewPhrase();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, sessionLanguage, currentPhraseIndex, currentPhrase, recordingStatus]);


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
      // Clean up previously created object URLs for recorded samples
      recordedSamples.forEach(sample => {
        if(sample.audioUrl.startsWith('blob:')){
            URL.revokeObjectURL(sample.audioUrl)
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Common compatible format
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
    if (audioUrl && speakerId && currentPhrase && sessionLanguage) {
      const fileName = `${speakerId}_${sessionLanguage.toLowerCase()}_phrase${currentPhraseIndex + 1}.webm`;
      const newSample = { phraseIndex: currentPhraseIndex, audioUrl, speakerId, fileName, phraseText: currentPhrase, language: sessionLanguage };
      setRecordedSamples(prev => [...prev, newSample]);
      
      // Important: Do not revoke audioUrl here yet if you want to keep it for a "list" of previews, 
      // but for this flow, we clear it for the next recording.
      // URL.revokeObjectURL(audioUrl); // This would make the saved sample's URL invalid if it's the same one.
      // Instead, create a new URL for each recording. The current `audioUrl` is for the *current* preview.
      
      setAudioUrl(null); 
      setCurrentPhrase(null); 
      
      if (currentPhraseIndex < NUMBER_OF_PHRASES_TO_RECORD - 1) {
        setCurrentPhraseIndex(prev => prev + 1);
        setRecordingStatus('idle'); // Ready for next phrase (will trigger fetchNewPhrase via useEffect)
      } else {
        toast({ title: "All Phrases Recorded!", description: `You have recorded all ${NUMBER_OF_PHRASES_TO_RECORD} phrases in ${sessionLanguage}. You can now submit.`, variant: "default" });
        setRecordingStatus('all_recorded'); 
        setCurrentPhraseIndex(prev => prev + 1); 
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
    // Do not fetch new phrase here, let user decide to re-record or if it's an error recovery.
  };

  const discardAllSamplesAndRestartSession = () => {
    recordedSamples.forEach(sample => {
        if(sample.audioUrl.startsWith('blob:')){
             URL.revokeObjectURL(sample.audioUrl);
        }
    });
    setRecordedSamples([]);
    setCurrentPhraseIndex(0);
    setCurrentPhrase(null); 
    resetCurrentRecording(); // Also resets current recording state
    toast({ title: `All samples for ${sessionLanguage} discarded.`, description: "Starting phrase collection again.", variant: "default" });
    fetchNewPhrase(); // Fetch the first phrase for the current sessionLanguage
  }

  const handleSubmitAll = async () => {
    if (recordedSamples.length < NUMBER_OF_PHRASES_TO_RECORD) {
      toast({
        title: 'Submission Error',
        description: `Please record all ${NUMBER_OF_PHRASES_TO_RECORD} phrases in ${sessionLanguage} before submitting.`,
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
      title: `Submitting Samples for ${sessionLanguage}...`,
      description: `Submitting ${recordedSamples.length} samples for Speaker ID: ${speakerId}`,
    });

    // Simulate submission
    for (const sample of recordedSamples) {
      await new Promise(resolve => setTimeout(resolve, 500)); 
      console.log('Submitted audio:', sample.fileName, 'for Speaker ID:', sample.speakerId, 'Phrase:', sample.phraseText, 'Language:', sample.language);
      // In a real app:
      // 1. Fetch the blob from sample.audioUrl
      // const audioBlob = await fetch(sample.audioUrl).then(res => res.blob());
      // 2. Upload to Firebase Storage:
      //    const storageRef = ref(storage, `audio_samples/${sample.speakerId}/${sample.fileName}`);
      //    await uploadBytes(storageRef, audioBlob);
      //    const downloadURL = await getDownloadURL(storageRef);
      // 3. Save metadata (speakerId, phraseIndex, language, phraseText, downloadURL, timestamp) to Firestore
      //    await addDoc(collection(db, "audioSamples"), { ...sample, audioUrl: downloadURL, timestamp: serverTimestamp() });
      
      // For now, just clean up the local blob URL after "submission"
      if (sample.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(sample.audioUrl);
      }
    }
    
    toast({
      title: `All Samples for ${sessionLanguage} Submitted!`,
      description: `Your audio samples in ${sessionLanguage} have been successfully submitted.`,
      variant: 'default', // Success variant
    });
    
    setRecordedSamples([]);
    setCurrentPhraseIndex(0);
    setCurrentPhrase(null); 
    resetCurrentRecording(); 
    setRecordingStatus('idle'); // Reset for a new session or language change
    // Do not automatically fetch new phrase; user might want to change language or logout.
  };

  const recordingProgress = (recordingTime / MAX_RECORDING_TIME_MS) * 100;
  const isActionDisabled = !userProfile || recordingStatus === 'recording' || recordingStatus === 'submitting' || recordingStatus === 'generating_phrase' || !sessionLanguage;
  const allPhrasesRecordedForSession = currentPhraseIndex >= NUMBER_OF_PHRASES_TO_RECORD && recordedSamples.length === NUMBER_OF_PHRASES_TO_RECORD;


  if (!userProfile) {
    return (
        <Card className="w-full max-w-lg shadow-lg bg-card">
            <CardHeader>
                <CardTitle className="text-primary">Please Log In</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">You need to be logged in to record audio samples.</p>
            </CardContent>
        </Card>
    );
  }
  
  if (!sessionLanguage) {
     return (
        <Card className="w-full max-w-lg shadow-lg bg-card">
            <CardHeader>
                <CardTitle className="text-primary">Language Not Selected</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Please select a language on the previous page to start recording.</p>
            </CardContent>
        </Card>
    );
  }


  return (
    <Card className="w-full max-w-lg shadow-xl bg-card">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          <Mic className="mr-3 h-6 w-6" />
          Record in {sessionLanguage} (Phrase {Math.min(currentPhraseIndex + 1, NUMBER_OF_PHRASES_TO_RECORD)} of {NUMBER_OF_PHRASES_TO_RECORD})
        </CardTitle>
        <CardDescription>
          Read the following phrase clearly. Max {MAX_RECORDING_TIME_MS / 1000}s per phrase. Your native language: {userProfile.language}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-md bg-muted min-h-[100px] flex items-center justify-center text-center">
            {recordingStatus === 'generating_phrase' && (
                <div className="text-muted-foreground">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin mb-2 text-primary" />
                    <p>Generating new {sessionLanguage} phrase...</p>
                </div>
            )}
            {currentPhrase && recordingStatus !== 'generating_phrase' && recordingStatus !== 'all_recorded' && (
                <p className="text-xl font-semibold text-foreground leading-relaxed">
                    "{currentPhrase}"
                </p>
            )}
            {!currentPhrase && recordingStatus === 'idle' && currentPhraseIndex < NUMBER_OF_PHRASES_TO_RECORD && (
                 <p className="text-muted-foreground">Waiting for {sessionLanguage} phrase...</p>
            )}
            {recordingStatus === 'all_recorded' && (
                <div className="text-center text-primary space-y-2">
                    <CheckCircle className="h-10 w-10 mx-auto text-accent" />
                    <p className="text-lg font-semibold">All {sessionLanguage} phrases recorded!</p>
                    <p className="text-sm text-muted-foreground">You can now submit your recordings.</p>
                </div>
            )}
        </div>

        {errorMessage && (
          <div className="p-3 rounded-md bg-destructive/15 text-destructive-foreground flex items-center border border-destructive shadow-sm">
            <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {recordingStatus === 'recording' && (
          <div className="space-y-2">
            <p className="text-center text-destructive font-medium animate-pulse">Recording... Speak clearly into the microphone.</p>
            <Progress value={recordingProgress} className="w-full [&>div]:bg-primary" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.floor(recordingTime / 1000)}s / {MAX_RECORDING_TIME_MS / 1000}s
            </p>
          </div>
        )}

        {audioUrl && (recordingStatus === 'stopped' || recordingStatus === 'submitting') && currentPhrase && (
          <div className="space-y-3 p-3 bg-secondary/50 rounded-md border">
            <p className="font-medium text-center text-primary">Preview for {sessionLanguage} phrase {currentPhraseIndex + 1}:</p>
            <audio controls src={audioUrl} className="w-full rounded-md shadow-sm" aria-label={`Audio preview for phrase ${currentPhraseIndex + 1}`} />
            <div className="flex justify-center space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => {
                const a = document.createElement('a');
                a.href = audioUrl;
                a.download = `${speakerId || 'unknown-speaker'}_${sessionLanguage.toLowerCase()}_phrase${currentPhraseIndex + 1}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                 toast({ title: "Audio Downloaded", description: "The preview audio has been downloaded."});
              }} disabled={recordingStatus === 'submitting'}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
               <Button variant="destructive" size="sm" onClick={resetCurrentRecording} disabled={recordingStatus === 'submitting'}>
                <Trash2 className="mr-2 h-4 w-4" /> Re-record This Phrase
              </Button>
            </div>
          </div>
        )}
        
        {recordingStatus === 'error' && (!currentPhrase || currentPhraseIndex < NUMBER_OF_PHRASES_TO_RECORD) && (
          <Button onClick={fetchNewPhrase} variant="outline" className="w-full sm:w-auto" disabled={isActionDisabled || !sessionLanguage}>
            <BrainCircuit className="mr-2 h-5 w-5" />
            Try Generating Phrase Again
          </Button>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
          {(recordingStatus === 'idle' || recordingStatus === 'error') && !allPhrasesRecordedForSession && currentPhrase && (
            <Button 
              onClick={startRecording} 
              disabled={!speakerId || isActionDisabled || !!audioUrl || !sessionLanguage || !currentPhrase} 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3 px-6"
              size="lg"
            >
              <Mic className="mr-2 h-5 w-5" />
              {`Record Phrase ${currentPhraseIndex + 1}`}
            </Button>
          )}

          {recordingStatus === 'recording' && (
            <Button 
              onClick={stopRecording} 
              variant="destructive" 
              className="w-full sm:w-auto text-base py-3 px-6"
              size="lg"
            >
              <StopCircle className="mr-2 h-5 w-5" /> Stop Recording
            </Button>
          )}

          {recordingStatus === 'stopped' && audioUrl && !allPhrasesRecordedForSession && (
             <Button 
              onClick={saveAndNextPhrase} 
              disabled={!speakerId || isActionDisabled || !audioUrl} 
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground text-base py-3 px-6"
              size="lg"
            >
              Save & Next {sessionLanguage} Phrase <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
        {!speakerId && recordingStatus === 'idle' && (
            <p className="text-xs text-destructive text-center mt-2">Cannot record without a Speaker ID. Please log in.</p>
        )}
        
        {(recordedSamples.length > 0 || recordingStatus === 'all_recorded') && (
            <div className="mt-6 space-y-2">
                <h4 className="text-md font-medium text-muted-foreground text-center">
                  {sessionLanguage} Recording Progress: {recordedSamples.length} / {NUMBER_OF_PHRASES_TO_RECORD} Completed
                </h4>
                 <Progress value={(recordedSamples.length / NUMBER_OF_PHRASES_TO_RECORD) * 100} className="w-full h-3 [&>div]:bg-accent shadow-sm" />
            </div>
        )}

      </CardContent>
      <CardFooter className="flex flex-col items-stretch space-y-3 pt-6 border-t">
        <Button 
          onClick={handleSubmitAll} 
          disabled={recordingStatus === 'submitting' || recordingStatus !== 'all_recorded' || !speakerId} 
          className="w-full bg-green-600 hover:bg-green-700 text-white text-base py-3 px-6"
          size="lg"
        >
          {recordingStatus === 'submitting' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
          {recordingStatus === 'submitting' ? `Submitting ${sessionLanguage} Samples...` : `Submit All ${sessionLanguage} (${recordedSamples.length}) Samples`}
        </Button>
        
        {(recordedSamples.length > 0 || currentPhraseIndex > 0) && recordingStatus !== 'submitting' && (
             <Button variant="outline" onClick={discardAllSamplesAndRestartSession} className="w-full text-base py-3 px-6 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" size="lg">
                <RefreshCcw className="mr-2 h-4 w-4" /> Discard All & Restart {sessionLanguage} Session
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}

