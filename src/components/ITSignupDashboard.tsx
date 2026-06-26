import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Loader, Eye, EyeOff, ArrowRight } from 'lucide-react';
import authClient from '../services/authClient';
import firebaseAuthService from '../services/firebaseAuthService';

interface Props {
  onLoginSuccess?: (user: any) => void;
  customBackgroundUrl?: string;
  customLogoUrl?: string;
}

export default function ITSignupDashboard({ onLoginSuccess, customBackgroundUrl, customLogoUrl }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('All fields are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.register(email, password, firstName, lastName, 'IT Support');
      firebaseAuthService.setUser(result.user);
      setSuccess('Account created. Redirecting to dashboard...');
      if (onLoginSuccess) onLoginSuccess(result.user);
      // Give a short delay so user sees success message
      setTimeout(() => (window.location.href = '/'), 800);
    } catch (err: any) {
      const fallbackMessage = err?.message || '';
      const shouldFallback = /ECONNREFUSED|Failed to fetch|Internal Server Error|Database query error|Firebase|NetworkError/i.test(fallbackMessage);
      if (shouldFallback) {
        try {
          const fallbackResult = await firebaseAuthService.register(email, password, firstName, lastName, 'IT Support');
          firebaseAuthService.setUser(fallbackResult.user);
          setSuccess('Account created locally. Redirecting to dashboard...');
          if (onLoginSuccess) onLoginSuccess(fallbackResult.user);
          setTimeout(() => (window.location.href = '/'), 800);
          return;
        } catch (fallbackErr: any) {
          setError(fallbackErr?.message || String(fallbackErr));
          return;
        }
      }
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-no-repeat flex items-center justify-center p-4" style={{ backgroundImage: customBackgroundUrl ? `url(${customBackgroundUrl})` : undefined }}>
      <div className="w-full max-w-md bg-slate-950/60 backdrop-blur-2xl border rounded-2xl p-8">
        <div className="text-center mb-6">
          <img src={customLogoUrl || 'https://i.imgur.com/8PoFnhE.png'} alt="Logo" className="h-12 mx-auto mb-3" />
          <h2 className="text-white text-2xl font-bold">IT Administrator Signup</h2>
          <p className="text-sm text-slate-300 mt-2">Create the first IT Administrator account. Manage other users from the dashboard.</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded text-red-200 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-900/20 border border-green-700/30 rounded text-green-200 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">First Name</label>
              <input className="w-full px-3 py-2 rounded bg-slate-800 text-white" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Last Name</label>
              <input className="w-full px-3 py-2 rounded bg-slate-800 text-white" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input type="email" className="w-full pl-10 pr-3 py-2 rounded bg-slate-800 text-white" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input type={showPassword ? 'text' : 'password'} className="w-full pl-10 pr-10 py-2 rounded bg-slate-800 text-white" value={password} onChange={(e) => setPassword(e.target.value)} />
<button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Confirm Password</label>
            <input type={showPassword ? 'text' : 'password'} className="w-full px-3 py-2 rounded bg-slate-800 text-white" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded flex items-center justify-center gap-2" disabled={loading}>
            {loading ? (<><Loader className="w-4 h-4 animate-spin" /> Creating...</>) : (<><span>Create IT Admin Account</span> <ArrowRight className="w-4 h-4" /></>)}
          </button>

          <div className="text-center">
            <a href="/" className="text-sm text-slate-300 hover:text-white">Back to Login</a>
          </div>
        </form>
      </div>
    </div>
  );
}
