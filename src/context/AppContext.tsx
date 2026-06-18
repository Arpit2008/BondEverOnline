import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  updateDoc, 
  increment,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserDoc, ProductDoc, CategoryDoc, OrderDoc, PayoutDoc } from '../types';

interface AppContextType {
  firebaseUser: FirebaseUser | null;
  userData: UserDoc | null;
  authLoading: boolean;
  products: ProductDoc[];
  categories: CategoryDoc[];
  orders: OrderDoc[];
  payouts: PayoutDoc[];
  isLoadingData: boolean;
  login: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  registerAsAffiliate: () => Promise<void>;
  applyForAffiliate: (payoutDetails: string) => Promise<void>;
  triggerReload: () => void;
  referralId: string | null;
  announcement: string;
  updateAnnouncement: (text: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [payouts, setPayouts] = useState<PayoutDoc[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [referralId, setReferralId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  // Settle global announcement real-time syncing
  useEffect(() => {
    const unsubAnnouncement = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setAnnouncement(snap.data().announcement || '');
      }
    }, (err) => {
      console.error('Firestore Error sync global announcement settings:', err);
    });
    return () => unsubAnnouncement();
  }, []);

  // Update announcement method for Admins
  const updateAnnouncement = async (text: string) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        announcement: text,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    }
  };

  // Heartbeat ping logic for Live Traffic Counter
  useEffect(() => {
    let sessionId = sessionStorage.getItem('traffic_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      sessionStorage.setItem('traffic_session_id', sessionId);
    }

    const pingTraffic = async () => {
      try {
        await setDoc(doc(db, 'traffic', sessionId!), {
          lastActive: serverTimestamp()
        });
      } catch (err) {
        console.warn('Traffic heartbeat write issue (expected if rules are building/syncing):', err);
      }
    };

    pingTraffic();
    const interval = setInterval(pingTraffic, 20000);
    return () => clearInterval(interval);
  }, []);

  // 1. URL Referral Tracking Logic (?ref=AFFILIATE_ID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    
    if (ref) {
      setReferralId(ref);
      localStorage.setItem('affiliate_ref', ref);
      
      // Increment clicks limit to once per session to prevent spam
      const trackedSessionKey = `ref_click_tracked_${ref}`;
      if (!sessionStorage.getItem(trackedSessionKey)) {
        sessionStorage.setItem(trackedSessionKey, 'true');
        
        // Asynchronously check if affiliate exists and increment clicks
        const checkAndIncrement = async () => {
          try {
            const affDocRef = doc(db, 'users', ref);
            const affSnap = await getDoc(affDocRef);
            if (affSnap.exists() && affSnap.data().role === 'affiliate') {
              await updateDoc(affDocRef, {
                clicks: increment(1),
                updatedAt: serverTimestamp()
              });
            }
          } catch (e) {
            console.error('Failed to increment affiliate clicks', e);
          }
        };
        checkAndIncrement();
      }
    } else {
      // Direct visit - clear referral information so no affiliate is shown/mapped
      setReferralId(null);
      localStorage.removeItem('affiliate_ref');
    }
  }, []);

  // 2. Auth State Listening & User Document Creation/Sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      
      if (u) {
        const userDocRef = doc(db, 'users', u.uid);
        
        // Real-time listener for current user data
        const unsubscribeUserDoc = onSnapshot(userDocRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserDoc;
            
            // Check for immediate lockout if blocked
            if (data.isBlocked) {
              setUserData(data);
              // Terminate firebase auth session
              await signOut(auth);
              setFirebaseUser(null);
              setAuthLoading(false);
              return;
            }
            
            setUserData(data);
          } else {
            // Document doesn't exist, create it under default buyer ('user') role
            const storedReferral = localStorage.getItem('affiliate_ref');
            let finalReferrer: string | null = null;
            
            // Validate referral ID if stored
            if (storedReferral) {
              try {
                const affSnap = await getDoc(doc(db, 'users', storedReferral));
                if (affSnap.exists() && affSnap.data().role === 'affiliate' && !affSnap.data().isBlocked) {
                  finalReferrer = storedReferral;
                }
              } catch (e) {
                console.error(e);
              }
            }

            const isGoogleDeveloperAdmin = u.email === 'arpitmaurya55555@gmail.com';
            
            const newUser: UserDoc = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'Student',
              role: isGoogleDeveloperAdmin ? 'admin' : 'user',
              isBlocked: false,
              referredBy: finalReferrer,
              affiliateStatus: 'none',
              walletBalance: 0,
              totalEarned: 0,
              pendingCommission: 0,
              payoutDetails: '',
              clicks: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            try {
              await setDoc(userDocRef, newUser);
              setUserData(newUser);
            } catch (err) {
              setAuthLoading(false);
              handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`);
            }
          }
          setAuthLoading(false);
        }, (err) => {
          setAuthLoading(false);
          handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
        });

        return () => unsubscribeUserDoc();
      } else {
        setUserData(null);
        setAuthLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 3. Database Syncing for store, orders, payouts and categories
  useEffect(() => {
    setIsLoadingData(true);

    // Sync categories
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const cats: CategoryDoc[] = [];
      snap.forEach((d) => {
        cats.push({ id: d.id, ...d.data() } as CategoryDoc);
      });
      setCategories(cats);
    }, (err) => {
      console.error('Firestore Error on categories sync: ', err);
    });

    // Sync products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const prods: ProductDoc[] = [];
      snap.forEach((d) => {
        prods.push({ id: d.id, ...d.data() } as ProductDoc);
      });
      setProducts(prods);
    }, (err) => {
      console.error('Firestore Error on products sync: ', err);
    });

    // Sync orders and payouts conditionally based on roles
    let unsubOrders = () => {};
    let unsubPayouts = () => {};

    if (userData && firebaseUser) {
      if (userData.role === 'admin') {
        // Admin gets all orders and payouts
        unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
          const ords: OrderDoc[] = [];
          snap.forEach((d) => {
            ords.push({ id: d.id, ...d.data() } as OrderDoc);
          });
          setOrders(ords);
        }, (err) => {
          console.error('Firestore Error on orders sync (Admin): ', err);
        });

        unsubPayouts = onSnapshot(collection(db, 'payouts'), (snap) => {
          const pays: PayoutDoc[] = [];
          snap.forEach((d) => {
            pays.push({ id: d.id, ...d.data() } as PayoutDoc);
          });
          setPayouts(pays);
        }, (err) => {
          console.error('Firestore Error on payouts sync (Admin): ', err);
        });
      } else {
        // Normal User / Affiliate gets only their own orders
        const ordersQuery = query(
          collection(db, 'orders'), 
          where('userId', '==', firebaseUser.uid)
        );
        unsubOrders = onSnapshot(ordersQuery, (snap) => {
          const ords: OrderDoc[] = [];
          snap.forEach((d) => {
            ords.push({ id: d.id, ...d.data() } as OrderDoc);
          });
          
          // If the user has referred sales, also include those in the app state if they are an active affiliate
          if (userData.role === 'affiliate') {
            const reflinkQuery = query(
              collection(db, 'orders'), 
              where('affiliateId', '==', firebaseUser.uid)
            );
            getDocs(reflinkQuery).then((affSnap) => {
              const extraOrds = [...ords];
              affSnap.forEach((d) => {
                if (!extraOrds.some(o => o.id === d.id)) {
                  extraOrds.push({ id: d.id, ...d.data() } as OrderDoc);
                }
              });
              setOrders(extraOrds);
            }).catch(e => console.error(e));
          } else {
            setOrders(ords);
          }
        }, (err) => {
          console.error('Firestore Error on orders sync: ', err);
        });

        // Affiliate gets only their own payouts
        const payoutsQuery = query(
          collection(db, 'payouts'),
          where('affiliateId', '==', firebaseUser.uid)
        );
        unsubPayouts = onSnapshot(payoutsQuery, (snap) => {
          const pays: PayoutDoc[] = [];
          snap.forEach((d) => {
            pays.push({ id: d.id, ...d.data() } as PayoutDoc);
          });
          setPayouts(pays);
        }, (err) => {
          console.error('Firestore Error on payouts sync: ', err);
        });
      }
    } else {
      setOrders([]);
      setPayouts([]);
    }

    setIsLoadingData(false);

    return () => {
      unsubCategories();
      unsubProducts();
      unsubOrders();
      unsubPayouts();
    };
  }, [userData, firebaseUser, reloadKey]);

  // Auth Operations
  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login error', err);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === 'arpitmaurya55555@gmail.com') {
      if (password !== 'Arpit2008') {
        throw new Error('Invalid credentials for Super Admin.');
      }
      try {
        await signInWithEmailAndPassword(auth, normalizedEmail, 'NexusSecureGate2026!');
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
          try {
            await createUserWithEmailAndPassword(auth, normalizedEmail, 'NexusSecureGate2026!');
          } catch (createErr) {
            console.error('Super Admin sync creation error', createErr);
          }
        } else {
          throw err;
        }
      }
      try {
        const adminDocRef = doc(db, 'users', auth.currentUser?.uid || 'super-admin-uid');
        const adminSnap = await getDoc(adminDocRef);
        if (!adminSnap.exists()) {
          const newAdmin: UserDoc = {
            uid: auth.currentUser?.uid || 'super-admin-uid',
            email: normalizedEmail,
            displayName: 'Super Admin',
            role: 'admin',
            isBlocked: false,
            referredBy: null,
            affiliateStatus: 'none',
            walletBalance: 0,
            totalEarned: 0,
            pendingCommission: 0,
            payoutDetails: '',
            clicks: 0,
            password: 'Arpit2008',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(adminDocRef, newAdmin);
        }
      } catch (fsErr) {
        console.error('Super Admin Firestore setting error', fsErr);
      }
      return;
    }

    try {
      const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
      const querySnap = await getDocs(q);
      if (querySnap.empty) {
        throw new Error('User not registered or found.');
      }
      const userDoc = querySnap.docs[0].data() as UserDoc;
      if (!userDoc.password || userDoc.password !== password) {
        throw new Error('Invalid password.');
      }
      if (userDoc.isBlocked) {
        throw new Error('This account has been blocked by the Administrator.');
      }
      try {
        await signInWithEmailAndPassword(auth, normalizedEmail, 'NexusSecureGate2026!');
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
          await createUserWithEmailAndPassword(auth, normalizedEmail, 'NexusSecureGate2026!');
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error('Email sign in failure', err);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === 'arpitmaurya55555@gmail.com') {
      throw new Error('Registration of the master admin email is prohibited.');
    }
    try {
      const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        throw new Error('A user with this email already exists.');
      }
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, 'NexusSecureGate2026!');
      const storedReferral = localStorage.getItem('affiliate_ref');
      let finalReferrer: string | null = null;
      if (storedReferral) {
        try {
          const affSnap = await getDoc(doc(db, 'users', storedReferral));
          if (affSnap.exists() && affSnap.data().role === 'affiliate' && !affSnap.data().isBlocked) {
            finalReferrer = storedReferral;
          }
        } catch (e) {
          console.error(e);
        }
      }
      const newUser: UserDoc = {
        uid: userCredential.user.uid,
        email: normalizedEmail,
        displayName: displayName.trim() || 'Student',
        role: 'user',
        isBlocked: false,
        referredBy: finalReferrer,
        affiliateStatus: 'none',
        walletBalance: 0,
        totalEarned: 0,
        pendingCommission: 0,
        payoutDetails: '',
        clicks: 0,
        password: password,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
    } catch (err: any) {
      console.error('Email registration failure', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const registerAsAffiliate = async () => {
    if (!firebaseUser) return;
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userDocRef, {
        affiliateStatus: 'pending',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const applyForAffiliate = async (details: string) => {
    if (!firebaseUser) return;
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userDocRef, {
        affiliateStatus: 'pending',
        payoutDetails: details,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const triggerReload = () => {
    setReloadKey(prev => prev + 1);
  };

  return (
    <AppContext.Provider value={{
      firebaseUser,
      userData,
      authLoading,
      products,
      categories,
      orders,
      payouts,
      isLoadingData,
      login,
      signInWithEmail,
      signUpWithEmail,
      logout,
      registerAsAffiliate,
      applyForAffiliate,
      triggerReload,
      referralId,
      announcement,
      updateAnnouncement
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
