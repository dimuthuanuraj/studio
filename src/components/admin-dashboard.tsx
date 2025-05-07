
'use client';

import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Play, Download, Eye, Users, FileAudio, CheckCircle2, XCircle, Hourglass, RefreshCw, Loader2, Languages, Mic2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type RecordingLanguage = 'Sinhala' | 'Tamil' | 'English';

interface AudioSample {
  id: string;
  speakerId: string;
  speakerName?: string;
  nativeLanguage?: 'Sinhala' | 'Tamil' | string; 
  recordedLanguage: RecordingLanguage; 
  timestamp: string;
  duration: string; 
  status: 'pending' | 'verified' | 'rejected';
  audioUrl?: string; 
  fileName?: string; 
  phraseIndex?: number;
}

const initialMockAudioSamples: AudioSample[] = [
  { id: 'sample001', speakerId: 'id90000', speakerName: 'Kamal Perera', nativeLanguage: 'Sinhala', recordedLanguage: 'Sinhala', timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), duration: '0:15', status: 'pending', fileName: 'id90000_sinhala_phrase1.webm', audioUrl: 'https://picsum.photos/10/10', phraseIndex: 1 },
  { id: 'sample002', speakerId: 'id90001', speakerName: 'Nimali Silva', nativeLanguage: 'Tamil', recordedLanguage: 'Tamil', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), duration: '0:22', status: 'verified', fileName: 'id90001_tamil_phrase2.webm', audioUrl: 'https://picsum.photos/10/10', phraseIndex: 2 },
  { id: 'sample003', speakerId: 'id90000', speakerName: 'Kamal Perera', nativeLanguage: 'Sinhala', recordedLanguage: 'English', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), duration: '0:10', status: 'rejected', fileName: 'id90000_english_phrase3.webm', audioUrl: 'https://picsum.photos/10/10', phraseIndex: 3 },
  { id: 'sample004', speakerId: 'id90002', speakerName: 'Saman Kumara', nativeLanguage: 'Sinhala', recordedLanguage: 'Sinhala', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), duration: '0:28', status: 'pending', fileName: 'id90002_sinhala_phrase1.webm', audioUrl: 'https://picsum.photos/10/10', phraseIndex: 1 }, // Assuming id90002 is a new speaker
  { id: 'sample005', speakerId: 'id90001', speakerName: 'Nimali Silva', nativeLanguage: 'Tamil', recordedLanguage: 'English', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), duration: '0:19', status: 'verified', fileName: 'id90001_english_phrase4.webm', audioUrl: 'https://picsum.photos/10/10', phraseIndex: 4 },
];


export function AdminDashboard() {
  const [audioSamples, setAudioSamples] = useState<AudioSample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSample, setSelectedSample] = useState<AudioSample | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = () => {
    setIsLoading(true);
    // Simulate fetching data
    setTimeout(() => {
      // In a real app, sort by timestamp descending by default
      const sortedSamples = [...initialMockAudioSamples].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAudioSamples(sortedSamples);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = ''; // Release the audio source
        setCurrentAudio(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handlePlayAudio = (sample: AudioSample) => {
    if (currentAudio && currentAudio.src === sample.audioUrl) {
        if(currentAudio.paused) {
            currentAudio.play().catch(e => console.error("Error playing audio:", e));
            toast({ title: "Resuming Audio", description: `Playing ${sample.fileName}`});
        } else {
            currentAudio.pause();
            toast({ title: "Audio Paused", description: `${sample.fileName} paused.`});
        }
        return;
    }

    if (currentAudio) {
      currentAudio.pause(); 
      currentAudio.src = '';
    }

    if (sample.audioUrl) {
      const audio = new Audio(sample.audioUrl);
      audio.play().catch(e => {
        console.error("Error playing audio:", e);
        toast({ title: "Playback Error", description: "Could not play audio.", variant: "destructive" });
      });
      setCurrentAudio(audio);
      toast({ title: "Playing Audio", description: `Playing ${sample.fileName} for Speaker ID: ${sample.speakerId}` });
    } else {
      toast({ title: "Playback Error", description: "No audio URL available for this sample.", variant: "destructive" });
    }
  };
  
  const handleDownloadAudio = (sample: AudioSample) => {
    if (sample.audioUrl) {
      const link = document.createElement('a');
      link.href = sample.audioUrl;
      link.download = sample.fileName || `audio_sample_${sample.id}.webm`; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Downloading Audio", description: `Downloading ${sample.fileName || 'sample'}...` });
    } else {
      toast({ title: "Download Error", description: "No audio URL available for this sample.", variant: "destructive" });
    }
  };

  const updateSampleStatus = (sampleId: string, newStatus: AudioSample['status']) => {
    setIsActionLoading(true); // Indicate loading for this specific action
    setTimeout(() => {
      setAudioSamples(prevSamples =>
        prevSamples.map(s =>
          s.id === sampleId ? { ...s, status: newStatus } : s
        )
      );
      // Update the selectedSample's status if it's the one being changed
      if (selectedSample && selectedSample.id === sampleId) {
        setSelectedSample(prev => prev ? { ...prev, status: newStatus } : null);
      }
      setIsActionLoading(false);
      toast({ title: "Status Updated", description: `Sample ${sampleId} marked as ${newStatus}.`, variant: "default" });
    }, 700);
  };


  const getStatusBadgeVariant = (status: AudioSample['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending':
        return 'secondary'; 
      case 'verified':
        return 'default'; // Primary-like color
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  const getStatusIcon = (status: AudioSample['status']) => {
    switch (status) {
      case 'pending':
        return <Hourglass className="h-4 w-4 mr-1 text-yellow-600" />;
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 mr-1 text-red-600" />;
      default:
        return null;
    }
  };

  const totalSubmissions = audioSamples.length;
  const uniqueSpeakers = new Set(audioSamples.map(s => s.speakerId)).size;
  const pendingReview = audioSamples.filter(s => s.status === 'pending').length;
  const recordedLanguagesCount = new Set(audioSamples.map(s => s.recordedLanguage)).size;


  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
            <FileAudio className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block text-primary" /> : totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              Total audio samples received
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Speakers</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block text-primary" /> : uniqueSpeakers}</div>
            <p className="text-xs text-muted-foreground">
              Distinct registered users
            </p>
          </CardContent>
        </Card>
         <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            <Hourglass className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block text-accent" /> : pendingReview}</div>
            <p className="text-xs text-muted-foreground">
              Samples awaiting verification
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recorded Languages</CardTitle>
            <Mic2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block text-primary" /> : recordedLanguagesCount}</div>
            <p className="text-xs text-muted-foreground">
              Unique languages in samples
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row justify-between items-center border-b pb-4">
          <div>
            <CardTitle className="text-2xl text-primary">Audio Sample Submissions</CardTitle>
            <CardDescription>Manage and review submitted audio samples for VoiceID Lanka.</CardDescription>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading} className="hover:bg-primary/10">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading && audioSamples.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Loader2 className="h-10 w-10 mx-auto animate-spin mb-3 text-primary" />
              <p className="text-lg">Loading audio samples...</p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px] whitespace-nowrap">Speaker ID</TableHead>
                    <TableHead className="whitespace-nowrap">Speaker Name</TableHead>
                    <TableHead className="whitespace-nowrap">Native Lang.</TableHead>
                    <TableHead className="whitespace-nowrap">Recorded Lang.</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audioSamples.map((sample) => (
                    <TableRow key={sample.id} className="hover:bg-muted/40 transition-colors duration-150">
                      <TableCell className="font-medium truncate max-w-[130px]">{sample.speakerId}</TableCell>
                      <TableCell className="whitespace-nowrap">{sample.speakerName || 'N/A'}</TableCell>
                      <TableCell className="whitespace-nowrap">{sample.nativeLanguage || 'N/A'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge 
                          variant={sample.recordedLanguage === sample.nativeLanguage ? "outline" : "secondary"} 
                          className={`text-xs px-2 py-1 ${sample.recordedLanguage === sample.nativeLanguage ? 'border-primary/50 text-primary' : 'bg-accent/20 text-accent-foreground'}`}
                        >
                          {sample.recordedLanguage || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="truncate max-w-[200px] text-sm text-muted-foreground">{sample.fileName}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{new Date(sample.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{sample.duration}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(sample.status)} className="capitalize text-xs px-2 py-1 flex items-center w-max">
                          {getStatusIcon(sample.status)}
                          {sample.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePlayAudio(sample)} title="Play/Pause Audio" className="hover:text-primary transition-colors">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadAudio(sample)} title="Download Audio" className="hover:text-primary transition-colors">
                          <Download className="h-4 w-4" />
                        </Button>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedSample(sample)} title="View & Update Status" className="hover:text-accent transition-colors">
                              <Eye className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {audioSamples.length === 0 && !isLoading && (
            <p className="text-center py-16 text-lg text-muted-foreground">No audio samples submitted yet. Check back later!</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedSample} onOpenChange={(open) => {
        if (!open) setSelectedSample(null);
      }}>
        <AlertDialogContent className="max-w-lg">
          {selectedSample && ( 
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-primary text-xl mb-1">Review Sample: <span className="font-normal text-foreground">{selectedSample.fileName}</span></AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-1.5 text-sm text-muted-foreground pt-2 border-t mt-2">
                      <p><strong>Speaker ID:</strong> <span className="text-foreground">{selectedSample.speakerId}</span></p>
                      {selectedSample.speakerName && <p><strong>Speaker Name:</strong> <span className="text-foreground">{selectedSample.speakerName}</span></p>}
                      {selectedSample.nativeLanguage && <p><strong>Native Language:</strong> <Badge variant="outline" className="ml-1">{selectedSample.nativeLanguage}</Badge></p>}
                      <p><strong>Recorded Language:</strong> <Badge variant={selectedSample.recordedLanguage === selectedSample.nativeLanguage ? "outline" : "secondary"} className="ml-1">{selectedSample.recordedLanguage}</Badge></p>
                      {selectedSample.phraseIndex && <p><strong>Phrase No:</strong> <span className="text-foreground">{selectedSample.phraseIndex}</span></p>}
                      <p><strong>Submitted:</strong> <span className="text-foreground">{new Date(selectedSample.timestamp).toLocaleString()}</span></p>
                      <p><strong>Duration:</strong> <span className="text-foreground">{selectedSample.duration}</span></p>
                      <p><strong>Current Status:</strong> <Badge variant={getStatusBadgeVariant(selectedSample.status)} className="capitalize ml-1 text-xs px-2 py-1 flex items-center w-max">{getStatusIcon(selectedSample.status)}{selectedSample.status}</Badge></p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-6">
                <h4 className="font-semibold mb-3 text-foreground">Update Status:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button 
                    onClick={() => updateSampleStatus(selectedSample.id, 'verified')} 
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    disabled={selectedSample.status === 'verified' || isActionLoading}
                  >
                    {isActionLoading && selectedSample.status !== 'verified' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>} Verify
                  </Button>
                  <Button 
                    onClick={() => updateSampleStatus(selectedSample.id, 'rejected')} 
                    variant="destructive" 
                    className="flex-1"
                    disabled={selectedSample.status === 'rejected' || isActionLoading}
                  >
                     {isActionLoading && selectedSample.status !== 'rejected' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4"/>} Reject
                  </Button>
                   <Button 
                    onClick={() => updateSampleStatus(selectedSample.id, 'pending')} 
                    variant="secondary" 
                    className="flex-1 hover:bg-yellow-500/20 text-yellow-700 border-yellow-500"
                    disabled={selectedSample.status === 'pending' || isActionLoading}
                  >
                    {isActionLoading && selectedSample.status !== 'pending' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Hourglass className="mr-2 h-4 w-4"/>} To Pending
                  </Button>
                </div>
                 {isActionLoading && <p className="text-xs text-center mt-3 text-muted-foreground animate-pulse">Updating status, please wait...</p>}
              </div>
              <AlertDialogFooter className="pt-4 border-t">
                <AlertDialogCancel onClick={() => setSelectedSample(null)} className="w-full sm:w-auto">Close</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

