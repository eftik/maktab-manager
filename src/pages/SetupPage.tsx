import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Eye, EyeOff, KeyRound, User, Shield } from 'lucide-react';

interface SetupPageProps {
  onComplete: () => void;
}

const SetupPage = ({ onComplete }: SetupPageProps) => {
  const { t, dir } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [masterPasscode, setMasterPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (masterPasscode.length < 6) {
      setError(t('passcodeMinLength' as any));
      return;
    }
    if (masterPasscode !== confirmPasscode) {
      setError(t('passcodeMismatch' as any));
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('setup-owner', {
        body: { email: email.trim(), password, displayName: displayName.trim(), masterPasscode },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
            <Shield className="text-primary-foreground" size={32} />
          </div>
          <h1 className="text-xl font-bold text-foreground">{t('initialSetup' as any)}</h1>
          <p className="text-sm text-muted-foreground">{t('setupDescription' as any)}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-2.5 font-medium">
              {error}
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('name' as any)}</label>
            <div className="relative">
              <User size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl py-2.5 ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('name' as any)}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('email' as any)}</label>
            <div className="relative">
              <Mail size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-xl py-2.5 ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="owner@example.com"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('password' as any)}</label>
            <div className="relative">
              <Lock size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-background border border-border rounded-xl py-2.5 ps-9 pe-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">{t('masterPasscode' as any)}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Master Passcode */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('masterPasscode' as any)}</label>
            <div className="relative">
              <KeyRound size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <input
                type={showPasscode ? 'text' : 'password'}
                value={masterPasscode}
                onChange={e => setMasterPasscode(e.target.value)}
                required
                minLength={6}
                className="w-full bg-background border border-border rounded-xl py-2.5 ps-9 pe-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••"
              />
              <button type="button" onClick={() => setShowPasscode(!showPasscode)} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground">
                {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">{t('passcodeHint' as any)}</p>
          </div>

          {/* Confirm Passcode */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('confirmPasscode' as any)}</label>
            <div className="relative">
              <KeyRound size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <input
                type={showPasscode ? 'text' : 'password'}
                value={confirmPasscode}
                onChange={e => setConfirmPasscode(e.target.value)}
                required
                minLength={6}
                className="w-full bg-background border border-border rounded-xl py-2.5 ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Shield size={16} />
            {loading ? '...' : t('createOwner' as any)}
          </button>
        </form>

        <p className="text-[10px] text-muted-foreground text-center">Maktab Manager v2.0</p>
      </div>
    </div>
  );
};

export default SetupPage;
