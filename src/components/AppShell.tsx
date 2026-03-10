import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Home, School, Users, CreditCard, Receipt, BarChart3, UserCog, Settings, Menu, X, ChevronRight, ShieldCheck, LogOut } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { SyncStatusBar } from '@/components/SyncStatusBar';
import { cn } from '@/lib/utils';

const allNavItems = [
  { key: 'home', icon: Home, path: '/' },
  { key: 'schools', icon: School, path: '/schools' },
  { key: 'students', icon: Users, path: '/students' },
  { key: 'fees', icon: CreditCard, path: '/fees' },
  { key: 'expenses', icon: Receipt, path: '/expenses' },
  { key: 'reports', icon: BarChart3, path: '/reports', ownerOnly: true },
  { key: 'staff', icon: UserCog, path: '/staff' },
  { key: 'admins', icon: ShieldCheck, path: '/admins', ownerOnly: true },
  { key: 'settings', icon: Settings, path: '/settings' },
] as const;

interface AppShellProps {
  children: ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const AppShell = ({ children, currentPath, onNavigate }: AppShellProps) => {
  const { t, dir } = useLanguage();
  const { isOwner, signOut, admin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAnimating, setDrawerAnimating] = useState(false);

  const navItems = allNavItems.filter(i => !('ownerOnly' in i && i.ownerOnly) || isOwner);

  const bottomNav = navItems.slice(0, 5);
  const moreNav = navItems.slice(5);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    requestAnimationFrame(() => setDrawerAnimating(true));
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerAnimating(false);
    setTimeout(() => setDrawerOpen(false), 300);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const currentPageLabel = navItems.find(i => i.path === currentPath)?.key || 'home';

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col" dir={dir}>
      {/* Status bar spacer + Header */}
      <header className="sticky top-0 z-40 pt-safe">
        <div className="bg-primary text-primary-foreground px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏫</span>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-tight">Maktab Manager</h1>
              <p className="text-[10px] font-medium text-primary-foreground/70 leading-none mt-0.5">
                {t(currentPageLabel as any)}
              </p>
            </div>
          </div>
          <button
            onClick={drawerOpen ? closeDrawer : openDrawer}
            className="p-2 -mr-1 rounded-xl hover:bg-primary-foreground/10 active:bg-primary-foreground/20 transition-colors"
          >
            {drawerOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Side Drawer */}
      {drawerOpen && (
        <>
          <div
            className={cn(
              "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
              drawerAnimating ? "opacity-100" : "opacity-0"
            )}
            onClick={closeDrawer}
          />
          <nav
            className={cn(
              "fixed top-0 z-50 h-full w-72 bg-card pt-safe flex flex-col transition-transform duration-300 ease-out",
              dir === 'rtl' ? 'right-0' : 'left-0',
              drawerAnimating
                ? 'translate-x-0'
                : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
            )}
          >
            {/* Drawer Header */}
            <div className="px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
                  <span className="text-lg">🏫</span>
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-sm">Maktab Manager</h2>
                  <p className="text-xs text-muted-foreground">{t('dashboard')}</p>
                </div>
              </div>
            </div>

            {/* Nav Items */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-hide">
              {navItems.map((item, index) => {
                const active = currentPath === item.path;
                return (
                  <button
                    key={item.key}
                    onClick={() => { onNavigate(item.path); closeDrawer(); }}
                    className={cn(
                      "w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-150 active:scale-[0.98]",
                      active
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "hover:bg-muted active:bg-muted text-foreground"
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <item.icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                    <span className="flex-1 text-start">{t(item.key as any)}</span>
                    {!active && <ChevronRight size={16} className="text-muted-foreground/50" />}
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="px-5 py-4 border-t border-border pb-safe space-y-2">
              <button
                onClick={() => { signOut(); closeDrawer(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={18} />
                <span>{t('logout' as any)}</span>
              </button>
              <p className="text-[10px] text-muted-foreground text-center">
                {admin?.displayName && <span className="block mb-0.5">{admin.displayName}</span>}
                Maktab Manager v2.0
              </p>
            </div>
          </nav>
        </>
      )}

      {/* Sync Status */}
      <SyncStatusBar />

      {/* Content */}
      <main className="flex-1 pb-24 overflow-auto scroll-smooth-touch">
        {children}
      </main>

      {/* Bottom Navigation — iOS / Android hybrid style */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border/50">
        <div className="flex items-stretch justify-around px-1">
          {bottomNav.map(item => {
            const active = currentPath === item.path;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 px-1 flex-1 transition-all duration-200 relative",
                  active ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                )}
                <item.icon size={22} strokeWidth={active ? 2.4 : 1.6} className="transition-all" />
                <span className={cn(
                  "text-[10px] leading-none transition-all",
                  active ? "font-semibold" : "font-medium"
                )}>
                  {t(item.key as any)}
                </span>
              </button>
            );
          })}
          {/* More button */}
          <button
            onClick={openDrawer}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 px-1 flex-1 transition-all duration-200 relative",
              moreNav.some(i => i.path === currentPath)
                ? "text-primary"
                : "text-muted-foreground active:text-foreground"
            )}
          >
            {moreNav.some(i => i.path === currentPath) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
            )}
            <Menu size={22} strokeWidth={1.6} />
            <span className="text-[10px] font-medium leading-none">{t('more' as any)}</span>
          </button>
        </div>
        <div className="pb-safe" />
      </nav>
    </div>
  );
};
