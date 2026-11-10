import React, { useState } from 'react';
import { KedataWordmark } from '../components/KedataMark';
import { Lock, Mail, ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface LoginViewProps { onLoginSuccess: (user: any) => void; }

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@kedata.id');
  const [password, setPassword] = useState('KedataAdmin2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Login gagal. Periksa kembali email dan password.');
      }

      onLoginSuccess(json.data.user);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cms-auth cms-login min-h-screen bg-white dark:bg-[#171B1F]">
      <a href="/" className="cms-login-back"><ArrowLeft size={16} aria-hidden="true" /><span>Kembali ke beranda</span></a>
          <section className="cms-auth-panel">
            <div className="cms-auth-card">
              <div className="cms-auth-mobile-brand">
                <KedataWordmark />
              </div>

              <h1 className="cms-auth-form-title">Masuk ke dasbor</h1>
              <p className="cms-auth-form-lead">
                Gunakan akun administrator untuk mengelola konten dan situs.
              </p>

              {error && (
                <div className="cms-auth-error" role="alert">
                  <span className="cms-auth-error-dot" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="cms-auth-form">
                <div>
                  <label htmlFor="login-email" className="cms-auth-label">
                    Email administrator
                  </label>
                  <div className="relative">
                    <Mail className="cms-auth-input-icon" />
                    <input
                      id="login-email"
                      autoComplete="username"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@kedata.id"
                      className="cms-auth-input w-full py-3 pl-10 pr-3 text-[14px]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="cms-auth-label">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="cms-auth-input-icon" />
                    <input
                      id="login-password"
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="cms-auth-input w-full py-3 pl-10 pr-11 text-[14px]"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="cms-auth-eye"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="cms-auth-submit">
                  {loading ? (
                    <span>Memverifikasi...</span>
                  ) : (
                    <>
                      <span>Masuk ke dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="cms-auth-demo">
                <div className="cms-auth-demo-title">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Akses demo dari variabel .env</span>
                </div>
                <p>
                  Email{' '}
                  <code>admin@kedata.id</code> · Password <code>KedataAdmin2026!</code>
                </p>
              </div>
            </div>
          </section>
    </main>
  );
};
