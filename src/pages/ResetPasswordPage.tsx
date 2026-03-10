import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Eye, EyeOff, KeyRound } from 'lucide-react';

const ResetPasswordPage = () => {
  const { t, dir } = useLanguage();
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check if this is a recovery flow from the URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError(t('passcodeMinLength' as any));
      return;
    }
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4" dir={dir}>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">{t('noAccess' as any)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
            <KeyRound className="text-primary-foreground" size={32} />
          </div>
          <h1 className="text-xl font-bold text-foreground">{t('resetPassword' as any)}</h1>
        </div>

        {success ? (
          <div className="bg-primary/10 text-primary text-sm rounded-xl px-4 py-4 font-medium text-center">
            {t('passwordUpdated' as any)} ✓
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-2.5 font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('newPassword' as any)}</label>
              <div className="relative">
                <Lock size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full bg-background border border-border rounded-xl py-2.5 ps-9 pe-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? '...' : t('updatePassword' as any)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
