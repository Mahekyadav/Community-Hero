import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, increment, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { WARDS } from '../constants';

type OfficerExtra = Partial<Pick<UserProfile, 'badgeId' | 'department' | 'city' | 'ward'>>;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: (selectedRole?: UserRole, isSignUp?: boolean) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    extraData?: OfficerExtra
  ) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addHeroPoints: (points: number, description: string) => Promise<void>;
  awardBadge: (badge: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Holds the cleanup fn for the current user's profile onSnapshot.
  // Stored in a ref so it persists across auth state changes without
  // triggering re-renders.
  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const authUnsub = auth.onAuthStateChanged((currentUser) => {
      // Tear down the previous user's profile listener before switching.
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      setUser(currentUser);

      if (!currentUser) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      let firstSnap = true;

      // Live profile listener — updates userProfile in-place whenever the
      // Firestore document changes (e.g. officer edits city/ward from profile page).
      profileUnsubRef.current = onSnapshot(
        doc(db, 'users', currentUser.uid),
        (snap) => {
          const profile = snap.exists() ? (snap.data() as UserProfile) : null;
          setUserProfile(profile);
          if (firstSnap) {
            firstSnap = false;
            setLoading(false);
            // Auto-resolve GPS for citizens who signed up before location was collected.
            if (profile?.role === 'citizen' && !profile.city) {
              autoResolveLocation(currentUser.uid).catch(() => {});
            }
          }
        },
        (err) => {
          console.error('Profile listener error:', err);
          setUserProfile(null);
          if (firstSnap) {
            firstSnap = false;
            setLoading(false);
          }
        }
      );
    });

    return () => {
      authUnsub();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  // Reverse-geocode the browser's GPS position and write city+ward to Firestore.
  // Ward is deterministically derived from coordinates so the same location always
  // maps to the same ward — suitable for demo/hackathon purposes.
  const autoResolveLocation = (uid: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve();

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
            );
            if (!res.ok) return resolve();
            const data = await res.json();
            const city: string =
              data.address?.city ||
              data.address?.town ||
              data.address?.county ||
              data.address?.state_district ||
              '';

            if (!city) return resolve();

            const wardIndex =
              Math.abs(Math.round(latitude * 13 + longitude * 7)) % WARDS.length;
            const ward = WARDS[wardIndex];

            await updateDoc(doc(db, 'users', uid), { city, ward });
            // onSnapshot will pick up the doc change and update userProfile state automatically.
          } catch {
            // Network or Firestore errors are non-fatal for this background task.
          } finally {
            resolve();
          }
        },
        () => resolve(),
        { timeout: 8000, maximumAge: 300_000 }
      );
    });
  };

  const signInWithGoogle = async (selectedRole: UserRole = 'citizen', isSignUp: boolean = false) => {
    let loggedUser: User;
    try {
      const result = await signInWithPopup(auth, googleProvider);
      loggedUser = result.user;
    } catch (authErr: any) {
      throw authErr;
    }

    const uid = loggedUser.uid;
    const path = `users/${uid}`;

    const existingDoc = await getDoc(doc(db, 'users', uid)).catch((err) =>
      handleFirestoreError(err, OperationType.GET, path)
    );

    if (!existingDoc.exists()) {
      if (!isSignUp) {
        await signOut(auth);
        throw new Error(
          'No account found with this Google profile. Please go to the Sign Up page to register first.'
        );
      }

      const newProfile: UserProfile = {
        uid,
        displayName: loggedUser.displayName || 'Anonymous Hero',
        email: loggedUser.email || '',
        role: selectedRole,
        status: selectedRole === 'officer' ? 'pending' : 'approved',
        heroPoints: 0,
        badges: [],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', uid), newProfile).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, path)
      );
    }
    // onSnapshot will pick up the doc and set userProfile automatically.
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    extraData?: OfficerExtra
  ) => {
    let uid = '';
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      uid = result.user.uid;
      await updateProfile(result.user, { displayName: name });
    } catch (authErr: any) {
      if (
        authErr.code === 'auth/operation-not-allowed' ||
        authErr.message?.includes('operation-not-allowed')
      ) {
        throw new Error(
          'Email/Password registration is not enabled in the Firebase console. Please sign in with Google, or enable the Email/Password sign-in provider in your Firebase project.'
        );
      }
      throw authErr;
    }

    try {
      const newProfile: UserProfile = {
        uid,
        displayName: name,
        email,
        role,
        status: role === 'officer' ? 'pending' : 'approved',
        heroPoints: 0,
        badges: [],
        createdAt: new Date().toISOString(),
        ...(extraData || {}),
      };

      await setDoc(doc(db, 'users', uid), newProfile);
      // onSnapshot will pick up the new doc automatically.
    } catch (firestoreErr) {
      handleFirestoreError(firestoreErr, OperationType.WRITE, `users/${uid}`);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged → onSnapshot will load the profile automatically.
    } catch (authErr: any) {
      const code: string = authErr.code ?? '';

      if (code === 'auth/operation-not-allowed' || authErr.message?.includes('operation-not-allowed')) {
        throw new Error(
          'Email/Password sign-in is not enabled in the Firebase console. Please sign in with Google, or enable the Email/Password sign-in provider in your Firebase project.'
        );
      }
      if (code === 'auth/user-not-found') {
        throw new Error('Account does not exist. Please sign up first.');
      }
      if (code === 'auth/invalid-credential') {
        throw new Error(
          'Account does not exist or incorrect password. Please check your credentials, or sign up first if you are new.'
        );
      }
      if (code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please try again later.');
      }
      throw authErr;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const addHeroPoints = async (points: number, description: string) => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), { heroPoints: increment(points) });

      const notificationId = `notif_${Date.now()}`;
      await setDoc(doc(db, 'notifications', notificationId), {
        id: notificationId,
        userId: user.uid,
        title: `+${points} Hero Points!`,
        message: `You earned ${points} Hero Points for: ${description}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
      // onSnapshot propagates the heroPoints change to userProfile state automatically.
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const awardBadge = async (badge: string) => {
    if (!user || !userProfile) return;
    if (userProfile.badges.includes(badge)) return;

    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), { badges: arrayUnion(badge) });

      const notificationId = `notif_${Date.now()}`;
      await setDoc(doc(db, 'notifications', notificationId), {
        id: notificationId,
        userId: user.uid,
        title: `🎖️ New Badge Earned!`,
        message: `Congratulations! You unlocked the "${badge}" badge for your civic participation.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
      // onSnapshot propagates the badges change to userProfile state automatically.
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        logout,
        addHeroPoints,
        awardBadge,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
