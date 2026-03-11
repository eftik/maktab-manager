import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, lazy, Suspense } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAutoBackup } from "@/hooks/useAutoBackup";

// Silent component that just runs the auto-backup hook
const AutoBackupRunner = () => { useAutoBackup(); return null; };

// Direct imports for fast page switching
import HomePage from "@/pages/HomePage";
import SchoolsPage from "@/pages/SchoolsPage";
import StudentsPage from "@/pages/StudentsPage";
import FeesPage from "@/pages/FeesPage";
import ExpensesPage from "@/pages/ExpensesPage";
import ReportsPage from "@/pages/ReportsPage";
import StaffPage from "@/pages/StaffPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminsPage from "@/pages/AdminsPage";

// Only lazy-load rarely used pages
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SetupPage = lazy(() => import("@/pages/SetupPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));

const queryClient = new QueryClient();

const pages: Record<string, React.FC> = {
  '/': HomePage,
  '/schools': SchoolsPage,
  '/students': StudentsPage,
  '/fees': FeesPage,
  '/expenses': ExpensesPage,
  '/reports': ReportsPage,
  '/staff': StaffPage,
  '/settings': SettingsPage,
  '/admins': AdminsPage,
};

const ownerOnlyPages = ['/admins'];

const PageSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  const { user, admin, loading, isOwner } = useAuth();
  const [path, setPath] = useState(() => {
  return localStorage.getItem("appPath") || "/";
});
  const [ownerExists, setOwnerExists] = useState<boolean | null>(null);

  useEffect(() => {
  const checkOwner = async () => {
    const cached = localStorage.getItem("ownerExists");

    // If system was already installed before
    if (cached === "true") {
      setOwnerExists(true);
    }

    try {
      const { data, error } = await supabase.rpc("owner_exists");

      if (!error && data) {
        setOwnerExists(true);
        localStorage.setItem("ownerExists", "true");
      }
    } catch (err) {
      // If offline, just use cached value
      if (cached === "true") {
        setOwnerExists(true);
      }
    }
  };

  checkOwner();
}, []);

  // Handle reset-password route
  const isResetPassword = window.location.pathname === '/reset-password' || window.location.hash.includes('type=recovery');

  if (isResetPassword) {
    return (
      <Suspense fallback={<PageSpinner />}>
        <ResetPasswordPage />
      </Suspense>
    );
  }

  if (loading || ownerExists === null) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ownerExists) {
    return (
      <Suspense fallback={<PageSpinner />}>
              <SetupPage
        onComplete={() => {
          localStorage.setItem("ownerExists", "true");
          setOwnerExists(true);
        }}
      />
    </Suspense>
  );
}

  if (!user) {
    return (
      <Suspense fallback={<PageSpinner />}>
        <LoginPage />
      </Suspense>
    );
}

  const effectivePath = (!isOwner && ownerOnlyPages.includes(path)) ? '/' : path;
  const Page = pages[effectivePath] || HomePage;

  return (
    <DataProvider>
      <AutoBackupRunner />
      <AppShell
          currentPath={effectivePath}
          onNavigate={(p) => {
            setPath(p);
            localStorage.setItem("appPath", p);
          }}
        >
        <Page />
      </AppShell>
    </DataProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <LanguageProvider>
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
