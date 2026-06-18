import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ExternalLink, CheckCircle, Clock, AlertTriangle, BookOpen, Download, Compass, Sparkles, Send, Loader2 } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { orders, products, userData, applyForAffiliate } = useApp();
  const [payoutDetails, setPayoutDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [justApplied, setJustApplied] = useState<boolean>(false);

  const handleApplyAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !payoutDetails.trim()) return;
    setIsSubmitting(true);
    try {
      await applyForAffiliate(payoutDetails.trim());
      setJustApplied(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get only orders belonging to student
  const myOrders = orders.filter(o => o.userId === userData?.uid);

  // Group orders: 
  // Approved courses get direct download link
  const approvedOrders = myOrders.filter(o => o.status === 'approved');
  const pendingOrders = myOrders.filter(o => o.status === 'pending');
  const rejectedOrders = myOrders.filter(o => o.status === 'rejected');

  return (
    <div className="space-y-12 pb-16">
      {/* Greeting Banner */}
      <div className="glass-panel border border-slate-800/60 p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Welcome Back, Student</span>
          </div>
          <h2 className="font-display font-black text-3xl text-white">
            {userData?.displayName || 'Active student'}
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Track your custom visual learning paths, explore digital download codes, or unlock partner affiliate earnings inside the system portal.
          </p>
        </div>

        {/* Affiliate Application Quick-Action Callout */}
        {userData && userData.role === 'user' && (
          <div className="flex-shrink-0">
            {userData.affiliateStatus === 'none' && !justApplied ? (
              <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl space-y-4 max-w-sm">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">Join Affiliate Program!</h4>
                  <p className="text-xs text-slate-400">Refer users with your personalized link and earn up to 45% commission per approved sale.</p>
                </div>
                <form onSubmit={handleApplyAffiliate} className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Payment Payout Details (UPI, Bank, PayPal) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Bank details, UPI, bank routing"
                      value={payoutDetails}
                      onChange={(e) => setPayoutDetails(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Partner Application</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : userData.affiliateStatus === 'pending' || justApplied ? (
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-400 space-y-2 max-w-sm">
                <h4 className="text-sm font-bold">Affiliate Registration Pending</h4>
                <p className="text-xs text-slate-400">Your request is being verified by Admin. Once approved, the Affiliate Hub tab at the top will unlock instantly.</p>
              </div>
            ) : userData.affiliateStatus === 'rejected' ? (
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-400 space-y-2 max-w-sm">
                <h4 className="text-sm font-bold">Registration Rejected</h4>
                <p className="text-xs text-slate-400">Your request was declined. Update payout coordinates and submit form again:</p>
                <form onSubmit={handleApplyAffiliate} className="space-y-2 pt-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter valid payout coordinates"
                    value={payoutDetails}
                    onChange={(e) => setPayoutDetails(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white rounded-lg transition-all"
                  >
                    Re-apply
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Main content columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Approved Courses (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <h3 className="font-display font-bold text-xl text-slate-100">My Premium Courses ({approvedOrders.length})</h3>
          </div>

          {approvedOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {approvedOrders.map((order) => {
                const originCourse = products.find(p => p.id === order.productId);
                return (
                  <div 
                    key={order.id} 
                    className="glass-panel rounded-2xl overflow-hidden border border-slate-800/60 p-5 flex flex-col justify-between space-y-4"
                  >
                    {/* Top line */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                          Purchased & Active
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{order.id}</span>
                      </div>
                      <h4 className="font-display font-medium text-lg text-slate-100 line-clamp-1">{order.productTitle}</h4>
                      <p className="text-slate-400 text-xs line-clamp-2">
                        {originCourse?.description || 'This course content details are managed in the store collection.'}
                      </p>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-slate-800/40 flex items-center justify-between">
                      <span className="text-sm font-semibold font-mono text-indigo-400">₹{Number(order.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      {originCourse?.downloadLink ? (
                        <a 
                          href={originCourse.downloadLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Resources</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">No link found</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-950/20 rounded-2xl border border-slate-800/60 p-6">
              <Compass className="h-10 w-10 text-slate-500 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-300">No Enrolled Courses Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Discover courses on our store and enter verification payment UTR details to get instant access.
              </p>
            </div>
          )}
        </div>

        {/* Pending & Rejected Verification Orders (1/3 width) */}
        <div className="space-y-6">
          <h3 className="font-display font-bold text-xl text-slate-100 flex items-center space-x-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            <span>Enrollments Status</span>
          </h3>

          <div className="space-y-4">
            {/* Pending Orders list */}
            {pendingOrders.map((order) => (
              <div 
                key={order.id} 
                className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.02]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center space-x-1 text-amber-400 text-xs font-mono font-bold uppercase">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Pending Proof</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{order.id}</span>
                </div>
                <h4 className="font-display font-medium text-sm text-slate-200 line-clamp-1">{order.productTitle}</h4>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500 font-mono">
                  <span>UTR: {order.utr}</span>
                  <span className="text-indigo-400">₹{Number(order.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}

            {/* Rejected Orders list */}
            {rejectedOrders.map((order) => (
              <div 
                key={order.id} 
                className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.02]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center space-x-1 text-rose-400 text-xs font-mono font-bold uppercase">
                    <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                    <span>Rejected</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{order.id}</span>
                </div>
                <h4 className="font-display font-medium text-sm text-slate-200 line-clamp-1">{order.productTitle}</h4>
                <div className="mt-2 text-xs text-rose-400/90 font-medium bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 leading-relaxed">
                  <span className="font-bold block text-[10px] uppercase font-mono tracking-wider">Reason:</span>
                  {order.notes || 'No notes specified.'}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-500 font-semibold">
                  <span>UTR: {order.utr}</span>
                  <span className="text-rose-400/80">₹{Number(order.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}

            {pendingOrders.length === 0 && rejectedOrders.length === 0 && (
              <div className="text-center py-10 bg-slate-950/20 rounded-xl border border-slate-800/40 p-4">
                <CheckCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-400">All Reconciled</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  You have no pending approvals or rejected payments. Excellent job!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Purchase History Section */}
      <div className="glass-panel border border-slate-800/60 rounded-2xl shadow-xl overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-slate-100 flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <span>Purchase History & Receipts Ledger</span>
            </h3>
            <p className="text-slate-400 text-xs">
              Review all historical course invoices, validation date tags, and ledger verification statuses in INR.
            </p>
          </div>
          <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-indigo-400 font-mono font-bold">
            {myOrders.length} Records Found
          </span>
        </div>

        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-xs uppercase bg-slate-950/40">
                <th className="py-3.5 px-6">Order ID</th>
                <th className="py-3.5 px-6">Course Name</th>
                <th className="py-3.5 px-6">Transaction Date</th>
                <th className="py-3.5 px-6">Payment UTR</th>
                <th className="py-3.5 px-6">Amount (INR)</th>
                <th className="py-3.5 px-6">Log Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {myOrders.map((ord) => {
                const date = ord.createdAt?.seconds 
                  ? new Date(ord.createdAt.seconds * 1000) 
                  : (ord.createdAt ? new Date(ord.createdAt) : new Date());
                const formattedDate = date.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
                return (
                  <tr key={ord.id} className="hover:bg-slate-900/10 transition-all text-slate-300">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-400 text-xs">{ord.id}</td>
                    <td className="py-4 px-6 font-medium text-slate-205">{ord.productTitle}</td>
                    <td className="py-4 px-6 text-slate-400 font-mono text-xs">{formattedDate}</td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-400">{ord.utr}</td>
                    <td className="py-4 px-6 font-mono font-bold text-indigo-400">
                      ₹{Number(ord.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
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
                );
              })}
              {myOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs font-semibold">
                    No purchases logged in your account database. Visit the course store to subscribe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
