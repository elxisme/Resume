import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { FileText, User, LogOut, Settings, Crown } from 'lucide-react';

interface HeaderProps {
  onUpgradeClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUpgradeClick }) => {
  const { user, profile, logout } = useAuth();

  const isAuthenticated = !!user && !!profile;
  const hasActiveSubscription = !!profile?.subscription;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ResumeAI</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Dashboard</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Templates</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">History</a>
            {profile?.is_admin && (
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Admin</a>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {hasActiveSubscription ? (
                  <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-medium rounded-full flex items-center space-x-1">
                    <Crown className="w-4 h-4" />
                    <span>{profile.subscription?.package?.name || 'Premium'}</span>
                  </span>
                ) : (
                  <Button variant="outline" size="sm" onClick={onUpgradeClick}>
                    Upgrade
                  </Button>
                )}
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="hidden md:block text-sm font-medium text-gray-700">
                      {profile?.first_name}
                    </span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <button 
                      onClick={logout}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button variant="ghost">Sign In</Button>
                <Button>Get Started</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};