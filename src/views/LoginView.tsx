import React, { useState } from 'react';
import { KedataMark } from '../components/KedataMark';
import { Lock, Mail, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

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
    <div className="cms-login min-h-screen flex items-center justify-center p-4 bg-white dark:bg-[#171B1F]">
      <div className="max-w-md w-full bg-white dark:bg-[#1E2328] rounded-xl border border-slate-200 dark:border-[#3E4651] p-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-3">
            <KedataMark className="h-16 w-16" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Kedata <span className="text-[#6C7A89]">CMS</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Headless Multi-Site Content Management System
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Administrator
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="login-email"
                autoComplete="username"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kedata.id"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#6C7A89]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="login-password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#6C7A89]"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-xl transition  disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Memverifikasi...</span>
            ) : (
              <>
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Development Seed Hint */}
        <div className="mt-8 pt-4 border-t border-[#DFE2DC] dark:border-[#3E4651] text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6C7A89] dark:text-[#8E9BA9]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Akun Admin Otomatis dari Variabel .env</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Email: <code className="bg-slate-100 dark:bg-[#282E35] px-1 py-0.5 rounded">admin@kedata.id</code> • Password: <code className="bg-slate-100 dark:bg-[#282E35] px-1 py-0.5 rounded">KedataAdmin2026!</code>
          </p>
        </div>
      </div>
    </div>
  );
};
