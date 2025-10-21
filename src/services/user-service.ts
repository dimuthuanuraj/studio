
'use server';
/**
 * @fileOverview User Service for Firebase Firestore
 * This service manages speaker profiles in the Firestore database.
 */

import { db } from './firebase'; // Assuming you have a `db` export from firebase.ts
import { collection, doc, setDoc, getDocs, query, where, getDoc } from 'firebase/firestore';
import type { SpeakerProfile } from './speaker-id';

// Define the collection name
const USERS_COLLECTION = 'users';

/**
 * Adds or updates a speaker's profile in the Firestore database.
 * The speaker's profile is stored in a document named after their speakerId.
 * @param userProfile - The speaker profile object.
 * @returns A promise that resolves when the operation is complete.
 */
export async function addUser(userProfile: SpeakerProfile): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userProfile.speakerId);
    await setDoc(userDocRef, userProfile);
    console.log(`User profile for ${userProfile.speakerId} saved successfully.`);
  } catch (error) {
    console.error("Error saving user profile to Firestore:", error);
    throw new Error('Could not save user profile.');
  }
}

/**
 * Retrieves all registered speaker profiles from Firestore.
 * @returns A promise that resolves to an array of SpeakerProfile objects.
 */
export async function getAllUsers(): Promise<SpeakerProfile[]> {
  try {
    const usersCollectionRef = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(usersCollectionRef);
    
    const users: SpeakerProfile[] = [];
    querySnapshot.forEach((doc) => {
      // Type assertion to ensure the data matches the SpeakerProfile interface
      users.push(doc.data() as SpeakerProfile);
    });
    
    console.log(`Fetched ${users.length} registered speakers.`);
    return users;

  } catch (error) {
    console.error("Error retrieving registered speakers from Firestore:", error);
    throw new Error('Could not retrieve registered speakers.');
  }
}

/**
 * Retrieves a single speaker profile from Firestore by their Speaker ID.
 * @param speakerId The ID of the speaker to retrieve.
 * @returns A promise that resolves to the SpeakerProfile object or null if not found.
 */
export async function getUserBySpeakerId(speakerId: string): Promise<SpeakerProfile | null> {
    try {
        const userDocRef = doc(db, USERS_COLLECTION, speakerId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            return docSnap.data() as SpeakerProfile;
        } else {
            console.log(`No user profile found for speakerId: ${speakerId}`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching user by speakerId:", error);
        throw new Error("Could not fetch user profile.");
    }
}
