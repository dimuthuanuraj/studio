
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Play, Download, Eye, Users, FileAudio, CheckCircle2, XCircle, Hourglass, RefreshCw, Loader2, Languages, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, 
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface AudioSample {
  id: string;
  speakerId: string;
  speakerName?: string; // Added
  speakerLanguage?: 'Sinhala' | 'Tamil' | string; // Added
  timestamp: string;
  duration: string; // e.g., "0:15"
  status: 'pending' | 'verified' | 'rejected';
  audioUrl?: string; // Direct URL for playback/download
  fileName?: string; // e.g., "speaker123_phrase1.wav"
  phraseIndex?: number; // Added
}

// Mock data to include new fields, simulating what might come from Firestore
const initialMockAudioSamples: AudioSample[] = [
  { id: 'sample001', speakerId: 'sid-user-001', speakerName: 'Kamal Perera', speakerLanguage: 'Sinhala', timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), duration: '0:15', status: 'pending', fileName: 'sid-user-001_phrase1.webm', audioUrl: 'https://picsum.photos/10/10', phraseIndex: 1 },
  { id: 'sample002', speakerId: 'sid-user-002', speakerName: 'Nimali Silva', speakerLanguage: 'Tamil', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), duration: '0:22', status: 'verified', fileName: 'sid-user-002_phrase2.webm', audioUrl: 'https://picsum.photos/10/10', phraseIndex: 2 },
  { id: 'sample003', speakerId: 'sid-user-001', speakerName: 'Kamal Perera', speakerLanguage: 'Sinhala', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), duration: '0:10', status: 'rejected', fileName: 'sid-user-001_phrase3.webm', audioUrl: 'https://picsum.photos/10/10', phraseIndex: 3 },
  { id: 'sample004', speakerId: 'sid-user-003', speakerName: 'Saman Kumara', speakerLanguage: 'Sinhala', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), duration: '0:28', status: 'pending', fileName: 'sid-user-003_phrase1.webm', audioUrl: 'https://picsum.photos/10/10', phraseIndex: 1 },
  { id: 'sample005', speakerId: 'sid-user-002', speakerName: 'Nimali Silva', speakerLanguage: 'Tamil', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), duration: '0:19', status: 'verified', fileName: 'sid-user-002_phrase4.webm', audioUrl: 'https://picsum.photos/10/10', phraseIndex: 4 },
];


export function AdminDashboard() {
  const [audioSamples, setAudioSamples] = useState<AudioSample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSample, setSelectedSample] = useState<AudioSample | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const fetchData = () => {
    setIsLoading(true);
    // Simulate fetching data
    // In a real app, fetch from Firestore/Firebase Storage
    setTimeout(() => {
      setAudioSamples(initialMockAudioSamples);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, []);

  const handlePlayAudio = (sample: AudioSample) => {
    if (currentAudio) {
      currentAudio.pause(); 
    }
    if (sample.audioUrl) {
      const audio = new Audio(sample.audioUrl);
      audio.play().catch(e => console.error("Error playing audio:", e));
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
    setIsLoading(true);
    setTimeout(() => {
      setAudioSamples(prevSamples =>
        prevSamples.map(s =>
          s.id === sampleId ? { ...s, status: newStatus } : s
        )
      );
      setSelectedSample(null); 
      setIsLoading(false);
      toast({ title: "Status Updated", description: `Sample ${sampleId} marked as ${newStatus}.` });
    }, 500);
  };

  const getStatusBadgeVariant = (status: AudioSample['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending':
        return 'secondary'; 
      case 'verified':
        return 'default'; 
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  const getStatusIcon = (status: AudioSample['status']) => {
    switch (status) {
      case 'pending':
        return <Hourglass className="h-4 w-4 mr-1" />;
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 mr-1" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  const totalSubmissions = audioSamples.length;
  const uniqueSpeakers = new Set(audioSamples.map(s => s.speakerId)).size;
  const pendingReview = audioSamples.filter(s => s.status === 'pending').length;
  const totalLanguages = new Set(audioSamples.map(s => s.speakerLanguage).filter(Boolean)).size;


  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"> {/* Adjusted to 4 columns for Languages */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
            <FileAudio className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoading ? "..." : totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              Audio samples received
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Speakers</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoading ? "..." : uniqueSpeakers}</div>
            <p className="text-xs text-muted-foreground">
              Distinct registered users
            </p>
          </CardContent>
        </Card>
         <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            <Hourglass className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoading ? "..." : pendingReview}</div>
            <p className="text-xs text-muted-foreground">
              Samples awaiting verification
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Languages</CardTitle>
            <Languages className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoading ? "..." : totalLanguages}</div>
            <p className="text-xs text-muted-foreground">
              Unique languages submitted
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-2xl text-primary">Audio Sample Submissions</CardTitle>
            <CardDescription>Manage and review submitted audio samples for VoiceID Lanka.</CardDescription>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && audioSamples.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto animate-spin mb-2 text-primary" />
              Loading audio samples...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Speaker ID</TableHead>
                    <TableHead>Speaker Name</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[160px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audioSamples.map((sample) => (
                    <TableRow key={sample.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium truncate max-w-[120px]">{sample.speakerId}</TableCell>
                      <TableCell>{sample.speakerName || 'N/A'}</TableCell>
                      <TableCell>{sample.speakerLanguage || 'N/A'}</TableCell>
                      <TableCell className="truncate max-w-[200px]">{sample.fileName}</TableCell>
                      <TableCell>{new Date(sample.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{sample.duration}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(sample.status)} className="capitalize text-xs px-2 py-1">
                          {getStatusIcon(sample.status)}
                          {sample.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePlayAudio(sample)} title="Play Audio" className="hover:text-primary">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadAudio(sample)} title="Download Audio" className="hover:text-primary">
                          <Download className="h-4 w-4" />
                        </Button>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedSample(sample)} title="View & Update Status" className="hover:text-accent">
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
            <p className="text-center py-10 text-muted-foreground">No audio samples submitted yet. Check back later!</p>
          )}
        </CardContent>
      </Card>

      {selectedSample && (
        <AlertDialog open={!!selectedSample} onOpenChange={(open) => !open && setSelectedSample(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-primary">Review Sample: {selectedSample.fileName}</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-1 text-sm">
                    <p><strong>Speaker ID:</strong> {selectedSample.speakerId}</p>
                    {selectedSample.speakerName && <p><strong>Speaker Name:</strong> {selectedSample.speakerName}</p>}
                    {selectedSample.speakerLanguage && <p><strong>Language:</strong> {selectedSample.speakerLanguage}</p>}
                    {selectedSample.phraseIndex && <p><strong>Phrase No:</strong> {selectedSample.phraseIndex}</p>}
                    <p><strong>Submitted:</strong> {new Date(selectedSample.timestamp).toLocaleString()}</p>
                    <p><strong>Duration:</strong> {selectedSample.duration}</p>
                    <p><strong>Current Status:</strong> <Badge variant={getStatusBadgeVariant(selectedSample.status)} className="capitalize">{selectedSample.status}</Badge></p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <h4 className="font-semibold mb-2 text-foreground">Update Status:</h4>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => updateSampleStatus(selectedSample.id, 'verified')} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1"
                  disabled={selectedSample.status === 'verified' || isLoading}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4"/> Verify
                </Button>
                <Button 
                  onClick={() => updateSampleStatus(selectedSample.id, 'rejected')} 
                  variant="destructive" 
                  className="flex-1"
                  disabled={selectedSample.status === 'rejected' || isLoading}
                >
                   <XCircle className="mr-2 h-4 w-4"/> Reject
                </Button>
                 <Button 
                  onClick={() => updateSampleStatus(selectedSample.id, 'pending')} 
                  variant="secondary" 
                  className="flex-1"
                  disabled={selectedSample.status === 'pending' || isLoading}
                >
                  <Hourglass className="mr-2 h-4 w-4"/> Set to Pending
                </Button>
              </div>
               {isLoading && <p className="text-xs text-center mt-2 text-muted-foreground animate-pulse">Updating status...</p>}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedSample(null)}>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
