import { Wifi, WifiOff, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export const SyncStatusBar = () => {
  const { isOnline, syncStatus, pendingSyncCount, syncNow } = useData();
  const [syncing, setSyncing] = useState(false);
  const [showSynced, setShowSynced] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await syncNow();
    setSyncing(false);
    setShowSynced(true);
  };

  useEffect(() => {
    if (showSynced) {
      const t = setTimeout(() => setShowSynced(false), 2000);
      return () => clearTimeout(t);
    }
  }, [showSynced]);

  // Determine display state
  const displayStatus = syncing || syncStatus === 'syncing'
    ? 'syncing'
    : syncStatus === 'error'
      ? 'error'
      : !isOnline
        ? 'offline'
        : pendingSyncCount > 0
          ? 'pending'
          : showSynced
            ? 'synced'
            : null;

  if (!displayStatus) return null;

  const configs = {
    offline: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-400',
      dot: 'bg-yellow-500',
      icon: WifiOff,
      label: 'Offline — saving locally',
    },
    syncing: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
      dot: 'bg-blue-500',
      icon: RefreshCw,
      label: 'Syncing data…',
    },
    error: {
      bg: 'bg-destructive/10',
      text: 'text-destructive',
      dot: 'bg-destructive',
      icon: AlertTriangle,
      label: 'Sync failed',
    },
    pending: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-400',
      dot: 'bg-yellow-500',
      icon: Wifi,
      label: `${pendingSyncCount} changes to sync`,
    },
    synced: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-400',
      dot: 'bg-green-500',
      icon: Check,
      label: 'All changes synced ✓',
    },
  };

  const cfg = configs[displayStatus];
  const Icon = cfg.icon;

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors", cfg.bg, cfg.text)}>
      {/* Colored dot */}
      <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot, displayStatus === 'syncing' && 'animate-pulse')} />
      <Icon size={14} className={displayStatus === 'syncing' ? 'animate-spin' : ''} />
      <span className="flex-1">{cfg.label}</span>

      {pendingSyncCount > 0 && !isOnline && (
        <span className="bg-yellow-200 dark:bg-yellow-800 px-1.5 py-0.5 rounded-full text-[10px]">
          {pendingSyncCount} pending
        </span>
      )}

      {(displayStatus === 'pending' || displayStatus === 'error') && isOnline && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 rounded-lg text-[10px] font-semibold disabled:opacity-50"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
      )}
    </div>
  );
};
