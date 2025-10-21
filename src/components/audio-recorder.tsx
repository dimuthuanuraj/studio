
'use client';

import { useState, useRef, useEffect, type RefObject } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, StopCircle, Send, Play, Download, AlertTriangle, Trash2, Loader2, ChevronRight, RefreshCcw, BrainCircuit, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generateReadingPhrase } from '@/ai/flows/generate-reading-phrase-flow';
import type { SpeakerProfile } from '@/contexts/auth-context'; 
import { uploadAudioToDriveAction } from '@/app/actions/audioDriveActions';

type RecordingStatus = 'idle' | 'recording' | 'stopped' | 'submitting' | 'error' | 'generating_phrase' | 'all_recorded';
type RecordingLanguage = 'Sinhala' | 'Tamil' | 'English';

const MAX_RECORDING_TIME_MS = 20000; 
const NUMBER_OF_PHRASES_TO_RECORD = 5;

interface AudioRecorderProps {
  userProfile: SpeakerProfile | null; 
  sessionLanguage: RecordingLanguage; 
}

// Store local preview URLs with Drive file IDs
interface RecordedSampleInfo {
  localAudioUrl: string; // Blob URL for local preview
  driveFileId?: string;   // ID from Drive after successful upload
  driveFileName?: string; // Filename in Drive
  phraseIndex: number;
  speakerId: string;
  phraseText: string;
  language: RecordingLanguage;
}


export function AudioRecorder({ userProfile, sessionLanguage }: AudioRecorderProps) {
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [currentPreviewAudioUrl, setCurrentPreviewAudioUrl] = useState<string | null>(null); // For the immediate recording
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [currentPhrase, setCurrentPhrase] = useState<string | null>(null);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  const [recordedSamplesInfo, setRecordedSamplesInfo] = useState<RecordedSampleInfo[]>([]);

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

  useEffect(() => {
    setRecordedSamplesInfo([]); 
    setCurrentPhraseIndex(0);
    if (currentPreviewAudioUrl) URL.revokeObjectURL(currentPreviewAudioUrl);
    setCurrentPreviewAudioUrl(null); 
    setRecordingStatus('idle'); 
    if (userProfile && sessionLanguage) {
      fetchNewPhrase();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLanguage, userProfile]); 


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
      if(currentPreviewAudioUrl) {
        URL.revokeObjectURL(currentPreviewAudioUrl);
      }
      recordedSamplesInfo.forEach(sample => {
        if(sample.localAudioUrl.startsWith('blob:')){
            URL.revokeObjectURL(sample.localAudioUrl)
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPreviewAudioUrl]); 


  const startRecording = async () => {
    setErrorMessage(null);
    if (currentPreviewAudioUrl) {
      URL.revokeObjectURL(currentPreviewAudioUrl);
      setCurrentPreviewAudioUrl(null);
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
        setCurrentPreviewAudioUrl(url);
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

  const saveAndNextPhrase = async () => {
    if (!currentPreviewAudioUrl || !speakerId || !currentPhrase || !sessionLanguage || !userProfile) {
        toast({ title: "Error", description: "Missing required information to save.", variant: "destructive"});
        return;
    }
    setRecordingStatus('submitting'); // Indicate "saving to drive"
    
    const audioBlob = await fetch(currentPreviewAudioUrl).then(r => r.blob());
    const formData = new FormData();
    formData.append('audioBlob', audioBlob, `phrase_${currentPhraseIndex + 1}.webm`);

    try {
        const result = await uploadAudioToDriveAction(formData, userProfile, sessionLanguage, currentPhraseIndex, currentPhrase);

        if (result.success && result.fileId && result.fileName) {
            const newSampleInfo: RecordedSampleInfo = {
                localAudioUrl: currentPreviewAudioUrl, // Keep local URL for now, might be revoked later
                driveFileId: result.fileId,
                driveFileName: result.fileName,
                phraseIndex: currentPhraseIndex,
                speakerId,
                phraseText: currentPhrase,
                language: sessionLanguage,
            };
            setRecordedSamplesInfo(prev => [...prev, newSampleInfo]);
            setCurrentPreviewAudioUrl(null); // Clear current preview as it's "saved"
            setCurrentPhrase(null);

            toast({ title: `Phrase ${currentPhraseIndex + 1} Saved`, description: `"${result.fileName}" uploaded to Drive.`, variant: "default" });

            if (currentPhraseIndex < NUMBER_OF_PHRASES_TO_RECORD - 1) {
                setCurrentPhraseIndex(prev => prev + 1);
                setRecordingStatus('idle'); // Fetch next phrase
            } else {
                toast({ title: "All Phrases Recorded!", description: `You have recorded all ${NUMBER_OF_PHRASES_TO_RECORD} phrases in ${sessionLanguage}.`, variant: "default" });
                setRecordingStatus('all_recorded');
                setCurrentPhraseIndex(prev => prev + 1);
            }
        } else {
            toast({ title: "Upload Failed", description: result.error || "Could not save to Drive.", variant: "destructive"});
            setRecordingStatus('stopped'); // Revert to stopped so user can try saving again
        }
    } catch (error) {
        console.error("Error saving to Drive:", error);
        toast({ title: "Upload Exception", description: "An error occurred while saving.", variant: "destructive"});
        setRecordingStatus('stopped');
    }
  };

  const resetCurrentRecording = () => {
    if (currentPreviewAudioUrl) {
        URL.revokeObjectURL(currentPreviewAudioUrl);
    }
    setCurrentPreviewAudioUrl(null);
    setRecordingStatus('idle');
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordingTime(0);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const discardAllSamplesAndRestartSession = () => {
    recordedSamplesInfo.forEach(sample => {
        if(sample.localAudioUrl.startsWith('blob:')){
             URL.revokeObjectURL(sample.localAudioUrl);
        }
        // Note: We are not deleting from Drive here, only local session state.
        // A real "discard" might involve deleting from Drive as well.
    });
    setRecordedSamplesInfo([]);
    setCurrentPhraseIndex(0);
    setCurrentPhrase(null); 
    resetCurrentRecording(); 
    toast({ title: `All local progress for ${sessionLanguage} discarded.`, description: "Starting phrase collection again.", variant: "default" });
    fetchNewPhrase(); 
  }

  // This function is now more of a conceptual "session complete" since individual uploads happen
  const handleSubmitAll = async () => {
    if (recordedSamplesInfo.length < NUMBER_OF_PHRASES_TO_RECORD) {
      toast({
        title: 'Session Not Complete',
        description: `Please record and save all ${NUMBER_OF_PHRASES_TO_RECORD} phrases in ${sessionLanguage}.`,
        variant: 'destructive',
      });
      return;
    }
    if (!speakerId) {
        toast({ title: 'Submission Error', description: 'Speaker ID is missing.', variant: 'destructive' });
        return;
    }

    // All files are already "submitted" to Drive one by one.
    // This function can now just confirm completion and reset.
    setRecordingStatus('submitting'); // Show a final "submitting" state for UX
    
    toast({
      title: `Session for ${sessionLanguage} Complete!`,
      description: `All ${recordedSamplesInfo.length} audio samples in ${sessionLanguage} have been uploaded to Google Drive.`,
      variant: 'default',
    });
    
    // Clean up local blob URLs (as they are now on Drive)
    recordedSamplesInfo.forEach(sample => {
        if (sample.localAudioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(sample.localAudioUrl);
        }
    });

    setRecordedSamplesInfo([]); // Clear the local list of recorded samples
    setCurrentPhraseIndex(0);
    setCurrentPhrase(null); 
    resetCurrentRecording(); 
    setRecordingStatus('idle'); 
    // Optionally fetch a new phrase if user stays on page, or let them navigate
    // fetchNewPhrase(); 
  };

  const recordingProgress = (recordingTime / MAX_RECORDING_TIME_MS) * 100;
  const isActionDisabled = !userProfile || recordingStatus === 'recording' || recordingStatus === 'submitting' || recordingStatus === 'generating_phrase' || !sessionLanguage;
  const allPhrasesRecordedForSession = currentPhraseIndex >= NUMBER_OF_PHRASES_TO_RECORD && recordedSamplesInfo.length === NUMBER_OF_PHRASES_TO_RECORD;


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
                    <p className="text-lg font-semibold">All {sessionLanguage} phrases recorded and saved!</p>
                    <p className="text-sm text-muted-foreground">You can now finalize the session.</p>
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

        {currentPreviewAudioUrl && (recordingStatus === 'stopped' || recordingStatus === 'submitting') && currentPhrase && (
          <div className="space-y-3 p-3 bg-secondary/50 rounded-md border">
            <p className="font-medium text-center text-primary">Preview for {sessionLanguage} phrase {currentPhraseIndex + 1}:</p>
            <audio controls src={currentPreviewAudioUrl} className="w-full rounded-md shadow-sm" aria-label={`Audio preview for phrase ${currentPhraseIndex + 1}`} />
            <div className="flex justify-center space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => {
                if (!currentPreviewAudioUrl) return;
                const a = document.createElement('a');
                a.href = currentPreviewAudioUrl;
                a.download = `${speakerId || 'unknown-speaker'}_${sessionLanguage.toLowerCase()}_phrase${currentPhraseIndex + 1}_preview.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                 toast({ title: "Audio Downloaded", description: "The preview audio has been downloaded."});
              }} disabled={recordingStatus === 'submitting'}>
                <Download className="mr-2 h-4 w-4" /> Download Preview
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
              disabled={!speakerId || isActionDisabled || !!currentPreviewAudioUrl || !sessionLanguage || !currentPhrase} 
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

          {(recordingStatus === 'stopped' || recordingStatus === 'submitting') && currentPreviewAudioUrl && !allPhrasesRecordedForSession && (
             <Button 
              onClick={saveAndNextPhrase} 
              disabled={!speakerId || isActionDisabled || !currentPreviewAudioUrl} 
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground text-base py-3 px-6"
              size="lg"
            >
              {recordingStatus === 'submitting' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
              {recordingStatus === 'submitting' ? `Saving Phrase ${currentPhraseIndex + 1}...` : `Save Phrase ${currentPhraseIndex + 1} & Next`} 
              {recordingStatus !== 'submitting' && <ChevronRight className="ml-2 h-5 w-5" /> }
            </Button>
          )}
        </div>
        {!speakerId && recordingStatus === 'idle' && (
            <p className="text-xs text-destructive text-center mt-2">Cannot record without a Speaker ID. Please log in.</p>
        )}
        
        {(recordedSamplesInfo.length > 0 || recordingStatus === 'all_recorded') && (
            <div className="mt-6 space-y-2">
                <h4 className="text-md font-medium text-muted-foreground text-center">
                  {sessionLanguage} Recording Progress: {recordedSamplesInfo.length} / {NUMBER_OF_PHRASES_TO_RECORD} Saved
                </h4>
                 <Progress value={(recordedSamplesInfo.length / NUMBER_OF_PHRASES_TO_RECORD) * 100} className="w-full h-3 [&>div]:bg-accent shadow-sm" />
            </div>
        )}

      </CardContent>
      <CardFooter className="flex flex-col items-stretch space-y-3 pt-6 border-t">
        <Button 
          onClick={handleSubmitAll} 
          disabled={recordingStatus === 'submitting' || !allPhrasesRecordedForSession || !speakerId} 
          className="w-full bg-green-600 hover:bg-green-700 text-white text-base py-3 px-6"
          size="lg"
        >
          {recordingStatus === 'submitting' && !allPhrasesRecordedForSession ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
          {recordingStatus === 'submitting' && !allPhrasesRecordedForSession ? `Finalizing ${sessionLanguage} Session...` : `Finalize ${sessionLanguage} Session (${recordedSamplesInfo.length})`}
        </Button>
        
        {(recordedSamplesInfo.length > 0 || currentPhraseIndex > 0) && recordingStatus !== 'submitting' && (
             <Button variant="outline" onClick={discardAllSamplesAndRestartSession} className="w-full text-base py-3 px-6 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" size="lg">
                <RefreshCcw className="mr-2 h-4 w-4" /> Discard All & Restart {sessionLanguage} Session
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
