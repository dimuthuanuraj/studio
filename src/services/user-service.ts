
import type { SpeakerProfile } from '@/services/speaker-id';

// In-memory store for users. For a real app, this would be Firestore or another DB.
let users: SpeakerProfile[] = [];

const USERS_STORAGE_KEY = 'voiceIdLankaUsers';

// Function to load users from localStorage (if available)
function loadUsersFromStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      try {
        users = JSON.parse(storedUsers);
      } catch (e) {
        console.error("Error parsing users from localStorage:", e);
        users = []; // Reset if data is corrupted
      }
    }
  }
}

// Function to save users to localStorage (if available)
function saveUsersToStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error("Error saving users to localStorage:", e);
    }
  }
}

// Load users once when the module is initialized
loadUsersFromStorage();

/**
 * Adds a new user to the mock user list and saves to localStorage.
 * @param newUser The speaker profile to add.
 */
export function addUser(newUser: SpeakerProfile): void {
  // Check if user already exists by speakerId or email to prevent duplicates
  const existingUserById = users.find(user => user.speakerId === newUser.speakerId);
  const existingUserByEmail = users.find(user => user.email.toLowerCase() === newUser.email.toLowerCase());

  if (existingUserById) {
    console.warn(`User with Speaker ID ${newUser.speakerId} already exists. Skipping add.`);
    // Optionally, you could throw an error or update the existing user
    return;
  }
  if (existingUserByEmail) {
    console.warn(`User with email ${newUser.email} already exists. Skipping add.`);
    return;
  }

  users.push(newUser);
  saveUsersToStorage();
  console.log('User added to mock service:', newUser);
  console.log('Current users in mock service:', users);
}

/**
 * Validates a user based on speaker ID and email.
 * @param speakerId The speaker ID to validate.
 * @param email The email to validate.
 * @returns The SpeakerProfile if valid, otherwise null.
 */
export function validateUser(speakerId: string, email: string): SpeakerProfile | null {
  console.log('Attempting to validate user with ID:', speakerId, 'and email:', email);
  console.log('Current users in mock service:', users);
  const user = users.find(
    (u) => u.speakerId === speakerId && u.email.toLowerCase() === email.toLowerCase()
  );
  if (user) {
    console.log('User validated:', user);
    return user;
  }
  console.log('User validation failed for ID:', speakerId, 'and email:', email);
  return null;
}

/**
 * Retrieves all users.
 * @returns An array of SpeakerProfile.
 */
export function getAllUsers(): SpeakerProfile[] {
  return [...users]; // Return a copy to prevent direct modification
}

/**
 * Retrieves a user by their Speaker ID.
 * @param speakerId The ID of the speaker to retrieve.
 * @returns The SpeakerProfile if found, otherwise null.
 */
export function getUserBySpeakerId(speakerId: string): SpeakerProfile | null {
  const user = users.find((u) => u.speakerId === speakerId);
  return user || null;
}


// Mock user data (can be expanded or loaded from elsewhere)
// This initial mock data will be added if localStorage is empty or on first load
if (users.length === 0) { // Only add if no users were loaded from storage
    addUser({
        speakerId: "id90000",
        fullName: "Kamal Perera",
        email: "kamal@example.com",
        whatsappNumber: "0771234567",
        language: "Sinhala",
        // registrationDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    });
    addUser({
        speakerId: "id90001",
        fullName: "Nimali Silva",
        email: "nimali@example.com",
        whatsappNumber: "+94719876543",
        language: "Tamil",
        // registrationDate: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    });
}

export const mockUsers = users; // Export for easy access if needed elsewhere, primarily for debugging
