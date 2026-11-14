import React, { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import axonaLogo from '../assets/axona-logo.jpg';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { needsSetup, login, createAdministrator } = useAuth();
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (needsSetup) {
        await createAdministrator({ name, organization, email, password });
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-md overflow-hidden">
            <img src={axonaLogo} alt="Axona" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight text-white">
              AXONA <span className="text-sky-400 text-xs align-middle font-semibold px-1.5 py-0.5 rounded bg-sky-950/70 border border-sky-800/60">AIS-140</span>
            </div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Fleet Management</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {needsSetup ? 'Create the administrator' : 'Sign in'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {needsSetup
                ? 'This database has no users yet. The first account becomes the super administrator.'
                : 'Use your fleet account email and password.'}
            </p>
          </div>

          {needsSetup && (
            <>
              <label className="block text-xs font-bold text-slate-700">
                Organization
                <input
                  required
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-medium"
                  autoComplete="organization"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Your name
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-medium"
                  autoComplete="name"
                />
              </label>
            </>
          )}

          <label className="block text-xs font-bold text-slate-700">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-medium"
              autoComplete="username"
            />
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Password
            <input
              required
              type="password"
              minLength={needsSetup ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-medium"
              autoComplete={needsSetup ? 'new-password' : 'current-password'}
            />
          </label>
          {needsSetup && (
            <p className="text-[11px] text-slate-400 -mt-2">At least 8 characters.</p>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-sm font-bold"
          >
            <LockKeyhole className="w-4 h-4" />
            <span>{submitting ? 'Please wait…' : needsSetup ? 'Create administrator' : 'Sign in'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
