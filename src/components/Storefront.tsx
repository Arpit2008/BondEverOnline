import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, serverTimestamp, updateDoc, increment, getDoc } from 'firebase/firestore';
import { PlusCircle, Search, Filter, BookOpen, Clock, Award, CheckCircle, ExternalLink, HelpCircle, ArrowRight, DollarSign, Loader2, X, Copy, Check, Smartphone, QrCode } from 'lucide-react';
import { ProductDoc } from '../types';
import { PolicyModal } from './PolicyModal';

export const Storefront: React.FC = () => {
  const { products, categories, userData, login, referralId } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<ProductDoc | null>(null);
  const [purchasingCourse, setPurchasingCourse] = useState<ProductDoc | null>(null);
  const [showPolicy, setShowPolicy] = useState<boolean>(false);

  // Auto-Select product if 'prod' exists in query parameters (Product Referral Support)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get('prod');
    if (prodId && products.length > 0) {
      const match = products.find(p => p.id === prodId || p.title.toLowerCase().replace(/\s+/g, '-') === prodId.toLowerCase());
      if (match) {
        setSelectedCourse(match);
      }
    }
  }, [products]);

  // Buy form states
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [purchaseCompleted, setPurchaseCompleted] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string>('');
  const [copiedUPI, setCopiedUPI] = useState<boolean>(false);

  // Handle image conversion & automatic client-side compression (Speed Optimization)
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError('');
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Initialize canvas
          const canvas = document.createElement('canvas');
          
          // Set target maximum dimensions (1024px maximum width or height to preserve details)
          let width = img.width;
          let height = img.height;
          const maxWidth = 1024;
          const maxHeight = 1024;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress image to JPEG format with 0.65 quality (reduced file size significantly, e.g. < 100 KB)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
            setScreenshotBase64(compressedBase64);
            
            // Log for assurance
            const sizeInKb = Math.round((compressedBase64.length * 3) / 4 / 1024);
            console.log(`Automatic Client-Side Compression completed successfully: ${sizeInKb} KB`);
          } else {
            setScreenshotBase64(event.target?.result as string);
          }
        };
        img.onerror = () => {
          setImageError('Failed to parse this payment screenshot file. Please try another image.');
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        setImageError('Failed to read file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !purchasingCourse) return;
    if (!utrNumber.trim()) return;
    if (!screenshotBase64) {
      setImageError('Please upload a payment screenshot.');
      return;
    }

    setIsSubmitting(true);
    const orderId = 'ORD_' + Math.random().toString(36).substring(2, 11).toUpperCase();
    
    // Referral details lookup
    const orderRefId = userData.referredBy || referralId || null;
    let commAmt = 0;

    if (orderRefId) {
      try {
        const affDoc = await getDoc(doc(db, 'users', orderRefId));
        if (affDoc.exists()) {
          const affData = affDoc.data();
          const partnerPercent = (affData.customCommissionPercentage !== undefined && affData.customCommissionPercentage !== null)
            ? Number(affData.customCommissionPercentage)
            : 60; // Default commission for all affiliates is 60%
          commAmt = Number(((purchasingCourse.price * partnerPercent) / 100).toFixed(2));
        } else {
          commAmt = Number(((purchasingCourse.price * 60) / 100).toFixed(2)); // Default base 60%
        }
      } catch (e) {
        console.error('Error fetching affiliate custom rate, using default:', e);
        commAmt = Number(((purchasingCourse.price * 60) / 100).toFixed(2));
      }
    }

    const orderData = {
      id: orderId,
      userId: userData.uid,
      userEmail: userData.email,
      productId: purchasingCourse.id,
      productTitle: purchasingCourse.title,
      price: purchasingCourse.price,
      affiliateId: orderRefId,
      affiliateCommission: commAmt,
      utr: utrNumber.trim(),
      screenshotUrl: screenshotBase64,
      status: 'pending',
      notes: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'orders', orderId), orderData);
      
      // If payment is referred, update the affiliate's pending metrics
      if (orderRefId && commAmt > 0) {
        try {
          const affDocRef = doc(db, 'users', orderRefId);
          await updateDoc(affDocRef, {
            pendingCommission: increment(commAmt),
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.error('Failed to update affiliate pending stats: ', e);
        }
      }

      setPurchaseCompleted(true);
      setUtrNumber('');
      setScreenshotBase64('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesQuery = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Banner Grid */}
      <div className="relative text-center max-w-4xl mx-auto space-y-6 pt-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 font-mono text-xs font-semibold uppercase tracking-wider">
          <BookOpen className="h-3.5 w-3.5" />
          <span>Skills Revolution</span>
        </div>
        <h1 className="font-display font-black text-4xl sm:text-6xl tracking-tight text-white leading-[1.1]">
          Acquire 3D Skills.<br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
            Earn Residual Commisions.
          </span>
        </h1>
        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto">
          Access high-performance premium courses designed by leading developers, and unlock a lucrative affiliate referral program instantly.
        </p>
      </div>

      {/* Referral ID Toast Display */}
      {referralId && (
        <div className="max-w-2xl mx-auto glass-panel border border-emerald-500/20 bg-emerald-950/10 rounded-xl p-4 flex items-center justify-between text-emerald-400 animate-pulse">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Affiliate ID Detected!</span> You have been referred by partner <span className="font-mono underline">{referralId}</span>. You will be mapped to this partner.
            </div>
          </div>
        </div>
      )}

      {/* Control Filters Bar */}
      <div className="glass-panel border border-slate-800/60 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-2xl relative">
        {/* Category List Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            All Courses
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 border rounded-xl text-sm font-semibold transition-all ${
                selectedCategory.toLowerCase() === cat.name.toLowerCase()
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_4px_12px_rgba(99,102,241,0.3)]'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Live Search Inputs */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
          <input
            type="text"
            placeholder="Search premium courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
          />
        </div>
      </div>

      {/* Products Grid list */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((p) => (
            <div 
              key={p.id}
              className="glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col group relative card-3d border border-slate-800/60"
            >
              {/* Product Badge & Info */}
              <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-indigo-400 border border-indigo-500/20 capitalize font-mono">
                {p.category}
              </div>

              {userData && (userData.role === 'affiliate' || userData.role === 'admin') && (
                <div className="absolute top-4 right-4 z-10 bg-emerald-500/25 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-300 border border-emerald-500/30 font-mono">
                  {userData.role === 'affiliate' ? (
                    `${(userData.customCommissionPercentage !== undefined && userData.customCommissionPercentage !== null) ? userData.customCommissionPercentage : 60}% My Commission`
                  ) : (
                    '60% Aff. Commission'
                  )}
                </div>
              )}

              {/* Course Thumbnail */}
              <div className="relative h-48 overflow-hidden bg-slate-900 border-b border-slate-800/50">
                <img 
                  src={p.thumbnailUrl || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop`} 
                  alt={p.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent"></div>
              </div>

              {/* Product Body details */}
              <div className="p-6 flex-1 flex flex-col space-y-4">
                <h3 className="font-display font-bold text-xl text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {p.title}
                </h3>
                <p className="text-slate-400 text-sm line-clamp-3 font-normal leading-relaxed">
                  {p.description}
                </p>

                {/* Tags and metrics */}
                <div className="pt-2 flex items-center space-x-4 text-xs font-semibold text-slate-500 font-mono">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>Self-Paced</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Award className="h-3.5 w-3.5 text-slate-500" />
                    <span>Certificate</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/40 flex items-center justify-between mt-auto">
                  <div>
                    <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider font-mono">Price</span>
                    <span className="text-2xl font-display font-black text-indigo-400">₹{Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedCourse(p)}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setPurchasingCourse(p)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-bold text-white transition-all shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-950/30 rounded-2xl border border-slate-800/60 p-8">
          <HelpCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="font-display font-bold text-xl text-slate-300">No Premium Courses Found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mt-2">
            We couldn't find any courses matching your selection or filter. Try choosing another category or clearing your search input.
          </p>
        </div>
      )}

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setSelectedCourse(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-950/40 hover:bg-slate-800/85 rounded-full transition-all z-20 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Scrollable contents area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Banner of modal */}
              <div className="relative h-56 bg-slate-950 shrink-0">
                <img 
                  src={selectedCourse.thumbnailUrl || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop`} 
                  alt={selectedCourse.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="px-3 py-1 rounded-full bg-indigo-600 text-xs font-bold text-white capitalize shadow-lg">
                    {selectedCourse.category}
                  </span>
                  <h2 className="font-display font-black text-2xl sm:text-3xl text-white mt-3">
                    {selectedCourse.title}
                  </h2>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-widest font-bold text-slate-500 font-mono">About this Course</h4>
                  <p className="text-slate-300 leading-relaxed text-sm animate-fade-in">
                    {selectedCourse.description}
                  </p>
                </div>

                {/* Commission and price stats */}
                <div className={`grid ${userData && (userData.role === 'affiliate' || userData.role === 'admin') ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  <div className="p-4 rounded-xl bg-indigo-950/15 border border-indigo-500/10 flex items-center space-x-3">
                    <div className="p-2 justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block uppercase font-semibold font-mono">Selling Price</span>
                      <span className="text-lg font-bold text-indigo-300">₹{Number(selectedCourse.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {userData && (userData.role === 'affiliate' || userData.role === 'admin') && (
                    <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-500/10 flex items-center space-x-3">
                      <div className="p-2 justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block uppercase font-semibold font-mono">Partner Commission</span>
                        <span className="text-lg font-bold text-emerald-300">
                          {userData.role === 'affiliate' ? (
                            `${(userData.customCommissionPercentage !== undefined && userData.customCommissionPercentage !== null) ? userData.customCommissionPercentage : 60}%`
                          ) : (
                            '60%'
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons pinned at footer */}
            <div className="flex items-center justify-end space-x-2 p-5 border-t border-slate-800 bg-slate-950/20 shrink-0">
              <button
                onClick={() => setSelectedCourse(null)}
                className="px-5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPurchasingCourse(selectedCourse);
                  setSelectedCourse(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-sm font-bold text-white transition-all shadow-lg flex items-center space-x-2 cursor-pointer"
              >
                <span>Purchase Course</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Purchase / Order Submission Modal (One-Page High-Converting Checkout) */}
      {purchasingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 text-slate-200">
            {/* Header of modal */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20 shrink-0">
              <div>
                <h3 className="font-display font-medium text-lg text-slate-100 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  High-Converting Instant Checkout
                </h3>
                <span className="text-[10px] text-slate-500 font-mono block">SECURE DIRECT OPERATIONAL INGRESS</span>
              </div>
              <button
                onClick={() => {
                  setPurchasingCourse(null);
                  setPurchaseCompleted(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {purchaseCompleted ? (
              <div className="p-8 text-center space-y-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-center items-center">
                <div className="mx-auto h-16 w-16 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-display font-bold text-2xl text-emerald-400">Order Filed Successfully!</h4>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                    Your payment verification proof has been transmitted to our reconciliation administrators. We will instantly activate your course credentials once the UTR is verified.
                  </p>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl w-full max-w-sm mx-auto text-left space-y-2 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold font-mono flex justify-between">
                    <span>Enrolled Course:</span>
                    <span className="text-slate-200 truncate max-w-[200px]">{purchasingCourse.title}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-semibold font-mono flex justify-between">
                    <span>Amount Transferred:</span>
                    <span className="text-indigo-400 font-bold">₹{Number(purchasingCourse.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPurchasingCourse(null);
                    setPurchaseCompleted(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white transition-all w-full max-w-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : !userData ? (
              <div className="p-8 text-center space-y-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-center items-center">
                <HelpCircle className="h-12 w-12 text-indigo-400 mx-auto animate-pulse" />
                <div className="space-y-2">
                  <h4 className="font-display font-medium text-lg">Authentication Required</h4>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto">
                    To register, monitor referrals, and receive downloaded certificates, you must first sign in with a student profile.
                  </p>
                </div>
                <button
                  onClick={login}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold w-full max-w-sm transition-all cursor-pointer"
                >
                  Sign In / Register Now
                </button>
              </div>
            ) : (
              <form onSubmit={submitOrder} className="flex-1 flex flex-col overflow-hidden">
                {/* Scrollable inputs container */}
                <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: QR Code & UPI Transfer Info */}
                    <div className="space-y-4 flex flex-col">
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Amount Due</p>
                            <p className="text-xl font-black text-indigo-400 font-sans">₹{Number(purchasingCourse.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Course Identifier</p>
                            <p className="text-xs font-mono text-slate-300 truncate max-w-[150px] font-bold">{purchasingCourse.title}</p>
                          </div>
                        </div>

                        {/* Pay Now Direct Mobile Button and dynamic live QR */}
                        {(() => {
                          const upiDeepLink = `upi://pay?pa=itsarpita@fam&pn=BondEver&am=${Number(purchasingCourse.price)}&cu=INR&tn=${encodeURIComponent(purchasingCourse.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 15))}`;
                          const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiDeepLink)}`;
                          const isAndroid = /Android/i.test(navigator.userAgent);

                          const getAppUpiLink = (app: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'generic') => {
                            const cleanTitle = encodeURIComponent(purchasingCourse.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 15));
                            const baseParams = `pa=itsarpita@fam&pn=BondEver&am=${Number(purchasingCourse.price)}&cu=INR&tn=${cleanTitle}`;
                            
                            if (app === 'phonepe') {
                              return isAndroid 
                                ? `intent://pay?${baseParams}#Intent;scheme=upi;package=com.phonepe.app;end`
                                : `phonepe://pay?${baseParams}`;
                            }
                            if (app === 'gpay') {
                              return isAndroid
                                ? `intent://pay?${baseParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`
                                : `gpay://upi/pay?${baseParams}`;
                            }
                            if (app === 'paytm') {
                              return isAndroid
                                ? `intent://pay?${baseParams}#Intent;scheme=upi;package=net.one97.paytm;end`
                                : `paytmmp://pay?${baseParams}`;
                            }
                            if (app === 'bhim') {
                              return isAndroid
                                ? `intent://pay?${baseParams}#Intent;scheme=upi;package=in.org.npci.upiapp;end`
                                : `bhim://pay?${baseParams}`;
                            }
                            return `upi://pay?${baseParams}`;
                          };

                          return (
                            <>
                              <div className="space-y-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
                                <div className="flex flex-col space-y-1">
                                  <span className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                                    <Smartphone className="h-3.5 w-3.5 text-indigo-400" />
                                    Choose UPI App to Pay / ऐप चुनें:
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-sans leading-tight">
                                    Select any app installed on your phone to open instantly. If only 1 app exists, standard button opens it.
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  {/* PhonePe */}
                                  <a
                                    href={getAppUpiLink('phonepe')}
                                    className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-900/40 hover:border-indigo-500/30 transition-all text-left group cursor-pointer"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400 font-mono group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                      PP
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-300">PhonePe</span>
                                      <span className="text-[8px] text-slate-500 font-mono">Instant Pay</span>
                                    </div>
                                  </a>

                                  {/* Google Pay */}
                                  <a
                                    href={getAppUpiLink('gpay')}
                                    className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-blue-950/20 hover:bg-blue-950/40 border border-blue-900/30 hover:border-blue-500/30 transition-all text-left group cursor-pointer"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center text-[10px] font-bold text-blue-400 font-mono group-hover:bg-blue-500 group-hover:text-white transition-all">
                                      GP
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-300">Google Pay</span>
                                      <span className="text-[8px] text-slate-500 font-mono font-sans leading-none mt-0.5">Tez Pay</span>
                                    </div>
                                  </a>

                                  {/* Paytm */}
                                  <a
                                    href={getAppUpiLink('paytm')}
                                    className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-sky-950/25 hover:bg-sky-950/40 border border-sky-900/30 hover:border-sky-500/30 transition-all text-left group cursor-pointer"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-sky-500/10 flex items-center justify-center text-[10px] font-bold text-sky-400 font-mono group-hover:bg-sky-500 group-hover:text-white transition-all">
                                      PY
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-300">Paytm</span>
                                      <span className="text-[8px] text-slate-500 font-mono font-sans leading-none mt-0.5">Fast Pay</span>
                                    </div>
                                  </a>

                                  {/* BHIM UPI */}
                                  <a
                                    href={getAppUpiLink('bhim')}
                                    className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 hover:border-amber-500/30 transition-all text-left group cursor-pointer"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-amber-500/10 flex items-center justify-center text-[10px] font-bold text-amber-400 font-mono group-hover:bg-amber-500 group-hover:text-white transition-all">
                                      BH
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-300">BHIM UPI</span>
                                      <span className="text-[8px] text-slate-500 font-mono font-sans leading-none mt-0.5">Govt Web</span>
                                    </div>
                                  </a>
                                </div>

                                <div className="p-0.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-indigo-500/20 mt-1">
                                  <a
                                    href={upiDeepLink}
                                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.45)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] hover:scale-[1.01] transition-all cursor-pointer"
                                  >
                                    <Smartphone className="h-4 w-4 shrink-0 text-emerald-300 animate-bounce" />
                                    <span>🚀 Auto-Select Any / Other UPI App</span>
                                  </a>
                                </div>
                              </div>

                              {/* Scan to Pay QR Block */}
                              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-3 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                                <div className="flex items-center space-x-1">
                                  <QrCode className="h-3.5 w-3.5 text-indigo-400" />
                                  <p className="text-xs font-semibold text-slate-400 font-mono tracking-wide uppercase">Scan and Pay Dynamic QR</p>
                                </div>
                                
                                {/* Live Dynamic QR Code from Server API */}
                                <div className="relative p-3 bg-white rounded-xl shadow-xl border-4 border-slate-800/20 max-w-[170px] aspect-square flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={qrCodeImageUrl} 
                                    alt="UPI Dynamic QR payment reader" 
                                    className="h-36 w-36 object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>

                                <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 leading-tight">
                                  Scanning automatically carries the payee <span className="text-indigo-400 font-bold">itsarpita@fam</span> and the exact rate <span className="text-emerald-400 font-bold">₹{Number(purchasingCourse.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> instantly onto any scanner device.
                                </p>
                              </div>

                              {/* Official Payment Recipient Details */}
                              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 leading-relaxed font-mono space-y-2.5 text-slate-400 relative">
                                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                                  <div className="text-[10px] uppercase text-slate-500 font-bold">Official UPI Address</div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText('itsarpita@fam');
                                      setCopiedUPI(true);
                                      setTimeout(() => setCopiedUPI(false), 2000);
                                    }}
                                    className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    {copiedUPI ? (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-400" />
                                        <span className="text-emerald-400">COPIED!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        <span>COPY ID</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                
                                <div className="flex items-start justify-between text-[11px]">
                                  <span className="text-slate-500 font-bold">UPI ID:</span>
                                  <strong className="text-indigo-400 select-all">itsarpita@fam</strong>
                                </div>
                                <div className="flex items-start justify-between text-[11px]">
                                  <span className="text-slate-500 font-bold">MERCHANT:</span>
                                  <strong className="text-slate-200 uppercase">BondEver Digital</strong>
                                </div>
                                <div className="text-[9px] text-slate-500 font-sans italic border-t border-slate-900/50 pt-2 text-center">
                                  🛡️ End-to-end encrypted merchant ledger gates
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Right Column: Transaction input verification */}
                    <div className="space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block">Complete Verification</span>
                          <p className="text-[11px] text-slate-500 font-mono">Input your transaction UTR and upload the payment proof receipt screenshot.</p>
                        </div>

                        {/* UTR Input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-300 font-mono block">UTR / Transaction ID *</label>
                          <input
                            type="text"
                            required
                            placeholder="Enter 12-digit transaction number"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                          />
                        </div>

                        {/* Screenshot Payment receipt with auto-compress indicator */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-300 font-mono block">Receipt Payment Screenshot *</label>
                          <input
                            type="file"
                            accept="image/*"
                            required
                            onChange={handleScreenshotChange}
                            className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-650/10 file:text-indigo-400 file:font-semibold file:cursor-pointer hover:file:bg-indigo-600/20 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                          />
                          {imageError && (
                            <p className="text-xs text-rose-400 font-medium font-sans">{imageError}</p>
                          )}
                          {screenshotBase64 && (
                            <div className="space-y-1.5 mt-2">
                              <div className="relative h-20 w-fit border border-indigo-500/25 rounded-lg overflow-hidden aspect-[4/3] bg-slate-950 shadow-inner">
                                <img src={screenshotBase64} alt="screenshot preview" className="h-full w-full object-contain" />
                                <div className="absolute bottom-1 right-1 bg-emerald-500/90 text-white font-mono text-[8px] px-1 py-0.5 rounded font-black tracking-wider text-nowrap">
                                  SPEED OPTIMIZED
                                </div>
                              </div>
                              <span className="text-[9px] font-mono text-emerald-400 font-semibold block">✓ Auto-compressed to fit standard database payloads seamlessly</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Action footer - Pinned cleanly outside the scroll region */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
                  <p className="text-[10px] text-slate-500 font-sans italic max-w-sm text-center sm:text-left leading-tight">
                    By making payment, you agree to our{' '}
                    <button
                      type="button"
                      onClick={() => setShowPolicy(true)}
                      className="text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      Refund & Delivery Policy
                    </button>{' '}
                    (all virtual token sales are final).
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setPurchasingCourse(null)}
                      className="px-4 py-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all font-mono cursor-pointer"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs font-sans text-white transition-all flex items-center space-x-1.5 disabled:opacity-50 select-none uppercase tracking-wider shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-95 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>PROCESSING...</span>
                        </>
                      ) : (
                        <span>CONFIRM PAYMENT</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      
      {/* Local Policy Modal */}
      <PolicyModal isOpen={showPolicy} onClose={() => setShowPolicy(false)} />
    </div>
  );
};
