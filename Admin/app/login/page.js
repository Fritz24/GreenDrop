'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Loader from '@/components/Loader';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Handle error message from redirect
    const errCode = searchParams.get('error');
    if (errCode === 'unauthorized') {
      setError('Access denied. Only administrators can access the admin dashboard.');
    }

    // If session already exists, redirect to dashboard
    async function checkExistingSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Double-check if the profile is admin/super_admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile && (profile.role === 'admin' || profile.role === 'super_admin')) {
          router.replace('/dashboard');
        }
      }
    }
    checkExistingSession();
  }, [searchParams, router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Check if user is admin or super_admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        // Unauthorized, sign out
        await supabase.auth.signOut();
        setError('Access denied. Only administrators can access the admin dashboard.');
        setLoading(false);
        return;
      }

      router.replace('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-blob-1"></div>
      <div className="login-blob-2"></div>

      <div className="login-container">
        <div className="login-card">

          <div className="login-header">
            <h1>GreenDrop Admin</h1>
            <p>Sign in to manage waste collections and agents</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="name@greendrop.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 28 }}>
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>Signing in...</>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-loading-screen">
        <Loader message="Loading GreenDrop login..." />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
