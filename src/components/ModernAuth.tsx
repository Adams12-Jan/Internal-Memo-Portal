import React, { useState, useEffect } from 'react';
import { Mail, Lock, AlertCircle, Loader, Eye, EyeOff, ArrowRight } from 'lucide-react';
import firebaseAuthService, { AuthUser } from '../services/firebaseAuthService';

interface ModernAuthProps {
  onLoginSuccess: (user: AuthUser) => void;
  customBackgroundUrl?: string;
  customLogoUrl?: string;
  customFrameColor?: string;
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

export default function ModernAuth({
  onLoginSuccess,
  customBackgroundUrl: customBackgroundUrlProp,
  customLogoUrl: customLogoUrlProp,
  customFrameColor: customFrameColorProp
}: ModernAuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customFrameColor, setCustomFrameColor] = useState(customFrameColorProp?.trim() || '#ffffff');
  const loginCardStyle: React.CSSProperties = {
    borderColor: customFrameColor,
    boxShadow: `0 30px 70px -35px ${customFrameColor}`
  };
  const [showPassword, setShowPassword] = useState(false);
  const defaultBackground = 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1400&h=900&fit=crop';
  const defaultLogo = 'https://i.imgur.com/8PoFnhE.png';
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState(customBackgroundUrlProp?.trim() || defaultBackground);
  const [customBrandLogoUrl, setCustomBrandLogoUrl] = useState(customLogoUrlProp?.trim() || defaultLogo);

  const loadSystemSettings = () => {
    const raw = localStorage.getItem('ca_system_settings');
    if (!raw) return;
    try {
      const settings = JSON.parse(raw);
      if (typeof settings.customBackgroundUrl === 'string' && settings.customBackgroundUrl.trim()) {
        setCustomBackgroundUrl(settings.customBackgroundUrl.trim());
      }
      if (typeof settings.customLogoUrl === 'string' && settings.customLogoUrl.trim()) {
        setCustomBrandLogoUrl(settings.customLogoUrl.trim());
      }
        if (typeof settings.customFrameColor === 'string' && settings.customFrameColor.trim()) {
          setCustomFrameColor(settings.customFrameColor.trim());
        }
    } catch {
      // ignore invalid settings
    }
  };

  useEffect(() => {
    loadSystemSettings();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'ca_system_settings') {
        loadSystemSettings();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    setCustomFrameColor(customFrameColorProp || '#ffffff');
  }, [customFrameColorProp]);

  useEffect(() => {
    setCustomBackgroundUrl(customBackgroundUrlProp?.trim() || defaultBackground);
  }, [customBackgroundUrlProp]);

  useEffect(() => {
    setCustomBrandLogoUrl(customLogoUrlProp?.trim() || defaultLogo);
  }, [customLogoUrlProp]);

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Forgot password
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await firebaseAuthService.login(email, password);
      firebaseAuthService.setUser(result.user);
      onLoginSuccess(result.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await firebaseAuthService.requestPasswordReset(resetEmail);
      setMode('reset-password');
      setError('Check your email for password reset instructions.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmResetPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Firebase password reset is handled via email link
      // This is a placeholder message
      setMode('login');
      setError('Please use the link in your email to reset your password');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-no-repeat flex items-center justify-center p-4"
      style={{
        backgroundImage: customBackgroundUrl ? `url("${customBackgroundUrl}")` : undefined,
        backgroundPosition: 'center center'
      }}
    >
      {/* Overlay for better contrast with purple tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d0837]/90 via-[#35054f]/85 to-[#1b0427]/95 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
          <div className="bg-slate-950/50 backdrop-blur-2xl border rounded-2xl p-8" style={loginCardStyle}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center justify-center gap-3 mb-4">
              <img src={customBrandLogoUrl} alt="Portal Logo" className="h-14 w-auto object-contain" referrerPolicy="no-referrer" onError={(event) => { (event.currentTarget as HTMLImageElement).src = 'https://i.imgur.com/8PoFnhE.png'; }} />
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Memo Portal Login
              </h1>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Login form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-10 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode('forgot-password')}
                className="w-full text-sm text-blue-400 hover:text-blue-300 py-2"
              >
                Forgot password?
              </button>


              <button
                type="button"
                onClick={() => setMode('register')}
                className="w-full text-sm text-slate-400 hover:text-slate-300 py-2"
              >
                IT must create user accounts. Contact your IT administrator.
              </button>
            </form>
          )}

          {/* Register form */}
          {mode === 'register' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-300">
                <h3 className="text-sm font-semibold text-white">Account creation is restricted.</h3>
                <p className="text-xs text-slate-400 mt-2">
                  User accounts must be created by IT and roles assigned according to approval level. Please contact your IT administrator to request access.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-sm text-slate-400 hover:text-slate-300 py-2"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Forgot password form */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-slate-300 text-sm mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Email Address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-all"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-sm text-blue-400 hover:text-blue-300 py-2"
              >
                Back to Login
              </button>
            </form>
          )}

          {/* Reset password form */}
          {mode === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Reset Token</label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Copy token from email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-all"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-sm text-blue-400 hover:text-blue-300 py-2"
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
