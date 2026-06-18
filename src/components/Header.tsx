import React from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, ShieldAlert, Award, LogOut, Wallet, LogIn, Menu, X } from 'lucide-react';
import { AuthModal } from './AuthModal';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab }) => {
  const { firebaseUser, userData, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [authModalOpen, setAuthModalOpen] = React.useState(false);

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/60 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => handleTabClick('store')}
          >
            <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-600/30 group-hover:border-indigo-500/50 transition-all duration-300">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-wide bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
                BondEver
              </span>
              <span className="font-mono text-xs text-indigo-400 ml-1 font-semibold tracking-widest uppercase block -mt-1 leading-none">
                Hub
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
            <button
              onClick={() => handleTabClick('store')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentTab === 'store' 
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Products
            </button>

            {userData && (
              <>
                <button
                  onClick={() => handleTabClick('student')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentTab === 'student' 
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  My Orders
                </button>

                <button
                  onClick={() => handleTabClick('affiliate')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentTab === 'affiliate' 
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  Affiliate
                </button>

                {userData.role === 'admin' && (
                  <button
                    onClick={() => handleTabClick('admin')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border duration-200 flex items-center space-x-1.5 ${
                      currentTab === 'admin' 
                        ? 'bg-rose-600/20 text-rose-400 border-rose-500/30' 
                        : 'text-rose-400/80 hover:text-rose-400 hover:bg-rose-950/20 border-transparent hover:border-rose-500/10'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* User Actions & Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {userData && userData.role === 'affiliate' && (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Wallet className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-mono font-medium">₹{userData.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {firebaseUser ? (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-200">{firebaseUser.displayName}</div>
                  <div className="text-xs text-indigo-400 font-mono flex items-center justify-end">
                    <Award className="h-3 w-3 mr-0.5" />
                    <span className="capitalize">{userData?.role || 'User'}</span>
                  </div>
                </div>
                {firebaseUser.photoURL ? (
                  <img 
                    src={firebaseUser.photoURL} 
                    alt="avatar" 
                    className="h-9 w-9 rounded-full ring-2 ring-indigo-500/40 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold ring-2 ring-indigo-500/40">
                    {firebaseUser.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/25 rounded-lg transition-colors duration-200"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-sm font-semibold tracking-wide transition-all duration-200 hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)] border border-indigo-400/20"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger icon */}
          <div className="flex md:hidden items-center space-x-2">
            {userData && userData.role === 'affiliate' && (
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-medium">
                <Wallet className="h-3.5 w-3.5" />
                <span>₹{userData.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 pt-2 pb-4 space-y-2">
          <button
            onClick={() => handleTabClick('store')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-base font-medium transition-all ${
              currentTab === 'store' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            Products
          </button>

          {userData && (
            <>
              <button
                onClick={() => handleTabClick('student')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-base font-medium transition-all ${
                  currentTab === 'student' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                My Orders
              </button>

              <button
                onClick={() => handleTabClick('affiliate')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-base font-medium transition-all ${
                  currentTab === 'affiliate' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                Affiliate
              </button>

              {userData.role === 'admin' && (
                <button
                  onClick={() => handleTabClick('admin')}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold transition-all border ${
                    currentTab === 'admin' 
                      ? 'bg-rose-600/20 text-rose-400 border-rose-500/20' 
                      : 'text-rose-400 hover:bg-rose-950/20 border-transparent'
                  }`}
                >
                  Admin Panel
                </button>
              )}
            </>
          )}

          <div className="pt-4 border-t border-slate-800">
            {firebaseUser ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 px-3">
                  {firebaseUser.photoURL ? (
                    <img src={firebaseUser.photoURL} alt="avatar" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold">
                      {firebaseUser.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{firebaseUser.displayName}</div>
                    <div className="text-xs text-indigo-400 font-mono capitalize">{userData?.role || 'User'}</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 text-sm font-medium transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthModalOpen(true);
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold tracking-wide transition-all"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      )}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </nav>
  );
};
