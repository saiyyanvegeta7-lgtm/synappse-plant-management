import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider, FirebaseUser, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  connectGoogleSheets: () => Promise<void>;
  logout: () => Promise<void>;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  profileError: string | null;
  retryProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updatedProfile = { ...profile, ...updates } as UserProfile;
      await setDoc(userDocRef, updatedProfile, { merge: true });
      setProfile(updatedProfile);
      toast.success('Role & Approval settings updated');
    } catch (error) {
      console.error('Error updating user profile:', error);
      toast.error('Failed to update roles');
    }
  };

  const fetchProfile = async (firebaseUser: FirebaseUser) => {
    setProfileError(null);
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        if (firebaseUser.email === 'purandhar@patilgroup.com' && data.role !== 'admin') {
          data.role = 'admin';
          data.approvalLevel = 3;
          try {
            await setDoc(userDocRef, data, { merge: true });
          } catch (e) {
            console.error('Failed to auto-upgrade super-admin doc:', e);
          }
        }
        setProfile(data);
      } else {
        // Create default profile for new user
        const role = firebaseUser.email === 'purandhar@patilgroup.com' ? 'admin' : 'requester';
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          role: role as any,
          dept: 'General',
          photoURL: firebaseUser.photoURL || '',
          approvalLevel: role === 'admin' ? 3 : 0,
        };
        try {
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
        } catch (createError: any) {
          console.error('Error creating user profile:', createError);
          setProfileError(createError?.message || String(createError));
          toast.error('Failed to create user profile');
        }
      }
    } catch (fetchError: any) {
      console.error('Error fetching user profile:', fetchError);
      setProfileError(fetchError?.message || String(fetchError));
      toast.error('Failed to load user profile');
    }
  };

  const retryProfile = async () => {
    if (user) {
      setLoading(true);
      await fetchProfile(user);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setAccessToken(null);
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      } else {
        await fetchProfile(firebaseUser);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Logged in successfully');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to login with Google');
    }
  };

  const connectGoogleSheets = async () => {
    try {
      const sheetsProvider = new GoogleAuthProvider();
      sheetsProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
      sheetsProvider.addScope('https://www.googleapis.com/auth/drive.file');
      sheetsProvider.addScope('https://www.googleapis.com/auth/gmail.send');
      
      const result = await signInWithPopup(auth, sheetsProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        setAccessToken(credential.accessToken);
        toast.success('Google Sheets database authorization verified!');
      } else {
        toast.error('Google Sheets credentials not received');
      }
    } catch (error) {
      console.error('Google Sheets sync authorization failed:', error);
      toast.error('Failed to access Google Sheets');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setAccessToken(null);
      setProfile(null);
      setProfileError(null);
      toast.success('Logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, connectGoogleSheets, logout, accessToken, setAccessToken, profileError, retryProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
