import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Storefront } from './components/Storefront';
import { StudentDashboard } from './components/StudentDashboard';
import { AffiliateDashboard } from './components/AffiliateDashboard';
import { AdminPanel } from './components/AdminPanel';
import { PolicyModal } from './components/PolicyModal';
import { ShieldCheck, ShieldAlert, Sparkles, ShieldCheck as Lock, Mail, Users, ArrowUpRight } from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('store');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false);
  const { userData, authLoading, login, announcement } = useApp();

  // 1. Core Auth Guard lockout trigger: if true, immediately isolate view
  if (userData?.isBlocked) {
    return (
      <div 
        id="blocked-view"
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-rose-500/30 selection:text-white"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 bg-rose-600/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-md w-full glass-panel border-rose-500/20 bg-rose-950/10 p-8 rounded-2xl text-center space-y-6 relative shadow-[0_0_50px_rgba(244,63,94,0.1)]">
          <div className="mx-auto h-16 w-16 bg-rose-500/15 rounded-full border border-rose-500/30 text-rose-400 flex items-center justify-center animate-bounce">
            <ShieldAlert className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-display font-black text-2xl tracking-tight text-white uppercase">
              Access Terminated
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your student and partner credentials have been <span className="text-rose-400 font-bold">Blocked</span> by the BondEver Compliance security administrators.
            </p>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl text-left border border-slate-800 text-xs text-slate-500 space-y-2 font-mono">
            <div><span className="text-rose-400 font-bold">REASON FOR LOCKOUT:</span> Multi-account abuse, UTR forgery, or violation of partner guidelines.</div>
            <div><span className="text-rose-400 font-bold">ESCROW STATS:</span> All affiliate pending wallet balances have been frozen.</div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex flex-col space-y-2">
            <a 
              href="mailto:compliance@bondever.com" 
              className="flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all"
            >
              <Mail className="h-4 w-4" />
              <span>Contact compliance</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading state wrapper
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <span className="font-mono text-xs text-indigo-400 tracking-widest uppercase">BondEver Security Load...</span>
        </div>
      </div>
    );
  }

  // Render main tab layouts
  const renderTabContent = () => {
    switch (currentTab) {
      case 'store':
        return <Storefront />;
      case 'student':
        return userData ? <StudentDashboard /> : <Storefront />;
      case 'affiliate':
        return userData ? <AffiliateDashboard /> : <Storefront />;
      case 'admin':
        return (userData && userData.role === 'admin') 
          ? <AdminPanel /> 
          : <Storefront />;
      default:
        return <Storefront />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col relative overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* Header element */}
      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Global Notice / Announcement System (One-Click Notification) */}
      {announcement && (
        <div id="global-announcement-banner" className="bg-indigo-950/40 border-b border-indigo-500/25 px-4 py-2.5 backdrop-blur-md relative z-30 overflow-hidden text-center">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-indigo-200">
              ⚡ <span className="uppercase text-[10px] font-mono font-black border border-indigo-400/30 rounded px-1.5 py-0.5 bg-indigo-950/50 mr-1.5 text-indigo-300">ANNOUNCEMENT</span>
              {announcement}
            </span>
          </div>
        </div>
      )}

      {/* Main workspace platform */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {renderTabContent()}
      </main>

      {/* Static Secure Monitor indicator from Design template */}
      <div className="fixed bottom-4 left-4 z-40">
        <div className="px-3 py-1 bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2 shadow-2xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono text-slate-300 tracking-wider">SYSTEM SECURE</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-900/80 bg-slate-950/70 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            &copy; 2026 BondEver. High-Performance Digital Operations.
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <button 
              onClick={() => setIsPolicyModalOpen(true)} 
              className="hover:text-amber-400 text-slate-400 font-bold tracking-tight transition-colors cursor-pointer uppercase text-[10px]"
            >
              Refund & Delivery Policy
            </button>
            <span className="text-slate-800 hidden sm:inline">|</span>
            <a href="#compliance" className="hover:text-indigo-400 transition-colors">Compliance</a>
            <span className="text-slate-800">|</span>
            <a href="#terms" className="hover:text-indigo-400 transition-colors">Operational Terms</a>
          </div>
        </div>
      </footer>

      {/* Policy Modal Overlay */}
      <PolicyModal isOpen={isPolicyModalOpen} onClose={() => setIsPolicyModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
