import React from 'react';
import { X, ShieldCheck, Clock, FileText, Ban, HelpCircle, Mail, Sparkles } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative backdrop elements */}
        <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 h-40 w-40 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-tr-full pointer-events-none"></div>

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 tracking-tight font-sans">Refund & Delivery Policy</h3>
              <p className="text-xs text-slate-400 font-mono">Last Updated: June 2026</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-800 text-slate-300 relative z-10 text-sm leading-relaxed">
          <p className="text-xs sm:text-sm text-slate-400 font-sans italic bg-slate-950/20 p-3.5 rounded-xl border border-slate-800/60">
            Thank you for shopping with us. Please read our policy regarding manual payment verification and refunds carefully before making a purchase.
          </p>

          {/* Section 1 */}
          <div className="space-y-2.5">
            <h4 className="flex items-center space-x-2 text-slate-200 font-bold tracking-tight">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold">1</span>
              <span>Manual Payment Verification Process</span>
            </h4>
            <div className="pl-7 space-y-2 text-xs sm:text-sm text-slate-400">
              <p>To keep our website secure and operational, all payments are verified manually by our security team.</p>
              <p>Once you make a payment and submit your transaction details (UTR/Receipt Screenshot), our team will audit the transaction ledger.</p>
              <p className="flex items-center space-x-2 p-2 bg-indigo-950/10 border border-indigo-900/30 rounded-lg text-xs font-mono text-indigo-300">
                <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>Verification SLA: approved and sent to your email within <strong className="text-indigo-200">2-24 hours</strong>.</span>
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-2.5">
            <h4 className="flex items-center space-x-2 text-rose-400 font-bold tracking-tight">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-bold">2</span>
              <span>No Return & No Refund Policy</span>
            </h4>
            <div className="pl-7 text-xs sm:text-sm text-slate-400">
              <p>
                Due to the <strong className="text-rose-400 font-semibold">digital nature of our products</strong> (which are downloadable or instantly accessible upon manual approval), we do not offer any returns, exchanges, or refunds once a purchase is made. 
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-rose-950/20 border border-rose-900/40 text-[10px] font-mono font-semibold text-rose-400 uppercase tracking-wide">
                <Ban className="h-3 w-3" />
                <span>ALL SALES ARE STRICTLY FINAL</span>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-2.5">
            <h4 className="flex items-center space-x-2 text-slate-200 font-bold tracking-tight">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold">3</span>
              <span>Why We Hold a Strict No-Refund Policy</span>
            </h4>
            <div className="pl-7 text-xs sm:text-sm text-slate-400">
              <p>
                We have heavily invested our professional resources, developer hours, and capital in maintaining these premium digital products. Our ultimate goal is to provide these high-value masterclasses or digital tools to our customers at the most affordable and cheapest prices possible. To sustain these low costs for everyone, we cannot process refunds or cancellations.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-2.5">
            <h4 className="flex items-center space-x-2 text-slate-200 font-bold tracking-tight">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold">4</span>
              <span>Support & Delivery Integrity</span>
            </h4>
            <div className="pl-7 space-y-2 text-xs sm:text-sm text-slate-400">
              <p>If you have finished your payment and it has been more than 24 hours, or if you encounter issues like:</p>
              <ul className="list-disc list-inside pl-1 space-y-1 text-slate-400">
                <li>Amount debited but order status is stuck as <span className="text-amber-400/90 font-semibold">pending</span>.</li>
                <li>Broken download link or corrupted file structure.</li>
              </ul>
              <p className="bg-emerald-950/10 border border-emerald-900/30 rounded-xl p-3 text-xs text-emerald-400 leading-normal font-sans">
                <strong>💡 Quick Resolution:</strong> Please do not worry! We are 100% committed to assisting you. Simply email us your payment transaction ID, registered email address, and screenshot proof of payment. We will audit and manually clear your access instantly!
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <h4 className="flex items-center space-x-2 text-slate-200 font-bold tracking-tight">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">5</span>
              <span>Contact Verified Support Desk</span>
            </h4>
            <div className="pl-7 space-y-3">
              <p className="text-xs sm:text-sm text-slate-400">For any payment verification issues or delivery escalation coordinates, contact our team:</p>
              <a 
                href="mailto:arpitmaurya55555@gmail.com" 
                className="inline-flex items-center space-x-2.5 px-4 py-2.5 bg-slate-950 hover:bg-slate-950/70 border border-slate-800 rounded-xl text-indigo-400 text-xs sm:text-sm font-mono font-bold hover:border-indigo-500/30 transition-all cursor-pointer shadow-inner"
              >
                <Mail className="h-4 w-4 text-indigo-400" />
                <span>arpitmaurya55555@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-right pr-6 shrink-0 z-10 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs text-slate-500 font-mono">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Secure Operations Framework</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4.5 py-1.8 hover:bg-slate-800 border border-transparent rounded-lg text-xs font-bold font-mono text-slate-400 hover:text-white transition-all cursor-pointer uppercase tracking-tight"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
