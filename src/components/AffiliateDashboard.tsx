import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, updateDoc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Line, Legend, ComposedChart 
} from 'recharts';
import { 
  Copy, Check, Wallet, Landmark, ArrowUpRight, TrendingUp, Users, Percent, 
  Send, RefreshCw, Layers, Sparkles, ShieldAlert, AlertCircle, Loader2,
  User, Save, Zap, Rocket, Flame, Crown, Calculator, Award
} from 'lucide-react';
import { PayoutDoc } from '../types';

export const AffiliateDashboard: React.FC = () => {
  const { userData, orders, payouts, triggerReload, products } = useApp();
  const [copied, setCopied] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [payoutInputError, setPayoutInputError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState<boolean>(false);
  const [chartView, setChartView] = useState<'all' | 'earnings' | 'conversions'>('all');

  // Earnings Calculator states (synchronized to user rate)
  const [calcSalesPerDay, setCalcSalesPerDay] = useState<number>(5);
  const [calcCoursePrice, setCalcCoursePrice] = useState<number>(299);
  const [calcCommissionPercent, setCalcCommissionPercent] = useState<number>(60);

  const myCommissionRate = (userData?.customCommissionPercentage !== undefined && userData?.customCommissionPercentage !== null)
    ? Number(userData.customCommissionPercentage)
    : 60;

  React.useEffect(() => {
    setCalcCommissionPercent(myCommissionRate);
  }, [myCommissionRate]);

  // Profile / Payout coordinates editing states
  const [editDisplayName, setEditDisplayName] = useState<string>(userData?.displayName || '');
  const [editPayoutDetails, setEditPayoutDetails] = useState<string>(userData?.payoutDetails || '');
  const [withdrawPayoutDetails, setWithdrawPayoutDetails] = useState<string>(userData?.payoutDetails || '');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string>('');
  const [profileError, setProfileError] = useState<string>('');

  // Sync state values when userData changes/loads
  React.useEffect(() => {
    if (userData) {
      setEditDisplayName(userData.displayName || '');
      setEditPayoutDetails(userData.payoutDetails || '');
      setWithdrawPayoutDetails(userData.payoutDetails || '');
    }
  }, [userData]);

  // Affiliate activation states
  const [actPayoutDetails, setActPayoutDetails] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [actError, setActError] = useState<string>('');

  // Product specific affiliate builders
  const [selectedBuilderProduct, setSelectedBuilderProduct] = useState<string>('');
  const [customProductCode, setCustomProductCode] = useState<string>('');
  const [copiedProductLink, setCopiedProductLink] = useState<string>('');

  // Auto-init selected builder product when products load
  React.useEffect(() => {
    if (products && products.length > 0 && !selectedBuilderProduct) {
      setSelectedBuilderProduct(products[0].id);
    }
  }, [products]);

  const handleInstantActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !actPayoutDetails.trim()) return;
    setIsActivating(true);
    setActError('');
    try {
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        role: 'affiliate',
        affiliateStatus: 'approved',
        payoutDetails: actPayoutDetails.trim(),
        updatedAt: serverTimestamp()
      });
      triggerReload();
    } catch (err: any) {
      console.error(err);
      setActError('Failed to activate affiliate parameters. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    if (!editDisplayName.trim() || !editPayoutDetails.trim()) {
      setProfileError('Display Name and Payout details cannot be empty.');
      return;
    }
    setIsSavingProfile(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        displayName: editDisplayName.trim(),
        payoutDetails: editPayoutDetails.trim(),
        updatedAt: serverTimestamp()
      });
      setProfileSuccess('Your profile credentials and payout target coordinates have been securely updated!');
      triggerReload();
      setTimeout(() => setProfileSuccess(''), 5050);
    } catch (err: any) {
      console.error('Failed to update profile details:', err);
      setProfileError('Failed to save changes. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 1. Live link creator
  const refLink = `${window.location.origin}/?ref=${userData?.uid}`;

  const copyRefLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyProductLink = (linkToCopy: string) => {
    navigator.clipboard.writeText(linkToCopy);
    setCopiedProductLink(linkToCopy);
    setTimeout(() => setCopiedProductLink(''), 2000);
  };

  // If the user's role is still 'user' (has not activated yet), show the Activation panel
  if (userData && userData.role === 'user') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="glass-panel border border-slate-800 p-8 rounded-3xl relative overflow-hidden space-y-8 shadow-[0_15px_30px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 h-48 w-48 bg-[#6366f1]/10 rounded-full blur-3xl"></div>
          
          <div className="space-y-3 relative text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 font-mono text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
              <span>Partner Workspace</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-white">
              Activate Affiliate Hub
            </h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
              Unlock residual commission metrics, custom URL structures, and instant tracking. Anyone can become an academic partner and earn <span className="text-indigo-400 font-bold">45% splits</span> on every referred booking!
            </p>
          </div>

          <div className="border-t border-slate-900 pt-6">
            <h4 className="text-slate-200 text-sm font-bold mb-4">Why Partner With BondEver?</h4>
            <ul className="text-slate-400 text-xs space-y-3 font-medium">
              <li className="flex items-start">
                <span className="text-indigo-400 mr-2 font-bold font-mono">✓</span>
                <span>Get unique product links automatically for individual courses with your custom parameters.</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-400 mr-2 font-bold font-mono">✓</span>
                <span>Claim a generous 45% commission fee immediately when buyers verify their payment receipt UTRs.</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-400 mr-2 font-bold font-mono">✓</span>
                <span>Transparent payouts ledger: Request one-click capital extraction directly to your designated bank account.</span>
              </li>
            </ul>
          </div>

          {actError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center space-x-2">
              <span className="font-bold font-mono">✕</span>
              <span>{actError}</span>
            </div>
          )}

          <form onSubmit={handleInstantActivation} className="space-y-4 pt-4 border-t border-slate-900">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                Your Payout Coordinates (UPI, Bank Account, PayPal) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. UPI ID, Bank Name / Account, or PayPal address"
                value={actPayoutDetails}
                onChange={(e) => setActPayoutDetails(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              <span className="block text-[10px] text-slate-500 font-medium tracking-wide">
                These coordinates will be used when you click "Request Payout" in your dashboard. You can update this at any time.
              </span>
            </div>

            <button
              type="submit"
              disabled={isActivating}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wide rounded-xl shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isActivating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Activating Workspace...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5 text-indigo-200" />
                  <span>Activate My Affiliate Account Instantly</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Fetch only orders referred by this affiliate user
  const refOrders = orders.filter(o => o.affiliateId === userData?.uid);
  const approvedRefOrders = refOrders.filter(o => o.status === 'approved');

  // 3. Mathematical variables
  const walletBalance = userData?.walletBalance || 0;
  const totalEarned = userData?.totalEarned || 0;
  const clicks = userData?.clicks || 0;
  const conversionRate = clicks > 0 ? (approvedRefOrders.length / clicks) * 100 : 0;

  // Calculate total pending withdrawal requests for this affiliate
  const userPendingPayouts = payouts.filter(p => p.affiliateId === userData?.uid && p.status === 'pending');
  const pendingWithdrawalAmount = userPendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  // 4. Chart data structures (Real 30-day timeline trend for Commissions & Conversions)
  const get30DaysTrendData = () => {
    const commissionObj: { [key: string]: number } = {};
    const conversionsObj: { [key: string]: number } = {};
    const nowLocalDate = new Date();
    
    // Pre-populate last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(nowLocalDate.getDate() - i);
      const keyStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      commissionObj[keyStr] = 0;
      conversionsObj[keyStr] = 0;
    }
    
    // Accumulate actual commissions and conversions
    approvedRefOrders.forEach(ord => {
      if (!ord.createdAt) return;
      const orderDate = ord.createdAt.seconds 
        ? new Date(ord.createdAt.seconds * 1000) 
        : new Date(ord.createdAt);
      const keyStr = orderDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      if (commissionObj[keyStr] !== undefined) {
        commissionObj[keyStr] += ord.affiliateCommission || 0;
        conversionsObj[keyStr] += 1;
      }
    });
    
    return Object.keys(commissionObj).map(dateStr => ({
      name: dateStr,
      Commission: Number(commissionObj[dateStr].toFixed(2)),
      Conversions: conversionsObj[dateStr]
    }));
  };

  const displayChartData = get30DaysTrendData();

  // 5. Submit Affiliate Payout
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutInputError('');
    setSuccessMsg('');
    
    if (!userData) return;
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setPayoutInputError('Please enter a valid payout amount.');
      return;
    }
    if (amount > walletBalance) {
      setPayoutInputError(`Maximum extractable amount is ₹${walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      return;
    }
    if (!withdrawPayoutDetails.trim()) {
      setPayoutInputError('Please provide your UPI ID or bank payout details so we can process your deposit.');
      return;
    }

    setIsSubmitting(true);
    const payoutId = 'PAY_' + Math.random().toString(36).substring(2, 11).toUpperCase();

    try {
      // Create pending payout request payload
      const payoutData: PayoutDoc = {
        id: payoutId,
        affiliateId: userData.uid,
        affiliateEmail: userData.email,
        amount: amount,
        status: 'pending',
        utr: null,
        payoutDetails: withdrawPayoutDetails.trim(),
        createdAt: new Date(), // Local fallback or server timestamp
        updatedAt: new Date()
      };

      // Perform atomic batch write to guarantee zero discrepancies
      const batch = writeBatch(db);
      const payoutRef = doc(db, 'payouts', payoutId);
      const userRef = doc(db, 'users', userData.uid);

      batch.set(payoutRef, payoutData);
      batch.update(userRef, {
        walletBalance: increment(-amount),
        payoutDetails: withdrawPayoutDetails.trim(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();

      setSuccessMsg(`Requested withdraw of ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} successfully! Status is pending verification.`);
      setWithdrawAmount('');
      triggerReload();
      setTimeout(() => {
        setIsWithdrawalModalOpen(false);
        setSuccessMsg('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Failed to submit request. Please ensure you have configured your UPI/Bank payout details under Edit Profile and try again.';
      if (err && err.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed && parsed.error) {
            errMsg = `Firestore Error: ${parsed.error}`;
          }
        } catch (_) {
          if (err.message.includes('permission') || err.message.includes('Permission')) {
            errMsg = 'Permission Denied: Ensure you configured your Payout Details (UPI ID) first and that your wallet has enough balance.';
          } else {
            errMsg = `Error: ${err.message}`;
          }
        }
      }
      setPayoutInputError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Link generator and banner */}
      <div className="glass-panel border border-slate-800/60 p-6 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="space-y-2 flex-1">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Referrals Engine Active</span>
          </div>
          <h2 className="font-display font-black text-2xl text-white">Your Affiliate Link</h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
            Invite colleagues, teammates, or subscribers using your custom 3D key parameter link to claim 45% commission splits on approved sales.
          </p>
        </div>

        {/* Copy controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch max-w-xl w-full xl:w-auto">
          <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 flex items-center justify-between font-mono text-xs text-indigo-300 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            <span className="truncate">{refLink}</span>
          </div>
          <button
            onClick={copyRefLink}
            className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 active:scale-95 ${
              copied 
                ? 'bg-emerald-600 border border-emerald-400/20 text-white shadow-lg' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)]'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Copied Link!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Referral Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Profile & Payout Settings Card */}
      <div className="glass-panel border border-slate-800/60 p-6 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 rounded-full blur-3xl"></div>
        
        <div className="space-y-1">
          <h3 className="font-display font-black text-xl text-white flex items-center space-x-2">
            <User className="h-5 w-5 text-indigo-400" />
            <span>Profile & Payout Settings</span>
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm">
            View your permanent partner credentials and update your public academy display name or payment collection target coordinates.
          </p>
        </div>

        {profileSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-fadeIn">
            <Check className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 animate-fadeIn">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfileSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Permanent Affiliate User ID */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold font-mono tracking-wider text-slate-400 block">
              YOUR PARTNER ID (UID)
            </label>
            <input
              type="text"
              readOnly
              value={userData?.uid || ''}
              className="w-full bg-slate-950/60 border border-slate-900 rounded-xl px-4 py-3 text-xs text-slate-500 font-mono focus:outline-none cursor-not-allowed select-all"
            />
            <span className="block text-[10px] text-slate-500 font-medium">Permanent unique ID used to map direct transaction referrers.</span>
          </div>

          {/* Edit Display Name */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold font-mono tracking-wider text-slate-400 block">DISPLAY NAME *</label>
            <input
              type="text"
              required
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            />
            <span className="block text-[10px] text-slate-500 font-medium">Your public identity displayed across the partner lists.</span>
          </div>

          {/* Edit Payout/Payment Target ID */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold font-mono tracking-wider text-slate-400 block">PAYMENT ID & COORDINATES *</label>
            <input
              type="text"
              required
              placeholder="UPI ID, Bank Transfer code, or PayPal email"
              value={editPayoutDetails}
              onChange={(e) => setEditPayoutDetails(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            />
            <span className="block text-[10px] text-slate-500 font-medium font-mono">The target UPI address or bank transfers details for withdrawals.</span>
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-lg hover:shadow-indigo-600/20 cursor-pointer duration-200 active:scale-95"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Profile Updates</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Product-Specific 3D Referral Link Builder */}
      <div className="glass-panel border border-slate-800/60 p-6 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="space-y-1">
          <h3 className="font-display font-black text-xl text-white flex items-center space-x-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <span>Product-Specific Referral Links</span>
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm">
            Generate customized links for specific courses inside the academy using the unique product code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Option 1: Pick from Catalog */}
          <div className="bg-slate-950/40 border border-slate-900 p-5 rounded-xl space-y-4">
            <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-widest block">Option 1: Pick from Catalog</span>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 font-mono">Select Active Course:</label>
              <select
                value={selectedBuilderProduct}
                onChange={(e) => {
                  setSelectedBuilderProduct(e.target.value);
                  setCustomProductCode(''); // Reset manual entry
                }}
                className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (₹{Number(p.price).toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                  </option>
                ))}
                {products.length === 0 && <option>No courses available</option>}
              </select>
            </div>

            {selectedBuilderProduct && (() => {
              const matched = products.find(p => p.id === selectedBuilderProduct);
              if (!matched) return null;
              const specificUrl = `${window.location.origin}/?ref=${userData?.uid}&prod=${matched.id}`;
              const myCommPercent = (userData?.customCommissionPercentage !== undefined && userData?.customCommissionPercentage !== null)
                ? Number(userData.customCommissionPercentage)
                : 60;
              const specificComm = Number(((matched.price * myCommPercent) / 100).toFixed(2));
              return (
                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-900">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">Product Price</span>
                      <span className="text-slate-200 font-bold">₹{Number(matched.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-900">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">Your Share ({myCommPercent}%)</span>
                      <span className="text-emerald-400 font-bold">₹{Number(specificComm).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-indigo-400 block font-bold uppercase tracking-wider">Product Link:</span>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-950 border border-slate-900 rounded-lg px-3 py-2.5 font-mono text-xs text-indigo-300 overflow-hidden text-ellipsis whitespace-nowrap">
                        {specificUrl}
                      </div>
                      <button
                        onClick={() => copyProductLink(specificUrl)}
                        className={`flex-shrink-0 px-4 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center ${
                          copiedProductLink === specificUrl
                            ? 'bg-emerald-605 text-white'
                            : 'bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/20'
                        }`}
                      >
                        {copiedProductLink === specificUrl ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Option 2: Enter Product Code Manually */}
          <div className="bg-slate-950/40 border border-slate-900 p-5 rounded-xl space-y-4">
            <span className="text-[10px] font-bold font-mono text-purple-400 uppercase tracking-widest block">Option 2: Enter Product Code Manually</span>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 font-mono">Product Code / ID:</label>
              <input
                type="text"
                placeholder="e.g. course_id_here"
                value={customProductCode}
                onChange={(e) => {
                  setCustomProductCode(e.target.value);
                  setSelectedBuilderProduct(''); // Reset dropbox select
                }}
                className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono font-medium"
              />
              <span className="block text-[10px] text-slate-500 font-medium pb-2">
                Type any active product ID/code to generate a referral landing parameter link instantly.
              </span>
            </div>

            {customProductCode.trim() && (() => {
              const matched = products.find(p => p.id.trim() === customProductCode.trim() || p.id.toLowerCase() === customProductCode.trim().toLowerCase());
              const specificUrl = `${window.location.origin}/?ref=${userData?.uid}&prod=${customProductCode.trim()}`;
              return (
                <div className="pt-2 space-y-3">
                  {matched ? (
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-900">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase text-left">Status</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span> Valid Code
                        </span>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-900">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase text-left">Course Name</span>
                        <span className="text-slate-200 truncate block font-bold">{matched.title}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 text-[10px]/relaxed text-amber-400 font-mono">
                      ▲ Custom product code not matching active catalog DB, but the reference parameter tracking maps commissions normally.
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-purple-400 block font-bold uppercase tracking-wider">Product Link:</span>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-955 border border-slate-900 rounded-lg px-3 py-2.5 font-mono text-xs text-indigo-300 overflow-hidden text-ellipsis whitespace-nowrap">
                        {specificUrl}
                      </div>
                      <button
                        onClick={() => copyProductLink(specificUrl)}
                        className={`flex-shrink-0 px-4 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center ${
                          copiedProductLink === specificUrl
                            ? 'bg-emerald-600 text-white'
                            : 'bg-purple-600/30 text-purple-300 hover:bg-purple-600/40 border border-purple-500/20 font-semibold'
                        }`}
                      >
                        {copiedProductLink === specificUrl ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 3D Glassmorphic Metrcs Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Wallet Balance */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 relative glow-emerald overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-505 font-mono tracking-wider">Wallet Balance</span>
            <div className="p-2 justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-display font-black text-emerald-400">₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <div className="text-[10px] text-slate-500 font-mono">Available for instant extraction</div>
          </div>
        </div>

        {/* Card 2: Pending Cashouts */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 relative glow-amber overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-505 font-mono tracking-wider">Pending Cashout</span>
            <div className="p-2 justify-center rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <RefreshCw className="h-5 w-5 animate-spin-slow" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-display font-black text-amber-400">₹{pendingWithdrawalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <div className="text-[10px] text-slate-500 font-mono">Deducted from wallet, verification queue</div>
          </div>
        </div>

        {/* Card 3: Total Earned */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 relative glow-indigo overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-505 font-mono tracking-wider">Total Commission</span>
            <div className="p-2 justify-center rounded-xl bg-indigo-505/10 border border-indigo-500/25 text-indigo-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-display font-black text-indigo-400">₹{totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <div className="text-[10px] text-slate-500 font-mono">Gross approved earnings</div>
          </div>
        </div>

        {/* Card 4: Traffic & Conversions */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 relative glow-rose overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-505 font-mono tracking-wider">Link Conversions</span>
            <div className="p-2 justify-center rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-display font-black text-rose-400">{clicks}</span>
              <span className="text-xs font-bold text-indigo-400 font-mono">({conversionRate.toFixed(1)}% CR)</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Referral hits vs success purchases</div>
          </div>
        </div>
      </div>

      {/* Analytics chart and layout payout portals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Graph Area (2/3 width) */}
        <div className="lg:col-span-2 glass-panel border border-slate-800/60 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-slate-100 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                <span>Performance & Conversion Metrics</span>
              </h3>
              <p className="text-slate-400 text-xs font-sans">
                Interactive statistics monitoring daily commission earnings and customer referral conversions.
              </p>
            </div>

            {/* Chart View Toggle Controls */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setChartView('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  chartView === 'all'
                    ? 'bg-indigo-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Combined
              </button>
              <button
                type="button"
                onClick={() => setChartView('earnings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  chartView === 'earnings'
                    ? 'bg-indigo-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Earnings
              </button>
              <button
                type="button"
                onClick={() => setChartView('conversions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  chartView === 'conversions'
                    ? 'bg-rose-600 text-white shadow-[0_2px_8px_rgba(244,63,94,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Conversions
              </button>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'all' ? (
                <ComposedChart data={displayChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis 
                    yAxisId="left" 
                    stroke="#6366f1" 
                    fontSize={10} 
                    tickLine={false} 
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#f43f5e" 
                    fontSize={10} 
                    tickLine={false} 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      borderColor: 'rgba(99, 102, 241, 0.3)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '12px'
                    }} 
                    formatter={(value: any, name: any) => {
                      if (name === 'Commission') return [`₹${Number(value).toFixed(2)}`, 'Commission Earnings'];
                      if (name === 'Conversions') return [value, 'Conversions Count'];
                      return [value, name];
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    name="Commission"
                    dataKey="Commission" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorComm)" 
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    name="Conversions"
                    dataKey="Conversions" 
                    stroke="#f43f5e" 
                    strokeWidth={2.5}
                    dot={{ r: 3, stroke: '#f43f5e', strokeWidth: 1.5, fill: '#0f172a' }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              ) : chartView === 'earnings' ? (
                <AreaChart data={displayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCommOnly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis 
                    stroke="#6366f1" 
                    fontSize={10} 
                    tickLine={false} 
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      borderColor: 'rgba(99, 102, 241, 0.3)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '12px'
                    }} 
                    formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Commission Earnings']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Area 
                    type="monotone" 
                    name="Commission"
                    dataKey="Commission" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCommOnly)" 
                  />
                </AreaChart>
              ) : (
                <BarChart data={displayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis 
                    stroke="#f43f5e" 
                    fontSize={10} 
                    tickLine={false} 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      borderColor: 'rgba(244, 63, 94, 0.3)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '12px'
                    }} 
                    formatter={(value: any) => [value, 'Conversions Count']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Bar 
                    name="Conversions"
                    dataKey="Conversions" 
                    fill="#f43f5e" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  >
                    {displayChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Conversions > 0 ? '#f43f5e' : '#1e293b'} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Withdrawal form request card (1/3 width) */}
        <div className="glass-panel border border-slate-800/60 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg text-slate-100 flex items-center space-x-2">
              <Landmark className="h-5 w-5 text-emerald-400" />
              <span>Capital Extraction Hub</span>
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Retrieve approved commission dividends to your linked account instantly. Requests are settled by manual bank transfer within 24 hours.
            </p>
          </div>

          <div className="space-y-4">
            {/* Quick Balance Status */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-900 space-y-2 text-left">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Transfer Target Destination:</span>
              <p className="text-xs text-slate-300 font-semibold truncate font-mono">{userData?.payoutDetails || 'No method configured.'}</p>
              
              <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-sm">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">In-Wallet Balance:</span>
                <span className="font-bold text-emerald-400">₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setPayoutInputError('');
                setSuccessMsg('');
                setWithdrawPayoutDetails(userData?.payoutDetails || '');
                setIsWithdrawalModalOpen(true);
              }}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] active:scale-95 duration-200 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>Request Withdrawal Payout</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2 — COMMISSION TIER BADGES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-slate-100 flex items-center space-x-2">
              <Award className="h-5 w-5 text-indigo-400" />
              <span>Affiliate Commission Tiers</span>
            </h3>
            <p className="text-slate-400 text-xs font-sans">
              Accelerate your revenue rates by climbing standard academic volume milestones.
            </p>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold font-mono text-indigo-300">
            Your Active Rate: {myCommissionRate}%
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Tier 1: Starter */}
          <div className={`p-6 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-between space-y-4 ${
            myCommissionRate <= 40
              ? 'bg-slate-900 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20'
              : 'bg-slate-950/40 border-slate-900/80 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
          }`}>
            <div className={`p-4 rounded-full flex items-center justify-center ${
              myCommissionRate <= 40 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-slate-900 text-slate-500'
            }`}>
              <Zap className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-display font-black text-slate-100 block">40%</span>
              <span className="text-xs font-semibold text-slate-400 block">Starter</span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase ${
              myCommissionRate <= 40 ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25 animate-pulse' : 'bg-slate-900 text-slate-500'
            }`}>
              Min Level
            </span>
          </div>

          {/* Tier 2: Default */}
          <div className={`p-6 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-between space-y-4 ${
            myCommissionRate > 40 && myCommissionRate <= 60
              ? 'bg-slate-900 border-indigo-500/45 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/30'
              : 'bg-slate-950/40 border-slate-900/80 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
          }`}>
            <div className={`p-4 rounded-full flex items-center justify-center ${
              myCommissionRate > 40 && myCommissionRate <= 60 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-400/20' : 'bg-slate-900 text-slate-500'
            }`}>
              <Rocket className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-display font-black text-slate-100 block">50% - 60%</span>
              <span className="text-xs font-semibold text-slate-400 block">Default</span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase ${
              myCommissionRate > 40 && myCommissionRate <= 60 ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-400/25 animate-pulse' : 'bg-slate-900 text-slate-500'
            }`}>
              All Affiliates
            </span>
          </div>

          {/* Tier 3: High Performer */}
          <div className={`p-6 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-between space-y-4 ${
            myCommissionRate > 60 && myCommissionRate <= 75
              ? 'bg-slate-900 border-indigo-500/45 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/30'
              : 'bg-slate-950/40 border-slate-900/80 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
          }`}>
            <div className={`p-4 rounded-full flex items-center justify-center ${
              myCommissionRate > 60 && myCommissionRate <= 75 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-slate-900 text-slate-500'
            }`}>
              <Flame className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-display font-black text-slate-100 block">65% - 75%</span>
              <span className="text-xs font-semibold text-slate-400 block">High Performer</span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase ${
              myCommissionRate > 60 && myCommissionRate <= 75 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 animate-pulse' : 'bg-slate-900 text-slate-500'
            }`}>
              By Admin
            </span>
          </div>

          {/* Tier 4: Elite */}
          <div className={`p-6 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-between space-y-4 ${
            myCommissionRate >= 80
              ? 'bg-slate-900 border-indigo-500/45 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/30'
              : 'bg-slate-950/40 border-slate-900/80 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
          }`}>
            <div className={`p-4 rounded-full flex items-center justify-center ${
              myCommissionRate >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-slate-900 text-slate-500'
            }`}>
              <Crown className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-display font-black text-slate-100 block">80%+</span>
              <span className="text-xs font-semibold text-slate-400 block">Elite Only</span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase ${
              myCommissionRate >= 80 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 animate-pulse' : 'bg-slate-900 text-slate-500'
            }`}>
              Top Only
            </span>
          </div>
        </div>
      </div>

      {/* 3 — Dual column row: Earnings Calculator and Top Affiliates Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Earnings Estimator Calculator (2/3 width) */}
        <div className="lg:col-span-2 glass-panel border border-slate-800/60 p-6 rounded-2xl shadow-xl space-y-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 rounded-full blur-3xl font-bold"></div>
          
          <div className="space-y-1.5">
            <h3 className="font-display font-bold text-lg text-slate-100 flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-indigo-400" />
              <span>Earnings Calculator</span>
            </h3>
            <p className="text-slate-400 text-xs">
              Adjust sales metrics and commission options below to calculate estimated real-time earnings potential.
            </p>
          </div>

          <div className="space-y-5 pt-2">
            {/* Range Slider 1: Sales Per Day */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold font-mono">
                <span className="text-slate-405">Sales per day</span>
                <span className="text-indigo-400">{calcSalesPerDay}</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={calcSalesPerDay}
                onChange={(e) => setCalcSalesPerDay(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
            </div>

            {/* Range Slider 2: Average Course Price */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold font-mono">
                <span className="text-slate-405">Avg course price</span>
                <span className="text-indigo-400">₹{calcCoursePrice}</span>
              </div>
              <input
                type="range"
                min="100"
                max="15000"
                step="100"
                value={calcCoursePrice}
                onChange={(e) => setCalcCoursePrice(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
            </div>

            {/* Range Slider 3: Commission Percentage */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold font-mono">
                <span className="text-slate-405">Commission %</span>
                <span className="text-indigo-400">{calcCommissionPercent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={calcCommissionPercent}
                onChange={(e) => setCalcCommissionPercent(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Calculator Income Display Grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-900">
            {/* Daily Card */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 text-left">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block mb-1">Daily</span>
              <span className="text-slate-100 font-display font-black text-base sm:text-xl">
                ₹{Math.round(calcSalesPerDay * calcCoursePrice * (calcCommissionPercent / 100)).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Weekly Card */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 text-left">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block mb-1">Weekly</span>
              <span className="text-indigo-400 font-display font-black text-base sm:text-xl">
                ₹{Math.round(calcSalesPerDay * calcCoursePrice * (calcCommissionPercent / 100) * 7).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Monthly Card (Highlighted) */}
            <div className="bg-indigo-600/10 p-4 rounded-xl border border-indigo-500/30 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 bg-indigo-500/20 rounded-bl text-[8px] text-indigo-400 font-bold uppercase font-mono">Focus</div>
              <span className="text-[10px] text-indigo-450 uppercase tracking-widest font-mono font-black block mb-1 text-indigo-300">Monthly</span>
              <span className="text-indigo-300 font-display font-black text-base sm:text-xl">
                ₹{Math.round(calcSalesPerDay * calcCoursePrice * (calcCommissionPercent / 100) * 30).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Top 10 Elite Affiliates Leaderboard (1/3 width) */}
        <div className="glass-panel border border-slate-800/60 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden flex flex-col justify-between h-full">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <div>
              <h3 className="font-display font-medium text-base text-slate-100">Top Affiliates</h3>
              <span className="text-[10.5px] text-slate-500 font-mono">Active Ranking Base</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide uppercase bg-rose-600/10 text-rose-400 border border-rose-500/20 animate-pulse">
              Live
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 select-none scrollbar-thin">
            {(() => {
              interface LeaderboardEntry {
                name: string;
                sales: number;
                earned: number;
                isUser?: boolean;
              }

              // Standard initial leaderboard performers
              const competitorsList: LeaderboardEntry[] = [
                { name: 'Rahul K.', sales: 43, earned: 38700 },
                { name: 'Priya V.', sales: 34, earned: 30600 },
                { name: 'Amit S.', sales: 27, earned: 24300 },
                { name: 'Neha R.', sales: 22, earned: 19800 },
                { name: 'Vikram S.', sales: 18, earned: 16200 },
                { name: 'Sanjay M.', sales: 14, earned: 12600 },
                { name: 'Anjali D.', sales: 11, earned: 9900 },
                { name: 'Kunwar P.', sales: 9, earned: 8100 },
                { name: 'Ramesh B.', sales: 7, earned: 6300 },
              ];

              const userSalesCount = approvedRefOrders.length;
              const userTotalEarned = totalEarned;
              const userEntry: LeaderboardEntry = {
                name: userData?.displayName || 'You',
                sales: userSalesCount,
                earned: userTotalEarned,
                isUser: true
              };

              // Sort by earnings, slice top 10
              const combinedList = [...competitorsList, userEntry]
                .sort((a, b) => b.earned - a.earned)
                .slice(0, 10);

              return combinedList.map((aff, index) => {
                const rank = index + 1;
                const initials = aff.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                const initialsBgClass = aff.isUser 
                  ? 'bg-indigo-600/30 text-indigo-400 border-indigo-500/30 ring-1 ring-indigo-500/20' 
                  : rank === 1 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : rank === 2 
                  ? 'bg-slate-400/10 text-slate-300 border-slate-400/20'
                  : rank === 3 
                  ? 'bg-amber-800/10 text-amber-600 border-amber-805/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800';

                return (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-300 ${
                      aff.isUser 
                        ? 'bg-indigo-600/10 border-indigo-500/30 shadow-[0_2px_10px_rgba(99,102,241,0.08)]' 
                        : 'bg-slate-950/20 border-slate-900/60 hover:bg-slate-900/10 hover:border-slate-850'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {/* Rank Indicator */}
                      <span className={`w-4 text-center font-mono text-xs font-bold ${
                        rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {rank}
                      </span>

                      {/* Avatar Circle */}
                      <div className={`h-7.5 w-7.5 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 select-none ${initialsBgClass}`}>
                        {initials}
                      </div>

                      {/* Name and Sales Display */}
                      <div className="truncate text-left leading-none">
                        <span className={`block font-semibold text-xs truncate ${aff.isUser ? 'text-indigo-305' : 'text-slate-200'}`}>
                          {aff.name}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                          {aff.sales} sales
                        </span>
                      </div>
                    </div>

                    {/* Earnings Display */}
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400 font-mono tracking-tight leading-none block">
                        ₹{Math.round(aff.earned).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div className="border-t border-slate-900 pt-2 text-center">
            <span className="text-[9px] text-slate-500 font-mono font-bold block uppercase tracking-wider">
              Updated hourly • Payouts active
            </span>
          </div>
        </div>
      </div>

      {/* Referrals success list table */}
      <div className="glass-panel border border-slate-800/60 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-slate-100 flex items-center space-x-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <span>Successful Referrals ledger</span>
          </h3>
          <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-indigo-400 font-mono">
            {refOrders.length} Sales Map Detected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-xs uppercase bg-slate-950/40">
                <th className="py-3 px-6">Purchaser Email</th>
                <th className="py-3 px-6">Product Course</th>
                <th className="py-3 px-6">Invoice Total</th>
                <th className="py-3 px-6">My Commission</th>
                <th className="py-3 px-6">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {refOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-900/30 transition-all font-sans text-slate-300">
                  <td className="py-4 px-6 font-medium text-slate-200">{ord.userEmail}</td>
                  <td className="py-4 px-6">{ord.productTitle}</td>
                  <td className="py-4 px-6 font-mono font-medium">₹{Number(ord.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-4 px-6 font-mono font-bold text-emerald-400">+₹{Number(ord.affiliateCommission).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize font-mono ${
                      ord.status === 'approved' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : ord.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
              {refOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs font-semibold">
                    No referred sales tracked yet. Share your custom link to acquire partner rewards.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Cashouts History ledger */}
      <div className="glass-panel border border-slate-800/60 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-slate-100 flex items-center space-x-2">
            <Landmark className="h-5 w-5 text-indigo-400" />
            <span>My Payout Requests Ledger</span>
          </h3>
          <span className="text-xs bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-400 font-mono">
            {payouts.filter(p => p.affiliateId === userData?.uid).length} Total Requests
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-xs uppercase bg-slate-950/40">
                <th className="py-3 px-6">Request ID</th>
                <th className="py-3 px-6">Requested Amount</th>
                <th className="py-3 px-6">Payout Coordinates</th>
                <th className="py-3 px-6">Status Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {payouts.filter(p => p.affiliateId === userData?.uid).map((pay) => {
                return (
                  <tr key={pay.id} className="hover:bg-slate-900/30 transition-all font-sans text-slate-300">
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-400">{pay.id}</td>
                    <td className="py-4 px-6 font-mono font-bold text-emerald-400">₹{Number(pay.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-4 px-6 text-xs text-slate-300 max-w-[240px] truncate">{pay.payoutDetails}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col space-y-1">
                        <span className={`self-start inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize font-mono ${
                          pay.status === 'settled' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : pay.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {pay.status === 'settled' ? 'Approved' : pay.status === 'rejected' ? 'Rejected' : 'Withdrawal Pending'}
                        </span>
                        {pay.status === 'settled' && pay.utr && (
                          <span className="text-[10px] text-slate-500 font-mono font-medium">UTR No: {pay.utr}</span>
                        )}
                        {pay.status === 'rejected' && (
                          <span className="text-[10px] text-rose-400 font-sans font-medium">Refunded back to your available balance</span>
                        )}
                        {pay.status === 'pending' && (
                          <span className="text-[10px] text-slate-500 font-sans font-medium">Awaiting admin transaction audit</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {payouts.filter(p => p.affiliateId === userData?.uid).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 text-xs font-semibold">
                    No payout request submissions yet. Earn rewards and submit extraction requests above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdrawal Request Modal Overlay */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-black text-slate-100 flex items-center space-x-2">
                <Landmark className="h-5 w-5 text-emerald-400" />
                <span>Withdrawal Request</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsWithdrawalModalOpen(false);
                  setWithdrawAmount('');
                  setPayoutInputError('');
                  setSuccessMsg('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition-all font-semibold font-mono"
              >
                ✕
              </button>
            </div>

            {/* Modal Description */}
            <p className="text-slate-400 text-xs leading-relaxed">
              Submit your active available commission capital for payout. Payout requests are verified by manual ledger audit and transferred to your configured target coordinates within 24 hours.
            </p>

            {/* Error/Success Feedbacks */}
            {successMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 animate-pulse" />
                <span>{successMsg}</span>
              </div>
            )}

            {payoutInputError && (
              <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="h-4 w-4 text-rose-450 shrink-0" />
                <span>{payoutInputError}</span>
              </div>
            )}

            {/* Action Form */}
            <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 font-mono">Amount to Extract (₹) *</label>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(walletBalance.toFixed(2))}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold font-mono tracking-wider uppercase focus:outline-none cursor-pointer"
                  >
                    Set Max (₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                  </button>
                </div>
                
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Editable Destination details */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 font-mono">Recipient Payout UPI ID / Bank Details *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter UPI ID (e.g. itsarpita@fam) or bank info"
                  value={withdrawPayoutDetails}
                  onChange={(e) => setWithdrawPayoutDetails(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-semibold"
                />
                <span className="block text-[10px] text-slate-500 font-sans italic leading-normal">
                  ⚠️ Verify carefully! Supplying an invalid address will cause payouts to fail. This UPI ID will automatically save to your profile.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsWithdrawalModalOpen(false);
                    setWithdrawAmount('');
                    setPayoutInputError('');
                    setSuccessMsg('');
                  }}
                  className="flex-1 py-3 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || walletBalance <= 0}
                  className="flex-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-xs font-bold text-white transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] active:scale-95 duration-200 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Confirm Withdrawal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
