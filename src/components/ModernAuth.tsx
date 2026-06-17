import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Loader, Eye, EyeOff, Chrome, Building2, ArrowRight } from 'lucide-react';
import authService, { AuthUser } from '../services/authClient';

interface ModernAuthProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

export default function ModernAuth({ onLoginSuccess }: ModernAuthProps) {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth');
    const token = params.get('token');

    if (oauthSuccess === 'success' && token) {
      authService.setToken(token);
      authService
        .getCurrentUser()
        .then((user) => {
          onLoginSuccess(user);
          params.delete('oauth');
          params.delete('token');
          const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
          window.history.replaceState(null, '', newUrl);
        })
        .catch((error) => {
          setError(error instanceof Error ? error.message : 'OAuth login failed');
        });
    }

    if (oauthSuccess === 'failed') {
      setError('OAuth login failed. Please try again or use email/password login.');
      params.delete('oauth');
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [onLoginSuccess]);

  const [oauthEnabled, setOauthEnabled] = React.useState({ google: false, microsoft: false });

  React.useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    fetch(`${apiBase}/status`)
      .then((r) => r.json())
      .then((data) => {
        setOauthEnabled({ google: !!data.configuredGoogle, microsoft: !!data.configuredMicrosoft });
      })
      .catch(() => {
        // ignore - default to disabled
      });
  }, []);

  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('Administration');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      const result = await authService.login(email, password);
      onLoginSuccess(result.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.register(email, password, firstName, lastName, department);
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
      const data = await authService.requestPasswordReset(resetEmail);
      if (data?.resetToken) {
        setError(`Password reset token generated: ${data.resetToken}`);
      }
      setMode('reset-password');
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
      await authService.resetPassword(resetToken, newPassword);
      setMode('login');
      setError('Password reset successful. You can now login.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    setError('');
    setLoading(true);

    const apiBase = import.meta.env.VITE_API_URL || '/api';
    window.location.href = `${apiBase}/auth/${provider.toLowerCase()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center justify-center gap-3 mb-4">
              <img src="https://i.imgur.com/8PoFnhE.png" alt="Vetiva Logo" className="h-14 w-auto object-contain" referrerPolicy="no-referrer" />
              <h1 className="text-2xl md:text-3xl font-bold text-white">Memo Approval Portal</h1>
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

              {(oauthEnabled.google || oauthEnabled.microsoft) && (
                <div className="mt-4 space-y-3">
                  <div className="text-center text-xs uppercase tracking-[0.22em] text-slate-500">Or continue with</div>
                  <div className="grid grid-cols-1 gap-3">
                    {oauthEnabled.google && (
                      <button
                        type="button"
                        onClick={() => handleOAuthLogin('google')}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 text-white py-2 text-sm hover:bg-slate-700 transition"
                      >
                        <img src="https://imgur.com/8PoFnhE.png" alt="Google" className="h-4 w-4 rounded-full" />
                        Continue with Google
                      </button>
                    )}
                    {oauthEnabled.microsoft && (
                      <button
                        type="button"
                        onClick={() => handleOAuthLogin('microsoft')}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 text-white py-2 text-sm hover:bg-slate-700 transition"
                      >
                        <span className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">M</span>
                        Continue with Microsoft
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800/50 text-slate-400">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('Google')}
                  disabled={!oauthEnabled.google}
                  title={!oauthEnabled.google ? 'Google OAuth not configured' : 'Continue with Google'}
                  className={`bg-slate-700/50 ${oauthEnabled.google ? 'hover:bg-slate-700' : 'opacity-50 cursor-not-allowed'} border border-slate-600 rounded-lg py-2 text-white text-sm font-medium transition-all`}
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('Microsoft')}
                  disabled={!oauthEnabled.microsoft}
                  title={!oauthEnabled.microsoft ? 'Microsoft OAuth not configured' : 'Continue with Microsoft'}
                  className={`bg-slate-700/50 ${oauthEnabled.microsoft ? 'hover:bg-slate-700' : 'opacity-50 cursor-not-allowed'} border border-slate-600 rounded-lg py-2 text-white text-sm font-medium transition-all flex items-center justify-center gap-2`}
                >
                  Microsoft
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMode('register')}
                className="w-full text-sm text-slate-400 hover:text-slate-300 py-2"
              >
                Don't have an account? <span className="text-blue-400">Sign up</span>
              </button>
            </form>
          )}

          {/* Register form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option>Administration</option>
                  <option>Finance & Accounts</option>
                  <option>Operations</option>
                  <option>Human Resources</option>
                  <option>Internal Audit & Control</option>
                  <option>Executive Office</option>
                  <option>Legal & Compliance</option>
                  <option>IT & Systems</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-sm text-slate-400 hover:text-slate-300 py-2"
              >
                Already have an account? <span className="text-blue-400">Sign in</span>
              </button>
            </form>
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
