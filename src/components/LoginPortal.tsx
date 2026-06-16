import React, { useState, useEffect } from 'react';
import { Landmark, ShieldCheck, Mail, Lock, Sparkles, Building, AlertCircle, Smartphone, RefreshCw, ArrowLeft, Key } from 'lucide-react';
import { STAFF_MEMBERS, UserRole } from '../types';

interface LoginPortalProps {
  onLoginSuccess: (staffIdx: number) => void;
  staffList?: { name: string; role: UserRole; department: string }[];
}

export default function LoginPortal({ onLoginSuccess, staffList = STAFF_MEMBERS }: LoginPortalProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 2FA / Authenticator Verification Security States
  const [requireMfa, setRequireMfa] = useState(false);
  const [pendingLoginIdx, setPendingLoginIdx] = useState<number | null>(null);
  const [mfaCode, setMfaCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [mfaInput, setMfaInput] = useState('');
  const [mfaTimeLeft, setMfaTimeLeft] = useState(15);
  const [mfaError, setMfaError] = useState('');

  // Real-time live OTP code rotater
  useEffect(() => {
    if (pendingLoginIdx === null) return;

    const interval = setInterval(() => {
      setMfaTimeLeft((prev) => {
        if (prev <= 1) {
          // Generate a fresh random 6-digit passcode when current expires
          setMfaCode(Math.floor(100000 + Math.random() * 900000).toString());
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingLoginIdx]);

  // Handle standard click login for selected personnel
  const handleSelectLogin = (idx: number) => {
    if (requireMfa) {
      setPendingLoginIdx(idx);
      setMfaError('');
      setMfaInput('');
      setMfaTimeLeft(15);
      // Generate initial code
      setMfaCode(Math.floor(100000 + Math.random() * 900000).toString());
    } else {
      onLoginSuccess(idx);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and passcode credentials.');
      return;
    }
    setError('');
    // Look up member by name/role simulated email prefix
    const cleanEmail = email.toLowerCase().trim();
    // find index in staffList
    const idx = staffList.findIndex(s => {
      const formattedName = s.name.toLowerCase().replace(/\s+/g, '.');
      return cleanEmail.includes(formattedName);
    });

    const finalIdx = idx !== -1 ? idx : 0;

    if (requireMfa) {
      setPendingLoginIdx(finalIdx);
      setMfaError('');
      setMfaInput('');
      setMfaTimeLeft(15);
      setMfaCode(Math.floor(100000 + Math.random() * 900000).toString());
    } else {
      onLoginSuccess(finalIdx);
    }
  };

  return (
    <div 
      id="login-portal-screen" 
      className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-blue-500 selection:text-white font-sans relative overflow-hidden"
    >
      
      {/* Visual Accent Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative z-10">
        
        {/* Left column (Visual Branding & Intro) */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-900/40 via-slate-950 to-slate-950 p-8 flex flex-col justify-between border-r border-slate-800">
          <div className="space-y-4">
            <div className="h-10 flex items-center justify-start shrink-0 overflow-hidden">
              <img 
                src="https://imgur.com/Om0LsC2.png" 
                alt="Company Logo" 
                className="h-full object-contain cursor-pointer"
                referrerPolicy="no-referrer" 
              />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">INTERNAL MEMO PORTAL</h1>
            </div>
          </div>

          <div className="space-y-6 pt-12 md:pt-0">
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Multi-Role Secures
              </span>
              <p className="text-slate-200 leading-relaxed font-normal">
                Verifies and enforces dynamic authorization boundaries. Memos flow in sequence: Initiator → Admin → Audit Control → Board Sign-off → Treasury Settlement.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>Secure Session AES-256</span>
              <span>•</span>
              <span>Local Host 3000 Active</span>
            </div>
          </div>
        </div>

        {/* Right column (Single Sign-In Portal Form) */}
        <div className="md:col-span-7 p-8 bg-slate-950 flex flex-col justify-between">
          {pendingLoginIdx === null ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Enterprise Sign-In</h2>
                  <p className="text-xs text-slate-400 mt-1">Access the secure Vetiva Memo portal via centralized dynamic authorization.</p>
                </div>
                
                {/* Custom Toggle Switch for 2FA Authenticator */}
                <button
                  id="toggle-mfa-security-switch"
                  type="button"
                  onClick={() => setRequireMfa(!requireMfa)}
                  className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-2 rounded-xl transition-all text-left shrink-0 cursor-pointer self-start sm:self-center"
                >
                  <Smartphone className={`w-4 h-4 ${requireMfa ? 'text-blue-400' : 'text-slate-500'}`} />
                  <div>
                    <span className="text-[10px] font-bold text-white block">Authenticator Security</span>
                    <span className={`text-[8px] font-mono font-bold uppercase ${requireMfa ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {requireMfa ? '● MANDATORY 2FA' : '○ STANDARD BYPASS'}
                    </span>
                  </div>
                </button>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-900 text-rose-200 text-xs rounded-lg flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Single Sign-In Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSelectLogin(selectedIdx);
                }} 
                className="space-y-4 pt-1"
              >
                {/* User Identity Select */}
                <div>
                  <label htmlFor="user-select-dropdown" className="text-xs font-bold text-slate-300 uppercase tracking-widest block mb-2 font-mono">
                    Authorized Corporate User Account
                  </label>
                  <div className="relative">
                    <select
                      id="user-select-dropdown"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-slate-100 font-medium outline-none cursor-pointer text-xs"
                      value={selectedIdx}
                      onChange={(e) => {
                        setSelectedIdx(Number(e.target.value));
                        setError('');
                      }}
                    >
                      {staffList.map((staff, idx) => (
                        <option key={staff.name} value={idx}>
                          {staff.name} — {staff.role} ({staff.department})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Dynamic identity info card */}
                  <div className="mt-2 text-[10px] text-slate-400 font-mono bg-slate-900/40 border border-slate-800/65 rounded-lg px-3 py-1.5 flex justify-between items-center">
                    <span>Account Email:</span>
                    <span className="text-blue-400 font-bold">
                      {staffList[selectedIdx]?.name.toLowerCase().replace(/\s+/g, '.')}@corporate.com
                    </span>
                  </div>
                </div>

                {/* Password / Pin field */}
                <div>
                  <label htmlFor="login-input-password" className="text-xs font-bold text-slate-300 uppercase tracking-widest block mb-2 font-mono">
                    Security Passcode / PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      id="login-input-password"
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 pl-10 text-slate-250 outline-none focus:border-blue-500 text-xs font-mono"
                      value="12345678"
                      disabled
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">
                    Enterprise passcodes and digital tokens are securely generated for sandbox simulation.
                  </span>
                </div>

                <button
                  id="login-submit-btn"
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  <Sparkles className="w-4 h-4 animate-pulse text-amber-350" />
                  Establish Secure Session as {staffList[selectedIdx]?.name}
                </button>
              </form>
            </div>
          ) : (
            /* ACTIVE MFA VERIFICATION DEVICE INTERFACE Screen */
            <div className="space-y-6">
              <button
                id="mfa-goback-btn"
                type="button"
                onClick={() => {
                  setPendingLoginIdx(null);
                  setMfaInput('');
                  setMfaError('');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Central Sign-In
              </button>

              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  Authenticator Verification Required
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Dynamic OTP authentication is enforced for <strong className="text-blue-400">{staffList[pendingLoginIdx].name}</strong> ({staffList[pendingLoginIdx].role}).
                </p>
              </div>

              {mfaError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900 text-rose-200 text-xs rounded-lg flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{mfaError}</span>
                </div>
              )}

              {/* Simulated Pocket Smartphone displaying Vetiva Authenticator App */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-2 right-3 flex items-center gap-1.5 bg-blue-950/80 border border-blue-900/50 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span className="font-mono text-[9px] text-blue-300 font-bold uppercase tracking-widest">LIVE GENERATOR</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-950 flex items-center justify-center border border-blue-800 text-blue-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">Vetiva Authenticator</h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {staffList[pendingLoginIdx]?.name.toLowerCase().replace(/\s+/g, '.')}@corporate.com
                    </p>
                  </div>
                </div>

                {/* Simulated dynamic rotating token widget */}
                <div 
                  id="live-mfa-code-card"
                  onClick={() => {
                    setMfaInput(mfaCode);
                    setMfaError('');
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl py-4 flex flex-col items-center justify-center relative cursor-pointer group hover:border-blue-500/80 hover:bg-slate-950 transition-all select-none"
                  title="Click to copy and autofill code"
                >
                  <span className="font-mono text-3xl font-black text-blue-400 tracking-wider group-hover:text-blue-300 group-hover:scale-105 transition-all">
                    {mfaCode.slice(0, 3)} {mfaCode.slice(3)}
                  </span>
                  
                  {/* Countdown rotation timer line */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
                    <span className="text-[9px] font-mono text-slate-450">
                      Rotates in {mfaTimeLeft}s (Click box to autofill)
                    </span>
                  </div>

                  {/* Liquid progress transition representing time left */}
                  <div 
                    className="absolute bottom-0 left-0 h-[3px] bg-blue-500 transition-all duration-1000 ease-linear" 
                    style={{ width: `${(mfaTimeLeft / 15) * 100}%` }}
                  />
                </div>
              </div>

              {/* Secure verification inputs */}
              <div className="space-y-3.5">
                <div>
                  <label htmlFor="mfa-verify-input" className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                    Authenticator Code (6-Digits)
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      id="mfa-verify-input"
                      type="text"
                      maxLength={7}
                      placeholder="e.g. 000 000"
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-lg py-3 pl-9 pr-4 text-slate-100 outline-none focus:border-blue-500 font-mono font-black text-base tracking-widest text-center"
                      value={mfaInput}
                      onChange={(e) => {
                        // Keep numeric formats
                        const cleanStr = e.target.value.replace(/[^0-9]/g, '');
                        if (cleanStr.length <= 6) {
                          setMfaInput(cleanStr);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 font-sans pt-1">
                  <button
                    id="mfa-autofill-btn"
                    type="button"
                    onClick={() => {
                      setMfaInput(mfaCode);
                      setMfaError('');
                    }}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Auto-Fill Code
                  </button>
                  <button
                    id="mfa-submit-verify-btn"
                    type="button"
                    onClick={() => {
                      const cleanInput = mfaInput.replace(/\s+/g, '');
                      const cleanCode = mfaCode.replace(/\s+/g, '');
                      if (cleanInput === cleanCode) {
                        onLoginSuccess(pendingLoginIdx!);
                      } else {
                        setMfaError('The security passcode does not match. Please enter the current code active on your auth device.');
                      }
                    }}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors shadow-lg shadow-blue-900/10 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Verify & Access Portal
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-600 text-center mt-6 pt-4 border-t border-slate-900 leading-normal font-sans">
            Unauthorized access or actions monitored by independent audits. Portal conforms with SOC-2 guidelines.
          </div>
        </div>

      </div>

    </div>
  );
}
