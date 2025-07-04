import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { FileText, LogOut, Settings, Crown, X, Save } from 'lucide-react';

interface HeaderProps {
  onUpgradeClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUpgradeClick }) => {
  const { user, profile, logout, updateProfile } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || ''
  });
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = !!user && !!profile;
  const hasActiveSubscription = !!profile?.subscription;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update profile data when profile changes
  useEffect(() => {
    if (profile) {
      setProfileData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || ''
      });
    }
  }, [profile]);

  const handleLogout = async () => {
    try {
      setShowDropdown(false);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      window.location.reload();
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateError('');
    setUpdateSuccess(false);

    try {
      await updateProfile(profileData);
      setUpdateSuccess(true);
      setTimeout(() => {
        setShowProfileModal(false);
        setUpdateSuccess(false);
      }, 1500);
    } catch (error: any) {
      console.error('Profile update error:', error);
      setUpdateError(error.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const openProfileSettings = () => {
    setShowDropdown(false);
    setShowProfileModal(true);
    setUpdateError('');
    setUpdateSuccess(false);
  };

  return (
    <>
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
                  
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => setShowDropdown(!showDropdown)}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                        </span>
                      </div>
                      <span className="hidden md:block text-sm font-medium text-gray-700">
                        {profile?.first_name}
                      </span>
                    </button>
                    
                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            {profile?.first_name} {profile?.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        
                        <button 
                          onClick={openProfileSettings}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Profile Settings</span>
                        </button>
                        
                        <button 
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
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

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {updateSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">Profile updated successfully!</p>
              </div>
            )}

            {updateError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{updateError}</p>
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                  required
                  placeholder="John"
                />
                <Input
                  label="Last Name"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                  required
                  placeholder="Doe"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Account Type:</span>
                  <span className="font-medium">
                    {profile?.is_admin ? 'Administrator' : 'User'}
                  </span>
                </div>
                {hasActiveSubscription && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Subscription:</span>
                    <span className="font-medium text-green-600">
                      {profile.subscription?.package?.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 flex items-center justify-center space-x-2"
                  isLoading={isUpdating}
                  disabled={isUpdating}
                >
                  <Save className="w-4 h-4" />
                  <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProfileModal(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
};