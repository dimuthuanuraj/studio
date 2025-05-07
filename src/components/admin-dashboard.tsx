
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Play, Download, Eye, Users, FileAudio, CheckCircle2, XCircle, Hourglass, RefreshCw, Loader2 } from 'lucide-react';
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
  // AlertDialogTrigger, // No longer needed here as trigger is manual
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface AudioSample {
  id: string;
  speakerId: string;
  timestamp: string;
  duration: string; // e.g., "0:15"
  status: 'pending' | 'verified' | 'rejected';
  audioUrl?: string; // Direct URL for playback/download
  fileName?: string; // e.g., "sample_speaker123.wav"
}

const initialMockAudioSamples: AudioSample[] = [
  { id: 'sample001', speakerId: 'sid-user-001', timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), duration: '0:15', status: 'pending', fileName: 'voice_sample_001.wav', audioUrl: 'https://picsum.photos/10/10' }, // Placeholder URL
  { id: 'sample002', speakerId: 'sid-user-002', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), duration: '0:22', status: 'verified', fileName: 'voice_sample_002.wav', audioUrl: 'https://picsum.photos/10/10' },
  { id: 'sample003', speakerId: 'sid-user-001', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), duration: '0:10', status: 'rejected', fileName: 'voice_sample_003.wav', audioUrl: 'https://picsum.photos/10/10' },
  { id: 'sample004', speakerId: 'sid-user-003', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), duration: '0:28', status: 'pending', fileName: 'voice_sample_004.wav', audioUrl: 'https://picsum.photos/10/10' },
  { id: 'sample005', speakerId: 'sid-user-002', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), duration: '0:19', status: 'verified', fileName: 'voice_sample_005.wav', audioUrl: 'https://picsum.photos/10/10' },
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
    setTimeout(() => {
      setAudioSamples(initialMockAudioSamples);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    fetchData();
    // Cleanup audio on component unmount
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, []);

  const handlePlayAudio = (sample: AudioSample) => {
    if (currentAudio) {
      currentAudio.pause(); // Stop any currently playing audio
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
      link.download = sample.fileName || `audio_sample_${sample.id}.wav`; // Fallback filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Downloading Audio", description: `Downloading ${sample.fileName || 'sample'}...` });
    } else {
      toast({ title: "Download Error", description: "No audio URL available for this sample.", variant: "destructive" });
    }
  };

  const handleViewDetails = (sample: AudioSample) => {
    setSelectedSample(sample);
    // Modal or side panel for details would be opened here.
  };

  const updateSampleStatus = (sampleId: string, newStatus: AudioSample['status']) => {
    // Simulate API call
    setIsLoading(true);
    setTimeout(() => {
      setAudioSamples(prevSamples =>
        prevSamples.map(s =>
          s.id === sampleId ? { ...s, status: newStatus } : s
        )
      );
      setSelectedSample(null); // Close dialog
      setIsLoading(false);
      toast({ title: "Status Updated", description: `Sample ${sampleId} marked as ${newStatus}.` });
    }, 500);
  };

  const getStatusBadgeVariant = (status: AudioSample['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending':
        return 'secondary'; // Using secondary for pending, as per ShadCN convention
      case 'verified':
        return 'default'; // 'default' uses primary color which is Green
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

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
            <FileAudio className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoading ? "..." : totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              Audio samples received globally
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
              Distinct users who submitted audio
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
                    <TableHead className="w-[100px]">Sample ID</TableHead>
                    <TableHead className="w-[150px]">Speaker ID</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audioSamples.map((sample) => (
                    <TableRow key={sample.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium truncate max-w-[100px]">{sample.id}</TableCell>
                      <TableCell className="truncate max-w-[150px]">{sample.speakerId}</TableCell>
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
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(sample)} title="View & Update Status" className="hover:text-accent">
                          <Eye className="h-4 w-4" />
                        </Button>
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
              <AlertDialogTitle className="text-primary">Review Sample: {selectedSample.id}</AlertDialogTitle>
              <AlertDialogDescription>
                Details for audio sample from Speaker ID: <strong>{selectedSample.speakerId}</strong>.<br/>
                Submitted: {new Date(selectedSample.timestamp).toLocaleString()}<br/>
                Duration: {selectedSample.duration}<br/>
                Current Status: <Badge variant={getStatusBadgeVariant(selectedSample.status)} className="capitalize">{selectedSample.status}</Badge>
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

// Helper component to display loading skeletons for cards
function LoadingCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
        <div className="h-5 w-5 bg-muted rounded animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted rounded w-1/2 mb-1 animate-pulse"></div>
        <div className="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
      </CardContent>
    </Card>
  );
}

