
'use client';

import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Play, Download, Eye, Users, FileAudio, CheckCircle2, XCircle, Hourglass, RefreshCw, Loader2, Languages, Mic2, PackageSearch, FileArchive, Mail, Phone, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { SpeakerProfile } from '@/services/speaker-id';
import { getAllUsers } from '@/services/user-service';
import { listAudioFilesFromDriveAction, getAudioFileFromDriveAction, type EnrichedDriveAudioFile } from '@/app/actions/audioDriveActions';


type AdminAudioSample = EnrichedDriveAudioFile & {
  // Add any client-specific state if needed, e.g., temporary playback URL
  localPlaybackUrl?: string; 
};


type ActiveModal = 'none' | 'sampleReview' | 'allSubmissions' | 'uniqueSpeakers';

export function AdminDashboard() {
  const [audioSamples, setAudioSamples] = useState<AdminAudioSample[]>([]);
  const [registeredSpeakers, setRegisteredSpeakers] = useState<SpeakerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSample, setSelectedSample] = useState<AdminAudioSample | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false); // For verify/reject actions
  const [isZipping, setIsZipping] = useState(false); // For zip download
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const driveFilesPromise = listAudioFilesFromDriveAction();
      const usersPromise = getAllUsers();

      const [driveFiles, users] = await Promise.all([driveFilesPromise, usersPromise]);

      // Enrich Drive files with speaker names if available
      const enrichedSamples = driveFiles.map(df => {
        const speaker = users.find(u => u.speakerId === df.speakerId);
        return {
          ...df,
          speakerName: speaker?.fullName || df.speakerId, // Fallback to speakerId if name not found
          nativeLanguage: speaker?.language,
          status: 'pending', // Default status, would be managed elsewhere
        };
      }).sort((a, b) => new Date(b.createdTime || 0).getTime() - new Date(a.createdTime || 0).getTime());
      
      setAudioSamples(enrichedSamples as AdminAudioSample[]);
      setRegisteredSpeakers(users);

    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error Fetching Data", description: "Could not load audio samples or user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        URL.revokeObjectURL(currentAudio.src); // Revoke if it's an object URL
        setCurrentAudio(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayAudio = async (sample: AdminAudioSample) => {
    if (currentAudio && currentAudio.dataset.sampleId === sample.id && !currentAudio.ended) {
        if(currentAudio.paused) {
            currentAudio.play().catch(e => console.error("Error resuming audio:", e));
            toast({ title: "Resuming Audio", description: `Playing ${sample.name}`});
        } else {
            currentAudio.pause();
            toast({ title: "Audio Paused", description: `${sample.name} paused.`});
        }
        return;
    }

    if (currentAudio) {
      currentAudio.pause();
      if (currentAudio.src.startsWith('blob:')) URL.revokeObjectURL(currentAudio.src);
    }
    
    toast({ title: "Loading Audio...", description: `Fetching ${sample.name} for playback.`});
    setIsActionLoading(true); // Use general action loader for fetching audio
    try {
      if (!sample.id) throw new Error("Sample ID is missing.");
      const result = await getAudioFileFromDriveAction(sample.id);
      if (result.success && result.data) {
        const audio = new Audio(result.data); // result.data is a base64 data URL
        audio.dataset.sampleId = sample.id;
        audio.play().catch(e => {
          console.error("Error playing audio:", e);
          toast({ title: "Playback Error", description: `Could not play ${sample.name}.`, variant: "destructive" });
        });
        setCurrentAudio(audio);
        toast({ title: "Playing Audio", description: `Playing ${sample.name}` });
      } else {
        toast({ title: "Playback Error", description: result.error || `Could not load audio for ${sample.name}.`, variant: "destructive" });
      }
    } catch(e) {
        console.error("Exception playing audio:", e);
        const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
        toast({ title: "Playback Exception", description: errorMessage, variant: "destructive" });
    } finally {
        setIsActionLoading(false);
    }
  };
  
  const handleDownloadAudio = async (sample: AdminAudioSample) => {
    if (!sample.name || !sample.id) {
        toast({ title: "Download Error", description: "Filename or ID is missing.", variant: "destructive"});
        return;
    }
    toast({ title: "Preparing Download...", description: `Fetching ${sample.name}.`});
    setIsActionLoading(true);
    try {
        const result = await getAudioFileFromDriveAction(sample.id);
        if (result.success && result.data && result.fileName) {
            // Convert base64 data URL to blob for download
            const fetchRes = await fetch(result.data);
            const blob = await fetchRes.blob();
            saveAs(blob, result.fileName); // Use fileName from action which should be original
            toast({ title: "Downloading Audio", description: `Downloading ${result.fileName}...` });
        } else {
            toast({ title: "Download Error", description: result.error || `Could not fetch audio for ${sample.name}.`, variant: "destructive" });
        }
    } catch (e) {
        console.error("Exception downloading audio:", e);
        toast({ title: "Download Exception", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsActionLoading(false);
    }
  };

  const zipAndDownloadSamples = async (samplesToZip: AdminAudioSample[], zipFileName: string) => {
    if (samplesToZip.length === 0) {
      toast({ title: "No Samples", description: "No samples selected to zip.", variant: "destructive" });
      return;
    }
    setIsZipping(true);
    toast({ title: "Preparing Download", description: `Zipping ${samplesToZip.length} samples... This may take a moment.` });

    const zip = new JSZip();
    const samplesBySpeaker: { [key: string]: AdminAudioSample[] } = {};

    for (const sample of samplesToZip) {
        const speakerId = sample.speakerId || 'unknown_speaker';
        if (!samplesBySpeaker[speakerId]) {
            samplesBySpeaker[speakerId] = [];
        }
        samplesBySpeaker[speakerId].push(sample);
    }
    
    let filesAdded = 0;
    try {
      for (const speakerId in samplesBySpeaker) {
        const speakerFolder = zip.folder(speakerId);
        if (!speakerFolder) {
          console.error(`Could not create folder for ${speakerId} in zip.`);
          continue;
        }
        for (const sample of samplesBySpeaker[speakerId]) {
          if (sample.id && sample.name) {
            const fileDataResult = await getAudioFileFromDriveAction(sample.id);
            if (fileDataResult.success && fileDataResult.data) {
              const fetchRes = await fetch(fileDataResult.data); // data is base64 data URL
              const blob = await fetchRes.blob();
              speakerFolder.file(sample.name, blob);
              filesAdded++;
            } else {
              // Add a text file indicating the error for this sample
              const errorFileName = sample.name.replace(/\.[^/.]+$/, "") + "_error.txt";
              speakerFolder.file(errorFileName, `Failed to fetch audio data for ${sample.name}.\nError: ${fileDataResult.error}`);
              console.warn(`Failed to fetch ${sample.name} for zipping.`);
            }
          }
        }
      }

      if (filesAdded === 0 && samplesToZip.length > 0) {
        toast({ title: "Zip Error", description: "No files could be successfully fetched and added to the zip.", variant: "destructive" });
        setIsZipping(false);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${zipFileName}.zip`);
      toast({ title: "Download Ready", description: `${zipFileName}.zip created with ${filesAdded} audio files.`, variant: "default" });
    } catch (error) {
      console.error("Error zipping files:", error);
      toast({ title: "Zip Error", description: "Failed to create zip file.", variant: "destructive" });
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadAllBySpeaker = (speakerId: string) => {
    if (!speakerId) return;
    const samplesToZip = audioSamples.filter(s => s.speakerId === speakerId);
    zipAndDownloadSamples(samplesToZip, `${speakerId}_all_samples`);
  };
  
  const handleDownloadAllSamples = () => {
    zipAndDownloadSamples(audioSamples, `VoiceID_Lanka_All_Submissions_${new Date().toISOString().split('T')[0]}`);
  };

  const updateSampleStatus = (sampleId: string, newStatus: EnrichedDriveAudioFile['status']) => {
    // Note: This status update is client-side only for this mock.
    // A real app would update this in a database via a server action.
    setIsActionLoading(true);
    setTimeout(() => { // Simulate API delay
      setAudioSamples(prevSamples =>
        prevSamples.map(s =>
          s.id === sampleId ? { ...s, status: newStatus } : s
        )
      );
      if (selectedSample && selectedSample.id === sampleId) {
        setSelectedSample(prev => prev ? { ...prev, status: newStatus } : null);
      }
      setIsActionLoading(false);
      toast({ title: "Status Updated (Locally)", description: `Sample marked as ${newStatus}.`, variant: "default" });
    }, 700);
  };

  const getStatusBadgeVariant = (status?: EnrichedDriveAudioFile['status']): "default" | "secondary" | "destructive" | "outline" => {
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
  
  const getStatusIcon = (status?: EnrichedDriveAudioFile['status']) => {
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
  const uniqueSpeakersCount = registeredSpeakers.length;
  const pendingReview = audioSamples.filter(s => s.status === 'pending').length;
  const recordedLanguagesCount = new Set(audioSamples.map(s => s.recordedLanguage).filter(Boolean)).size;

  const openModal = (modalType: ActiveModal, data?: AdminAudioSample | SpeakerProfile[] | AdminAudioSample[]) => {
    if (modalType === 'sampleReview' && data && !Array.isArray(data) && 'id' in data) { // check if it's an AdminAudioSample
        setSelectedSample(data as AdminAudioSample);
    }
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal('none');
    setSelectedSample(null); 
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card 
            className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out cursor-pointer"
            onClick={() => openModal('allSubmissions', audioSamples)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openModal('allSubmissions', audioSamples)}
            aria-label={`View all ${totalSubmissions} submissions`}
        >
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
        <Card 
            className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out cursor-pointer"
            onClick={() => openModal('uniqueSpeakers', registeredSpeakers)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openModal('uniqueSpeakers', registeredSpeakers)}
            aria-label={`View all ${uniqueSpeakersCount} unique speakers`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Speakers</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block text-primary" /> : uniqueSpeakersCount}</div>
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
            <div className="text-3xl font-bold text-foreground">{isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block text-primary" /> : pendingReview}</div>
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
            <CardTitle className="text-2xl text-primary">Audio Sample Submissions (from Google Drive)</CardTitle>
            <CardDescription>Manage and review submitted audio samples for VoiceID Lanka.</CardDescription>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading || isZipping || isActionLoading} className="hover:bg-primary/10">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading && audioSamples.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Loader2 className="h-10 w-10 mx-auto animate-spin mb-3 text-primary" />
              <p className="text-lg">Loading audio samples from Drive...</p>
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
                    <TableHead className="whitespace-nowrap">Phrase No.</TableHead>
                    <TableHead>Filename (Drive)</TableHead>
                    <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[220px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audioSamples.map((sample) => (
                    <TableRow key={sample.id} className="hover:bg-muted/40 transition-colors duration-150">
                      <TableCell className="font-medium truncate max-w-[130px]">{sample.speakerId || 'N/A'}</TableCell>
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
                      <TableCell className="whitespace-nowrap text-center">{sample.phraseIndex ?? 'N/A'}</TableCell>
                      <TableCell className="truncate max-w-[200px] text-sm text-muted-foreground">{sample.name}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{sample.createdTime ? new Date(sample.createdTime).toLocaleString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(sample.status)} className="capitalize text-xs px-2 py-1 flex items-center w-max">
                          {getStatusIcon(sample.status)}
                          {sample.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePlayAudio(sample)} title="Play/Pause Audio" className="hover:text-primary transition-colors" disabled={isZipping || isActionLoading}>
                         {isActionLoading && currentAudio?.dataset.sampleId !== sample.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadAudio(sample)} title="Download Audio" className="hover:text-primary transition-colors" disabled={isZipping || isActionLoading}>
                          {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openModal('sampleReview', sample)} title="View & Update Status" className="hover:text-accent transition-colors" disabled={isZipping || isActionLoading}>
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadAllBySpeaker(sample.speakerId)} title={`Download All by ${sample.speakerId}`} className="hover:text-green-600 transition-colors" disabled={isZipping || isActionLoading || !sample.speakerId}>
                          {isZipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {audioSamples.length === 0 && !isLoading && (
            <p className="text-center py-16 text-lg text-muted-foreground">No audio samples found in Drive. Check back later!</p>
          )}
        </CardContent>
      </Card>

      {/* Sample Review Dialog */}
      <AlertDialog open={activeModal === 'sampleReview'} onOpenChange={(open) => !open && closeModal()}>
        <AlertDialogContent className="max-w-lg">
          {selectedSample && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-primary text-xl mb-1">Review Sample: <span className="font-normal text-foreground">{selectedSample.name}</span></AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-1.5 text-sm text-muted-foreground pt-2 border-t mt-2">
                      <p><strong>Drive File ID:</strong> <span className="text-foreground text-xs">{selectedSample.id}</span></p>
                      <p><strong>Speaker ID:</strong> <span className="text-foreground">{selectedSample.speakerId || 'N/A'}</span></p>
                      {selectedSample.speakerName && <p><strong>Speaker Name:</strong> <span className="text-foreground">{selectedSample.speakerName}</span></p>}
                      {selectedSample.nativeLanguage && <p><strong>Native Language:</strong> <Badge variant="outline" className="ml-1">{selectedSample.nativeLanguage}</Badge></p>}
                      <p><strong>Recorded Language:</strong> <Badge variant={selectedSample.recordedLanguage === selectedSample.nativeLanguage ? "outline" : "secondary"} className="ml-1">{selectedSample.recordedLanguage || 'N/A'}</Badge></p>
                      {selectedSample.phraseIndex != null && <p><strong>Phrase No:</strong> <span className="text-foreground">{selectedSample.phraseIndex}</span></p>}
                      <p><strong>Submitted:</strong> <span className="text-foreground">{selectedSample.createdTime ? new Date(selectedSample.createdTime).toLocaleString() : 'N/A'}</span></p>
                      <p><strong>Current Status:</strong> <Badge variant={getStatusBadgeVariant(selectedSample.status)} className="capitalize ml-1 text-xs px-2 py-1 flex items-center w-max">{getStatusIcon(selectedSample.status)}{selectedSample.status}</Badge></p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-6">
                <h4 className="font-semibold mb-3 text-foreground">Update Status (Local Mock):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    onClick={() => selectedSample.id && updateSampleStatus(selectedSample.id, 'verified')}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    disabled={selectedSample.status === 'verified' || isActionLoading || isZipping || !selectedSample.id}
                  >
                    {isActionLoading && selectedSample.status !== 'verified' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>} Verify
                  </Button>
                  <Button
                    onClick={() => selectedSample.id && updateSampleStatus(selectedSample.id, 'rejected')}
                    variant="destructive"
                    className="flex-1"
                    disabled={selectedSample.status === 'rejected' || isActionLoading || isZipping || !selectedSample.id}
                  >
                     {isActionLoading && selectedSample.status !== 'rejected' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4"/>} Reject
                  </Button>
                   <Button
                    onClick={() => selectedSample.id && updateSampleStatus(selectedSample.id, 'pending')}
                    variant="secondary"
                    className="flex-1 hover:bg-yellow-500/20 text-yellow-700 border-yellow-500"
                    disabled={selectedSample.status === 'pending' || isActionLoading || isZipping || !selectedSample.id}
                  >
                    {isActionLoading && selectedSample.status !== 'pending' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Hourglass className="mr-2 h-4 w-4"/>} To Pending
                  </Button>
                </div>
                 {(isActionLoading || isZipping) && <p className="text-xs text-center mt-3 text-muted-foreground animate-pulse">Processing, please wait...</p>}
              </div>
              <AlertDialogFooter className="pt-4 border-t">
                <AlertDialogCancel onClick={closeModal} className="w-full sm:w-auto" disabled={isZipping || isActionLoading}>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* All Submissions Dialog */}
      <AlertDialog open={activeModal === 'allSubmissions'} onOpenChange={(open) => !open && closeModal()}>
        <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-primary text-xl flex items-center">
                <FileAudio className="mr-2 h-6 w-6" /> All Audio Submissions ({audioSamples.length})
              </AlertDialogTitle>
              <AlertDialogDescription>
                View all submitted audio samples from Google Drive. You can download all samples as a single ZIP file.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 max-h-[60vh] overflow-y-auto pr-2">
              {audioSamples.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Speaker ID</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audioSamples.map(sample => (
                      <TableRow key={sample.id}>
                        <TableCell>{sample.speakerId || 'N/A'}</TableCell>
                        <TableCell className="truncate max-w-xs">{sample.name}</TableCell>
                        <TableCell>{sample.recordedLanguage || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(sample.status)} className="capitalize text-xs">
                            {sample.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">No submissions found.</p>
              )}
            </div>
            <AlertDialogFooter className="pt-4 border-t">
              <Button
                onClick={handleDownloadAllSamples}
                disabled={isZipping || audioSamples.length === 0 || isActionLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isZipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download All ({audioSamples.length}) Samples
              </Button>
              <AlertDialogCancel onClick={closeModal} className="w-full sm:w-auto" disabled={isZipping || isActionLoading}>Close</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Unique Speakers Dialog */}
      <AlertDialog open={activeModal === 'uniqueSpeakers'} onOpenChange={(open) => !open && closeModal()}>
        <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-primary text-xl flex items-center">
                <Users className="mr-2 h-6 w-6" /> Registered Speakers ({registeredSpeakers.length})
              </AlertDialogTitle>
              <AlertDialogDescription>
                View details of all registered speakers in the VoiceID Lanka system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 max-h-[60vh] overflow-y-auto pr-2">
              {registeredSpeakers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Speaker ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Native Language</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registeredSpeakers.map(speaker => (
                      <TableRow key={speaker.speakerId}>
                        <TableCell className="font-medium">{speaker.speakerId}</TableCell>
                        <TableCell>{speaker.fullName}</TableCell>
                        <TableCell><Badge variant="outline">{speaker.language}</Badge></TableCell>
                        <TableCell className="truncate max-w-xs">{speaker.email}</TableCell>
                        <TableCell>{speaker.whatsappNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">No registered speakers found.</p>
              )}
            </div>
            <AlertDialogFooter className="pt-4 border-t">
              <AlertDialogCancel onClick={closeModal} className="w-full sm:w-auto" disabled={isActionLoading}>Close</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    