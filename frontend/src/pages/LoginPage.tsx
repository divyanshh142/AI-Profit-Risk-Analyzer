import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export default function LoginPage() {
  const { user, loading, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (user) return <Navigate to="/upload" replace />;

  async function handleDemoLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(username || 'demo@company.com', password || 'demo');
      navigate('/upload');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoQuick() {
    setSubmitting(true);
    setError('');
    try {
      await login('demo@company.com', 'demo');
      navigate('/upload');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function decodeGoogleEmail(credential: string): string | null {
    try {
      const payload = JSON.parse(atob(credential.split('.')[1]));
      return payload.email ?? null;
    } catch {
      return null;
    }
  }

  const hasValidGoogleClient =
    Boolean(GOOGLE_CLIENT_ID) &&
    GOOGLE_CLIENT_ID !== 'your_google_oauth_client_id.apps.googleusercontent.com' &&
    GOOGLE_CLIENT_ID.trim().length > 10;

  const loginForm = (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          PC
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-500">Sign in to access your company dashboard</p>
      </div>

      <div className="section-card space-y-5">
        {hasValidGoogleClient ? (
          <GoogleLogin
            onSuccess={async (response) => {
              const email = response.credential ? decodeGoogleEmail(response.credential) : null;
              if (!email) {
                setError('Could not read Google account email.');
                return;
              }
              setSubmitting(true);
              try {
                await loginWithGoogle(email);
                navigate('/upload');
              } catch {
                setError('Google sign-in failed.');
              } finally {
                setSubmitting(false);
              }
            }}
            onError={() => setError('Google sign-in was cancelled or failed.')}
            theme="outline"
            size="large"
            width="100%"
            text="signin_with"
          />
        ) : (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Set <code className="text-brand-600">VITE_GOOGLE_CLIENT_ID</code> in{' '}
            <code>.env</code> to enable Google sign-in.
          </p>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleDemoLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="username"
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="you@company.com"
              className="input-field"
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleDemoQuick}
          className="btn-secondary w-full"
          disabled={submitting}
        >
          Continue with demo account
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link to="/" className="text-brand-600 hover:underline">
          &larr; Back to home
        </Link>
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      {hasValidGoogleClient ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{loginForm}</GoogleOAuthProvider>
      ) : (
        loginForm
      )}
    </div>
  );
}
