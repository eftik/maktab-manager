import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Mail, Eye, EyeOff, LogIn } from 'lucide-react';

const LoginPage = () => {
  const { signIn } = useAuth();
  const { t, dir } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotMsg('');
    setLoading(true);
    const err = await signIn(email.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError(t('enterEmailFirst' as any));
      return;
    }
    setForgotLoading(true);
    setError('');
    setForgotMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setForgotMsg(t('resetEmailSent' as any));
    }
    setForgotLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
            <span className="text-3xl">🏫</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Maktab Manager</h1>
          <p className="text-sm text-muted-foreground">{t('login' as any)}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-2.5 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('email' as any)}</label>
            <div className="relative">
              <Mail size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <input
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-xl py-2.5 ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('password' as any)}</label>
            <div className="relative">
              <Lock size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-background border border-border rounded-xl py-2.5 ps-9 pe-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground p-0 min-h-0 min-w-0"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <LogIn size={16} />
            {loading ? '...' : t('login' as any)}
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={forgotLoading}
            className="w-full text-xs text-muted-foreground hover:text-primary transition-colors py-1"
          >
            {forgotLoading ? '...' : t('forgotPassword' as any)}
          </button>

          {forgotMsg && (
            <div className="bg-primary/10 text-primary text-xs rounded-xl px-4 py-2.5 font-medium text-center">
              {forgotMsg}
            </div>
          )}
        </form>

        <p className="text-[10px] text-muted-foreground text-center">Maktab Manager v2.0</p>
      </div>
    </div>
  );
};

export default LoginPage;
