import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LandingPage } from './components/landing/LandingPage';
import { TransparentHeader } from './components/layout/TransparentHeader';
import { Header } from './components/layout/Header';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { Dashboard } from './components/dashboard/Dashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UpgradeModal } from './components/subscription/UpgradeModal';

const AppContent: React.FC = () => {
  const { user, profile, isLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);

  const isAuthenticated = !!user && !!profile;

  // Debug logging
  useEffect(() => {
    console.log('App state:', { 
      user: !!user, 
      profile: !!profile, 
      isAuthenticated, 
      isLoading,
      userEmail: user?.email,
      profileName: profile ? `${profile.first_name} ${profile.last_name}` : null
    });
  }, [user, profile, isAuthenticated, isLoading]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      // User is already logged in, no need to show auth form
      return;
    }
    setShowLogin(false); // Show register form
    setShowAuthForm(true);
  };

  const handleSignIn = () => {
    if (isAuthenticated) {
      // User is already logged in, no need to show auth form
      return;
    }
    setShowLogin(true); // Show login form
    setShowAuthForm(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    if (showAuthForm) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {showLogin ? (
              <LoginForm onToggleForm={() => setShowLogin(false)} />
            ) : (
              <RegisterForm onToggleForm={() => setShowLogin(true)} />
            )}
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAuthForm(false)}
                className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
              >
                ← Back to home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <TransparentHeader 
          onGetStarted={handleGetStarted}
          onSignIn={handleSignIn}
        />
        <LandingPage onGetStarted={handleGetStarted} />
      </div>
    );
  }

  // Show dashboard for authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onUpgradeClick={() => setShowUpgradeModal(true)} />
      <main>
        {profile?.is_admin ? <AdminDashboard /> : <Dashboard />}
      </main>
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;