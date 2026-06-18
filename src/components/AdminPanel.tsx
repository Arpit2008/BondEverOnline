import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, doc, setDoc, deleteDoc, updateDoc, 
  increment, serverTimestamp, getDocs, getDoc, runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { 
  PlusCircle, Trash2, ShieldCheck, UserX, UserCheck, Check, X, Eye, 
  ExternalLink, Package, Grid, Users, CreditCard, Award, ArrowUpRight, 
  ChevronRight, ZoomIn, Loader2, Edit, Lock, TrendingUp, Megaphone, Globe, Activity
} from 'lucide-react';
import { ProductDoc, CategoryDoc, UserDoc, OrderDoc, PayoutDoc } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminPanel: React.FC = () => {
  const { products, categories, orders, payouts, triggerReload, userData, announcement, updateAnnouncement } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'products' | 'categories' | 'users' | 'orders' | 'payouts'>('overview');

  // Course states
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCat, setCourseCat] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [coursePrice, setCoursePrice] = useState('');
  const [courseComm, setCourseComm] = useState('');
  const [courseLink, setCourseLink] = useState('');
  const [courseThumb, setCourseThumb] = useState('');
  const [thumbBase64, setThumbBase64] = useState('');
  const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);

  // Category states
  const [catName, setCatName] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // User list state
  const [usersList, setUsersList] = useState<UserDoc[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Rejection state
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Payout state
  const [settlePayoutId, setSettlePayoutId] = useState<string | null>(null);
  const [payoutUtr, setPayoutUtr] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Modal zoom state for order screenshot
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null);

  // Password reset states
  const [resetPasswordUser, setResetPasswordUser] = useState<UserDoc | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [submittingResetPassword, setSubmittingResetPassword] = useState(false);

  // Global Announcement input board stats
  const [announcementInput, setAnnouncementInput] = useState(announcement || '');
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);

  // Real-time active traffic counter state
  const [activeBrowsers, setActiveBrowsers] = useState<number>(1);

  // Keep announcement input synchronized
  useEffect(() => {
    if (announcement !== undefined) {
      setAnnouncementInput(announcement);
    }
  }, [announcement]);

  // Real-time listener for current unique browser traffic heartbeats
  useEffect(() => {
    const unsubTraffic = onSnapshot(collection(db, 'traffic'), (snap) => {
      const twoMinutesAgo = Date.now() - 120000; // Heartbeat in last 2 mins
      let count = 0;
      snap.forEach((d) => {
        const data = d.data();
        let lastActiveTime = 0;
        if (data.lastActive) {
          if (typeof data.lastActive.toDate === 'function') {
            lastActiveTime = data.lastActive.toDate().getTime();
          } else if (data.lastActive.seconds) {
            lastActiveTime = data.lastActive.seconds * 1000;
          } else {
            lastActiveTime = Number(data.lastActive);
          }
        }
        if (lastActiveTime >= twoMinutesAgo) {
          count++;
        }
      });
      // Set to calculated active heartbeats, ensuring a minimum baseline of 1 (the current admin)
      setActiveBrowsers(Math.max(count, 1));
    }, (err) => {
      console.warn('Silent issue reporting for live traffic snapshot sync:', err);
    });
    return () => unsubTraffic();
  }, []);

  // Update System Announcement Broadcast
  const handleDeployAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAnnouncement(true);
    try {
      await updateAnnouncement(announcementInput.trim());
    } catch (err) {
      console.error('Failed to update systemwide announcement:', err);
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  // Fetch users list
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const ulist: UserDoc[] = [];
      snap.forEach((doc) => {
        ulist.push(doc.data() as UserDoc);
      });
      setUsersList(ulist);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Handle Super Admin role changing
  const handleChangeRole = async (uid: string, newRole: 'user' | 'affiliate' | 'admin') => {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Failed to change user role:", err);
    }
  };

  // Handle updating custom commission percentage for an affiliate/user
  const handleUpdateCommission = async (uid: string, value: string) => {
    const num = value === '' ? null : Number(value);
    if (num !== null && (isNaN(num) || num < 0 || num > 100)) return;
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        customCommissionPercentage: num,
        updatedAt: serverTimestamp()
      });
      setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, customCommissionPercentage: num ?? undefined } : u));
    } catch (err) {
      console.error("Failed to update custom commission percentage:", err);
    }
  };

  // Handle forcing custom user password override
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPasswordInput) return;
    setSubmittingResetPassword(true);
    try {
      const userDocRef = doc(db, 'users', resetPasswordUser.uid);
      await updateDoc(userDocRef, {
        password: newPasswordInput,
        updatedAt: serverTimestamp()
      });
      setResetPasswordUser(null);
      setNewPasswordInput('');
    } catch (err) {
      console.error("Failed to reset password:", err);
    } finally {
      setSubmittingResetPassword(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'users') {
      fetchUsers();
    }
  }, [activeSubTab]);

  // Handle Thumbnail Base64 conversion
  const handleThumbFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Course Management
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle || !courseCat || !coursePrice || !courseComm || !courseLink) return;

    setIsSubmittingCourse(true);
    const prodId = 'COURSE_' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const finalThumb = thumbBase64 || courseThumb.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';

    const newProd: ProductDoc = {
      id: prodId,
      title: courseTitle.trim(),
      category: courseCat,
      description: courseDesc.trim(),
      price: parseFloat(coursePrice),
      commissionPercentage: parseFloat(courseComm),
      downloadLink: courseLink.trim(),
      thumbnailUrl: finalThumb,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'products', prodId), newProd);
      setCourseTitle('');
      setCourseDesc('');
      setCoursePrice('');
      setCourseComm('');
      setCourseLink('');
      setCourseThumb('');
      setThumbBase64('');
      triggerReload();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${prodId}`);
    } finally {
      setIsSubmittingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this course from BondEver inventory?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      triggerReload();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  // 2. Category Management
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setIsSubmittingCat(true);
    const catId = 'CAT_' + Math.random().toString(36).substring(2, 11).toUpperCase();

    const newCat: CategoryDoc = {
      id: catId,
      name: catName.trim().toUpperCase(),
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'categories', catId), newCat);
      setCatName('');
      triggerReload();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `categories/${catId}`);
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Remove details? Products referencing this category will remain active.')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      triggerReload();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    }
  };

  // 3. Block / Unblock Users
  const handleToggleBlock = async (targetUser: UserDoc) => {
    const isBlocking = !targetUser.isBlocked;
    const actionLabel = isBlocking ? 'BLOCK' : 'UNBLOCK';
    if (!confirm(`Are you sure you want to ${actionLabel} ${targetUser.displayName}?`)) return;

    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        isBlocked: isBlocking,
        updatedAt: serverTimestamp()
      });

      // Update local state list automatically
      setUsersList(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isBlocked: isBlocking } : u));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  // 4. Partner/Affiliate Approval
  const handleAffiliateRequest = async (targetUser: UserDoc, approve: boolean) => {
    const status = approve ? 'approved' : 'rejected';
    const role = approve ? 'affiliate' : 'user';
    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        role: role,
        affiliateStatus: status,
        updatedAt: serverTimestamp()
      });
      fetchUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  // 5. Purchase Order Settlement Verification (UTR Proofs)
  const handleApproveOrder = async (order: OrderDoc) => {
    if (!confirm(`Approve payment receipt and unlock resources for order ${order.id}?`)) return;

    try {
      // Begin Order Approval Status Write
      const ordRef = doc(db, 'orders', order.id);
      await updateDoc(ordRef, {
        status: 'approved',
        updatedAt: serverTimestamp()
      });

      // If referred by an Affiliate, credit their wallet with approved dividends, transition commission stats
      if (order.affiliateId) {
        const affRef = doc(db, 'users', order.affiliateId);
        const affSnap = await getDoc(affRef);
        
        if (affSnap.exists()) {
          const affData = affSnap.data() as UserDoc;
          
          // Ensure affiliate isn't blocked and is an approved partner before crediting
          if (!affData.isBlocked && affData.role === 'affiliate') {
            await updateDoc(affRef, {
              walletBalance: increment(order.affiliateCommission),
              totalEarned: increment(order.affiliateCommission),
              pendingCommission: increment(-order.affiliateCommission),
              updatedAt: serverTimestamp()
            });
          } else {
            console.warn('Referred Affiliate is blocked or inactive. Escrow locked.');
          }
        }
      }
      triggerReload();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleRejectOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectOrderId || !rejectionNotes.trim()) return;

    setSubmittingReject(true);
    try {
      const orderRef = doc(db, 'orders', rejectOrderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const order = orderSnap.data() as OrderDoc;

        // Reset/Deduct pending commissions for affiliate if referred
        if (order.affiliateId) {
          const affRef = doc(db, 'users', order.affiliateId);
          await updateDoc(affRef, {
            pendingCommission: increment(-order.affiliateCommission),
            updatedAt: serverTimestamp()
          });
        }

        // Apply rejection fields
        await updateDoc(orderRef, {
          status: 'rejected',
          notes: rejectionNotes.trim(),
          updatedAt: serverTimestamp()
        });
      }

      setRejectOrderId(null);
      setRejectionNotes('');
      triggerReload();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${rejectOrderId}`);
    } finally {
      setSubmittingReject(false);
    }
  };

  // 6. Cash Withdrawal Settlement (Payouts)
  const handleSettlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlePayoutId || !payoutUtr.trim()) return;

    setSubmittingPayout(true);
    try {
      const payRef = doc(db, 'payouts', settlePayoutId);
      await updateDoc(payRef, {
        status: 'settled',
        utr: payoutUtr.trim(),
        updatedAt: serverTimestamp()
      });

      setSettlePayoutId(null);
      setPayoutUtr('');
      triggerReload();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payouts/${settlePayoutId}`);
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleRejectPayout = async (payout: PayoutDoc) => {
    if (!confirm(`Reject payout request? The amount of ₹${payout.amount} will be returned to the affiliate's wallet.`)) return;

    try {
      // Reject payout request
      const payRef = doc(db, 'payouts', payout.id);
      await updateDoc(payRef, {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });

      // Credit the amount back to affiliate wallet
      const affRef = doc(db, 'users', payout.affiliateId);
      await updateDoc(affRef, {
        walletBalance: increment(payout.amount),
        updatedAt: serverTimestamp()
      });

      triggerReload();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payouts/${payout.id}`);
    }
  };

  // Order filters
  const pendingOrders = orders.filter(o => o.status === 'all' || o.status === 'pending');
  const settledOrders = orders.filter(o => o.status === 'approved' || o.status === 'rejected');

  // Payout filters
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const settledPayouts = payouts.filter(p => p.status === 'settled' || p.status === 'rejected');

  // Affiliate applicant filters
  const affiliateApplicants = usersList.filter(u => u.affiliateStatus === 'pending');

  // Real-time Earnings Calculations
  const approvedOrders = orders.filter(o => o.status === 'approved');
  const now = new Date();
  
  // Today start date (local midnight)
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  
  // This month start date
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayEarnings = approvedOrders
    .filter(o => {
      let oDate = new Date();
      if (o.createdAt) {
        if (typeof o.createdAt.toDate === 'function') {
          oDate = o.createdAt.toDate();
        } else if (o.createdAt.seconds) {
          oDate = new Date(o.createdAt.seconds * 1000);
        } else {
          oDate = new Date(o.createdAt);
        }
      }
      return oDate >= todayStart;
    })
    .reduce((sum, o) => sum + (o.price || 0), 0);

  const monthEarnings = approvedOrders
    .filter(o => {
      let oDate = new Date();
      if (o.createdAt) {
        if (typeof o.createdAt.toDate === 'function') {
          oDate = o.createdAt.toDate();
        } else if (o.createdAt.seconds) {
          oDate = new Date(o.createdAt.seconds * 1000);
        } else {
          oDate = new Date(o.createdAt);
        }
      }
      return oDate >= monthStart;
    })
    .reduce((sum, o) => sum + (o.price || 0), 0);

  // Generate last 7 days sales data for Recharts Graph
  const getGraphData = () => {
    const dataMap: { [key: string]: number } = {};
    const dates = [];
    
    // Initialize last 7 days with 0 balances
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dates.push(label);
      dataMap[label] = 0;
    }
    
    // Group approved orders into those days
    approvedOrders.forEach(o => {
      let oDate = new Date();
      if (o.createdAt) {
        if (typeof o.createdAt.toDate === 'function') {
          oDate = o.createdAt.toDate();
        } else if (o.createdAt.seconds) {
          oDate = new Date(o.createdAt.seconds * 1000);
        } else {
          oDate = new Date(o.createdAt);
        }
      }
      const label = oDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (label in dataMap) {
        dataMap[label] += (o.price || 0);
      }
    });
    
    return dates.map(lbl => ({
      date: lbl,
      Earnings: dataMap[lbl]
    }));
  };

  const graphData = getGraphData();

  return (
    <div className="space-y-12 pb-16 text-slate-100">
      {/* Tab controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            activeSubTab === 'overview' 
              ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20 shadow-lg' 
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <Activity className="h-4.5 w-4.5" />
          <span>Overview Analytics</span>
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            activeSubTab === 'orders' 
              ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20 shadow-lg' 
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <CreditCard className="h-4.5 w-4.5" />
          <span>Orders to Verify ({pendingOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('payouts')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            activeSubTab === 'payouts' 
              ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20 shadow-lg' 
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <Award className="h-4.5 w-4.5" />
          <span>Withdrawal Cashouts ({pendingPayouts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            activeSubTab === 'products' 
              ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20 shadow-lg' 
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <Package className="h-4.5 w-4.5" />
          <span>Inventory Courses ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            activeSubTab === 'categories' 
              ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20 shadow-lg' 
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <Grid className="h-4.5 w-4.5" />
          <span>Category Settings ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            activeSubTab === 'users' 
              ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20 shadow-lg' 
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <Users className="h-4.5 w-4.5" />
          <span>Registered Users</span>
        </button>
      </div>

      {/* CORE INNER TABS */}

      {/* 0. OVERVIEW ANALYTICS TAB */}
      {activeSubTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Real-time stats widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Today's Earnings */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-indigo-500/20 transition-all shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">Today's Earnings</span>
                <span className="p-2 justify-center rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <TrendingUp className="h-4.5 w-4.5" />
                </span>
              </div>
              <div className="mt-4 space-y-1">
                <h3 className="text-4xl font-black text-slate-100 tracking-tight font-sans">
                  ₹{todayEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span>✓ Live updated from real transactions</span>
                </p>
              </div>
            </div>

            {/* This Month's Earnings */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-purple-500/20 transition-all shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-24 w-24 bg-purple-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">This Month's Earnings</span>
                <span className="p-2 justify-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <Award className="h-4.5 w-4.5" />
                </span>
              </div>
              <div className="mt-4 space-y-1">
                <h3 className="text-4xl font-black text-slate-100 tracking-tight font-sans">
                  ₹{monthEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Current Billing Cycle: {now.toLocaleString('default', { month: 'long' })}
                </p>
              </div>
            </div>

            {/* Live Website Traffic Counter */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-emerald-500/20 transition-all shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Live Website Traffic
                </span>
                <span className="p-2 justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Globe className="h-4.5 w-4.5 animate-pulse" />
                </span>
              </div>
              <div className="mt-4 space-y-1">
                <h3 className="text-4xl font-black text-emerald-400 tracking-tight font-sans">
                  {activeBrowsers} <span className="text-xs font-mono font-medium text-slate-400">active now</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  Real-time unique node heartbeats checked in
                </p>
              </div>
            </div>
          </div>

          {/* Interactive sales graphs and administration dashboard controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Analytics Graph */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl space-y-4">
              <div>
                <h4 className="font-display font-medium text-slate-100 text-base">Weekly Digital Invoice Stream</h4>
                <p className="text-xs text-slate-500 font-mono">Daily volume progression across approved academic purchases</p>
              </div>
              <div className="w-full">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f1f5f9' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold', fontSize: 11 }}
                      itemStyle={{ color: '#818cf8', fontSize: 12 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Earnings" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorEarnings)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Global Announcement System (One-Click Notification Control Board) */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-display font-medium text-slate-100 text-base flex items-center gap-2">
                    <Megaphone className="h-4.5 w-4.5 text-indigo-400" />
                    Global Broadcaster
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">One-click notification warning system active sitewide.</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono leading-relaxed text-slate-400 space-y-1.5 shadow-inner">
                  <span className="text-[9px] uppercase font-black text-indigo-400 tracking-wider">Currently Active:</span>
                  <div className="text-slate-200">
                    {announcement ? `"${announcement}"` : <span className="text-slate-600">No active notification broadcast</span>}
                  </div>
                </div>

                <form onSubmit={handleDeployAnnouncement} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono">Set Alert Broadcast</label>
                    <textarea
                      value={announcementInput}
                      onChange={(e) => setAnnouncementInput(e.target.value)}
                      placeholder="e.g. Offer ends tonight at 12 AM! Use code NEXTSECURE"
                      rows={3}
                      maxLength={180}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingAnnouncement}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-[0_4px_12px_rgba(99,102,241,0.2)] scroll-smooth cursor-pointer"
                  >
                    {isSubmittingAnnouncement ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Deploying...</span>
                      </>
                    ) : (
                      <span>Broadcast Systemwide</span>
                    )}
                  </button>
                </form>
              </div>

              {announcement && (
                <div className="pt-4 border-t border-slate-800/60 mt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await updateAnnouncement('');
                        setAnnouncementInput('');
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="w-full py-2 px-3 hover:bg-rose-500/10 text-rose-400 border border-transparent hover:border-rose-500/20 rounded-xl text-[10px] font-mono tracking-wider font-bold uppercase transition-all cursor-pointer"
                  >
                    ✕ Kill Active broadcast
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. ORDERS TAB */}
      {activeSubTab === 'orders' && (
        <div className="space-y-8">
          {/* Pending Sales Orders to Approve */}
          <div className="glass-panel border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">Sales Receipts Verification</h3>
              <span className="text-xs bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-400 font-mono font-bold">
                {pendingOrders.length} Pending Reconciliation
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left order-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-xs uppercase bg-slate-950/40">
                    <th className="py-3 px-6">Buyer Profile</th>
                    <th className="py-3 px-6">Selected Course</th>
                    <th className="py-3 px-6">UTR Number</th>
                    <th className="py-3 px-6 text-center">Receipt Screenshot</th>
                    <th className="py-3 px-6">Referral Commission</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {pendingOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-900/20 transition-all font-sans">
                      <td className="py-4 px-6">
                        <span className="font-semibold block text-slate-200">{ord.userEmail}</span>
                        <span className="text-[10px] font-mono text-slate-500">ID: {ord.userId}</span>
                      </td>
                      <td className="py-4 px-6 font-medium">{ord.productTitle}</td>
                      <td className="py-4 px-6 font-mono text-xs font-bold text-slate-300">{ord.utr}</td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center">
                          {ord.screenshotUrl ? (
                            <button
                              onClick={() => setZoomedScreenshot(ord.screenshotUrl)}
                              className="group relative h-12 w-20 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center hover:border-indigo-500 transition-all bg-slate-950 aspect-[4/3]"
                            >
                              <img src={ord.screenshotUrl} alt="receipt" className="h-full w-full object-cover group-hover:opacity-70" />
                              <ZoomIn className="absolute text-white h-4.5 w-4.5 opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">Missing screenshot</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {ord.affiliateId ? (
                          <div className="text-xs space-y-0.5">
                            <span className="text-emerald-400 font-mono font-bold">+₹{Number(ord.affiliateCommission).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="block text-[9px] font-mono text-slate-500 font-bold truncate max-w-[120px]">Partner: {ord.affiliateId}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Direct Purchase</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleApproveOrder(ord)}
                            className="p-2 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-500/20 text-emerald-400 text-xs font-bold transition-all flex items-center space-x-1.5"
                            title="Approve Order"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => setRejectOrderId(ord.id)}
                            className="p-2 bg-rose-600/10 hover:bg-rose-600 hover:text-white rounded-lg border border-rose-500/20 text-rose-400 text-xs font-bold transition-all flex items-center space-x-1.5"
                            title="Reject/Flag Order"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Flag</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 text-xs font-semibold">
                        No pending purchase receipts to verify. Splendid job keeping up!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Verified Collections */}
          <div className="glass-panel border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800">
              <h3 className="font-display font-semibold text-lg text-slate-400">Archived Verification Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left order-collapse text-sm text-slate-400">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase bg-slate-950/10 text-slate-500 font-mono">
                    <th className="py-2.5 px-6">Order ID</th>
                    <th className="py-2.5 px-6">Buyer</th>
                    <th className="py-2.5 px-6">Selected Course</th>
                    <th className="py-2.5 px-6 font-mono">Amount</th>
                    <th className="py-2.5 px-6">Reconciled Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {settledOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-900/10 transition-all font-sans text-xs">
                      <td className="py-3 px-6 font-mono font-semibold">{ord.id}</td>
                      <td className="py-3 px-6 text-slate-300">{ord.userEmail}</td>
                      <td className="py-3 px-6 text-slate-300 font-medium">{ord.productTitle}</td>
                      <td className="py-3 px-6 font-mono font-medium text-indigo-400">₹{Number(ord.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-3 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize ${
                          ord.status === 'approved' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {settledOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-600 text-xs font-semibold font-mono">
                        No verification logs registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. WITHDRAWAL CASHOUTS TAB */}
      {activeSubTab === 'payouts' && (
        <div className="space-y-8">
          {/* Affiliate Pending approvals */}
          {affiliateApplicants.length > 0 && (
            <div className="glass-panel border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 bg-indigo-950/10">
                <h3 className="font-display font-bold text-lg text-indigo-400">Partner Program Applicants</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left order-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-mono text-xs uppercase bg-slate-950/40">
                      <th className="py-3 px-6">Applicant Name</th>
                      <th className="py-3 px-6">Selected Payout Target Coordinates</th>
                      <th className="py-3 px-6 text-right">Decisions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {affiliateApplicants.map((appl) => (
                      <tr key={appl.uid} className="hover:bg-slate-900/20 transition-all font-sans text-slate-300">
                        <td className="py-4 px-6 font-medium">
                          <span className="block text-slate-200">{appl.displayName}</span>
                          <span className="text-[10px] font-mono text-slate-500">{appl.email}</span>
                        </td>
                        <td className="py-4 px-6 font-mono text-xs">{appl.payoutDetails || 'Unspecified bank detail'}</td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleAffiliateRequest(appl, true)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all flex items-center space-x-1"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Authorize Partner</span>
                            </button>
                            <button
                              onClick={() => handleAffiliateRequest(appl, false)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-400 transition-all flex items-center space-x-1"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Payout requests */}
          <div className="glass-panel border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">Partner Cash-Out Requests</h3>
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-400 font-mono font-bold">
                {pendingPayouts.length} Pending Settlement
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left order-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-mono text-xs uppercase bg-slate-950/40">
                    <th className="py-3 px-6">Affiliate Partner</th>
                    <th className="py-3 px-6">Amount Request</th>
                    <th className="py-3 px-6">Payment Target Coordinates</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {pendingPayouts.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-900/20 transition-all font-sans">
                      <td className="py-4 px-6 font-medium">
                        <span className="block text-slate-200">{pay.affiliateEmail}</span>
                        <span className="text-[10px] font-mono text-slate-500">ID: {pay.affiliateId}</span>
                      </td>
                      <td className="py-4 px-6 font-mono font-black text-emerald-400 text-base">₹{Number(pay.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-4 px-6 font-mono text-xs break-all">{pay.payoutDetails}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSettlePayoutId(pay.id)}
                            className="p-2 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-500/20 text-emerald-400 text-xs font-bold transition-all flex items-center space-x-1.5"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Commit Settlement</span>
                          </button>
                          <button
                            onClick={() => handleRejectPayout(pay)}
                            className="p-2 bg-rose-600/10 hover:bg-rose-600 hover:text-white rounded-lg border border-rose-500/20 text-rose-400 text-xs font-bold transition-all"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingPayouts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500 text-xs font-semibold">
                        No withdrawal cashout requests detected. All settled!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Settled payout history */}
          <div className="glass-panel border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 bg-slate-950/10">
              <h3 className="font-display font-semibold text-lg text-slate-400">Withdrawal Archive Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left order-collapse text-sm text-slate-400">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase bg-slate-950/20 text-slate-500 font-mono">
                    <th className="py-2.5 px-6">Payout ID</th>
                    <th className="py-2.5 px-6">Affiliate</th>
                    <th className="py-2.5 px-6">Amount Paid</th>
                    <th className="py-2.5 px-6">Verification UTR</th>
                    <th className="py-2.5 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {settledPayouts.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-900/10 transition-all font-sans text-xs">
                      <td className="py-3 px-6 font-mono font-semibold">{pay.id}</td>
                      <td className="py-3 px-6 text-slate-300">{pay.affiliateEmail}</td>
                      <td className="py-3 px-6 font-mono text-emerald-400">₹{Number(pay.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-3 px-6 font-mono text-slate-300">{pay.utr || 'N/A'}</td>
                      <td className="py-3 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize ${
                          pay.status === 'settled' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {pay.status === 'settled' ? 'Approved' : 'Rejected'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {settledPayouts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-600 text-xs font-semibold font-mono">
                        No payouts in archive.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. INVENTORY TAB */}
      {activeSubTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Creator Form (1/3 width) */}
          <div className="glass-panel border border-slate-800/60 p-6 rounded-2xl shadow-xl">
            <h3 className="font-display font-bold text-lg mb-6 flex items-center space-x-2">
              <PlusCircle className="h-5 w-5 text-indigo-400" />
              <span>Add Course Artifact</span>
            </h3>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 font-mono">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next.js 3D Masterclass"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 font-mono">Category *</label>
                  <select
                    required
                    value={courseCat}
                    onChange={(e) => setCourseCat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200"
                  >
                    <option value="">Select</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 font-mono">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="99.00"
                    value={coursePrice}
                    onChange={(e) => setCoursePrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 font-mono">Aff. Commission % *</label>
                  <input
                    type="number"
                    max="100"
                    required
                    placeholder="45"
                    value={courseComm}
                    onChange={(e) => setCourseComm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 font-mono">Course Thumbnail File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbFileChange}
                    className="w-full text-[10px] text-slate-400 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 file:cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 font-mono">Or Thumbnail Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/banner.png"
                  value={courseThumb}
                  onChange={(e) => setCourseThumb(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 font-mono">Download Link / Access Details *</label>
                <input
                  type="text"
                  required
                  placeholder="Private credentials download URL"
                  value={courseLink}
                  onChange={(e) => setCourseLink(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 font-mono">Description *</label>
                <textarea
                  rows={3}
                  placeholder="Course content specifications..."
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-700 font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingCourse}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold block text-sm transition-all"
              >
                {isSubmittingCourse ? 'Generating Item...' : 'Commit Product'}
              </button>
            </form>
          </div>

          {/* Master Table listing (2/3 width) */}
          <div className="lg:col-span-2 glass-panel border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800">
              <h3 className="font-display font-bold text-lg">Active Product Records</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left order-collapse text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-mono text-xs uppercase bg-slate-950/40">
                    <th className="py-3 px-6">Product Details</th>
                    <th className="py-3 px-6">Category</th>
                    <th className="py-3 px-6 font-mono">Price</th>
                    <th className="py-3 px-6 font-mono">Partner Split</th>
                    <th className="py-3 px-6 text-right">Inventory Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/10 transition-all font-sans text-xs">
                      <td className="py-3 px-6">
                        <span className="font-semibold block text-slate-200 text-sm">{p.title}</span>
                        <span className="text-[10px] font-mono text-slate-500">ID: {p.id}</span>
                      </td>
                      <td className="py-3 px-6 capitalize">{p.category}</td>
                      <td className="py-3 px-6 font-mono text-indigo-400 font-bold text-sm">₹{Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-3 px-6 font-mono text-emerald-400 font-bold">{p.commissionPercentage}%</td>
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => handleDeleteCourse(p.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-all border border-transparent hover:border-rose-500/10"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 text-xs font-semibold">
                        BondEver warehouse is empty. Commit some courses!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. CATEGORIES TAB */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Creator form (1/3) */}
          <div className="glass-panel border border-slate-800/60 p-6 rounded-2xl shadow-xl h-fit">
            <h3 className="font-display font-bold text-lg mb-6 flex items-center space-x-2">
              <PlusCircle className="h-5 w-5 text-indigo-400" />
              <span>Create Category tag</span>
            </h3>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 font-mono">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DEVELOPMENT, MARKETING"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-700"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingCat}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold block text-sm transition-all"
              >
                {isSubmittingCat ? 'Saving Item...' : 'Commit Category'}
              </button>
            </form>
          </div>

          {/* Table display list (2/3) */}
          <div className="md:col-span-2 glass-panel border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800">
              <h3 className="font-display font-bold text-lg">Category Tags Inventory</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left order-collapse text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-mono text-xs uppercase bg-slate-950/40">
                    <th className="py-3 px-6">Category ID</th>
                    <th className="py-3 px-6">Name Label</th>
                    <th className="py-3 px-6 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-900/10 transition-all font-sans text-xs">
                      <td className="py-3 px-6 font-mono text-slate-500">{c.id}</td>
                      <td className="py-3 px-6 font-semibold tracking-wider text-slate-200">{c.name}</td>
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-all border border-transparent hover:border-rose-500/10"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-500 text-xs font-semibold">
                        No custom product categories mapped yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. USERS PORTAL TAB */}
      {activeSubTab === 'users' && (
        <div className="glass-panel border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 space-y-1">
            <h3 className="font-display font-bold text-lg text-slate-100">Accounts Control Panel</h3>
            <p className="text-slate-400 text-xs">
              Manage user profiles, security block states, and custom commission rates. Every affiliate defaults to a 60% rate unless configured below.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left order-collapse text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-mono text-xs uppercase bg-slate-950/40">
                  <th className="py-3 px-6">User Email</th>
                  <th className="py-3 px-6 font-mono">Platform Role</th>
                  <th className="py-3 px-6 font-mono">Partner Comm %</th>
                  <th className="py-3 px-6 font-mono">Available Wallet</th>
                  <th className="py-3 px-6">Block State Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-400" />
                    </td>
                  </tr>
                ) : (
                  usersList.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-900/10 transition-all font-sans text-xs">
                      <td className="py-4 px-6">
                        <span className="font-semibold block text-slate-100">{user.displayName}</span>
                        <span className="text-[10px] font-mono text-slate-500">{user.email}</span>
                      </td>
                      <td className="py-4 px-6 font-mono">
                        <select
                          value={user.role}
                          disabled={user.email === 'arpitmaurya55555@gmail.com'}
                          onChange={(e) => handleChangeRole(user.uid, e.target.value as any)}
                          className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-indigo-400 py-1.5 px-2.5 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <option value="user">USER</option>
                          <option value="affiliate">AFFILIATE</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-4 px-6 font-mono">
                        <div className="flex items-center space-x-1 max-w-[120px]">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="60% (Def)"
                            value={user.customCommissionPercentage !== undefined && user.customCommissionPercentage !== null ? user.customCommissionPercentage : ''}
                            onChange={(e) => handleUpdateCommission(user.uid, e.target.value)}
                            className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-indigo-300 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-700 font-mono"
                          />
                          <span className="text-[10px] text-slate-500 font-bold font-mono">%</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-emerald-400 font-bold text-sm">
                        ₹{Number(user.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          {user.isBlocked ? (
                            <button
                              onClick={() => handleToggleBlock(user)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/20 font-bold text-[10px] uppercase font-mono tracking-wider flex items-center space-x-1.5 cursor-pointer"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              <span>Blocked (Lockout)</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleBlock(user)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/10 font-bold text-[10px] uppercase font-mono tracking-wider flex items-center space-x-1.5 cursor-pointer"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Active</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setResetPasswordUser(user);
                              setNewPasswordInput('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/15 font-bold text-[10px] uppercase font-mono tracking-wider flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Reset Pass</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------MODALS---------------- */}

      {/* Zoom Receipt image preview */}
      {zoomedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <div className="relative max-w-3xl w-full max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-3 shadow-2xl flex flex-col justify-between">
            <button
              onClick={() => setZoomedScreenshot(null)}
              className="absolute top-4 right-4 z-20 p-2 text-slate-300 hover:text-white bg-slate-950/40 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-[50vh] bg-slate-950 rounded-xl">
              <img src={zoomedScreenshot} alt="payment verification zoom" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Rejection / Flag Modal */}
      {rejectOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <form 
            onSubmit={handleRejectOrderSubmit} 
            className="bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-lg text-rose-400">Flag & Decline Enrollment</h4>
              <button type="button" onClick={() => setRejectOrderId(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-slate-400 text-xs">
              Let the buyer know why their transaction proof was rejected. Affiliate escrow pending commission will be retracted immediately.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 font-mono">Reason for Rejection *</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. UTR matches another purchase or screenshot is blurred"
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectOrderId(null)}
                className="px-4 py-2 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReject}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white rounded-lg flex items-center space-x-1"
              >
                {submittingReject ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>Commit Rejection</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Settle Payout modal */}
      {settlePayoutId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <form 
            onSubmit={handleSettlePayoutSubmit} 
            className="bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-lg text-emerald-400">Submit payout settlement</h4>
              <button type="button" onClick={() => setSettlePayoutId(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-slate-400 text-xs">
              Confirm you have completed the manual bank transfer. Enter the settlement UTR/transaction target code below.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 font-mono">Payout Transfer UTR *</label>
              <input
                type="text"
                required
                placeholder="Enter 12-digit transaction number"
                value={payoutUtr}
                onChange={(e) => setPayoutUtr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 font-mono"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSettlePayoutId(null)}
                className="px-4 py-2 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayout}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white rounded-lg flex items-center space-x-1"
              >
                {submittingPayout ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>Mark as Settled</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Password Modal Overlay */}
      {resetPasswordUser && (
        <div id="password-reset-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <form 
            onSubmit={handleResetPasswordSubmit} 
            className="bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-lg text-indigo-400">Force Reset User Password</h4>
              <button type="button" onClick={() => setResetPasswordUser(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-slate-400 text-xs">
              Set a new password for <span className="text-slate-200 font-mono font-bold">{resetPasswordUser.email}</span>. This forcefully overrides their login credentials.
            </p>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-slate-400 font-mono block">New Password *</label>
              <input
                type="text"
                required
                minLength={6}
                placeholder="Enter new custom password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="px-4 py-2 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingResetPassword}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white rounded-lg flex items-center space-x-1"
              >
                {submittingResetPassword ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>Overwrite Password</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
