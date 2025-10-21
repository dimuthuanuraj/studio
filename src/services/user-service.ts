
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { SpeakerProfile } from '@/services/speaker-id';


export async function addUser(user: SpeakerProfile): Promise<void> {
  await setDoc(doc(db, 'users', user.speakerId), user);
}

export async function getUserBySpeakerId(speakerId: string): Promise<SpeakerProfile | null> {
  const docRef = doc(db, 'users', speakerId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as SpeakerProfile;
  } else {
    return null;
  }
}

export async function getAllUsers(): Promise<SpeakerProfile[]> {
  const querySnapshot = await getDocs(collection(db, 'users'));
  const users: SpeakerProfile[] = [];
  querySnapshot.forEach((doc) => {
    users.push(doc.data() as SpeakerProfile);
  });
  return users;
}
