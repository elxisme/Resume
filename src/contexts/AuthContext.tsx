import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, Subscription, Package } from '../types';

interface AuthContextType {
  user: User | null;
  profile: (Profile & { subscription?: Subscription & { package: Package } }) | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<(Profile & { subscription?: Subscription & { package: Package } }) | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Ref to track timeout for stuck loading state
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    // Set up a timeout to handle stuck loading states
    const setupLoadingTimeout = () => {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Set a new timeout for 7 seconds
      loadingTimeoutRef.current = setTimeout(() => {
        if (mounted && isLoading) {
          console.warn('Authentication process stuck in loading state - forcing logout');
          
          // Force logout to clear stuck state
          logout().catch(console.error);
          
          // Reset loading state
          setIsLoading(false);
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      }, 7000); // 7 seconds timeout
    };

    // Clear timeout when loading completes
    const clearLoadingTimeout = () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };

    // Start the timeout when component mounts and is loading
    if (isLoading) {
      setupLoadingTimeout();
    }

    // Clear any stale auth tokens on app start
    const clearStaleTokens = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) {
          // Clear any stale tokens from localStorage
          localStorage.removeItem('supabase.auth.token');
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.warn('Error clearing stale tokens:', error);
        // Clear localStorage and sign out on any auth errors
        localStorage.removeItem('supabase.auth.token');
        await supabase.auth.signOut();
      }
    };

    clearStaleTokens();

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Session error:', error);
          // Clear stale data on session errors
          await supabase.auth.signOut();
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsLoading(false);
            clearLoadingTimeout();
          }
        } else {
          if (mounted) {
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            
            if (initialSession?.user) {
              await fetchProfile(initialSession.user.id);
            } else {
              setIsLoading(false);
              clearLoadingTimeout();
            }
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          clearLoadingTimeout();
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email);
        
        if (mounted) {
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            await fetchProfile(newSession.user.id);
          } else {
            setProfile(null);
            setIsLoading(false);
            clearLoadingTimeout();
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearLoadingTimeout();
    };
  }, [isLoading]); // Add isLoading as dependency to restart timeout when loading state changes

  const fetchProfile = async (userId: string) => {
    try {
      // Get profile - use maybeSingle() to handle cases where profile doesn't exist
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      // If no profile found, set profile to null
      if (!profileData) {
        console.warn('No profile found for user:', userId);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      // Get active subscription with package details - use maybeSingle() since subscription is optional
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          package:packages(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (subscriptionError) {
        console.warn('Error fetching subscription:', subscriptionError);
        // Continue without subscription data
      }

      // Combine profile with subscription data
      const profileWithSubscription = {
        ...profileData,
        subscription: subscription || undefined
      };

      setProfile(profileWithSubscription);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
      // Clear timeout when profile fetch completes
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // The onAuthStateChange listener will handle the rest
      // Don't set isLoading to false here - let the auth state change handle it
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password');
      } else if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error('Unable to connect to the database. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Login failed');
      }
    } finally {
      // CRITICAL FIX: Always reset loading state regardless of success/failure
      // This prevents infinite loading when auth state change doesn't fire immediately
      setTimeout(() => {
        setIsLoading(false);
      }, 100); // Small delay to allow auth state change to process first
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
        },
      });

      if (error) {
        // Handle specific Supabase auth errors
        if (error.message.includes('User already registered') || 
            error.message.includes('user_already_exists') ||
            error.code === 'user_already_exists') {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw error;
      }
      // The onAuthStateChange listener will handle the rest
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error('Unable to connect to the database. Please check your internet connection.');
      } else {
        throw error;
      }
    } finally {
      // CRITICAL FIX: Always reset loading state regardless of success/failure
      // This prevents infinite loading when auth state change doesn't fire immediately
      setTimeout(() => {
        setIsLoading(false);
      }, 100); // Small delay to allow auth state change to process first
    }
  };

  const logout = async () => {
    try {
      // Clear local state immediately for better UX
      setUser(null);
      setProfile(null);
      setSession(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Logout error (continuing anyway):', error);
      }
      
      // Clear any remaining local storage
      localStorage.removeItem('supabase.auth.token');
      
    } catch (error: any) {
      console.error('Logout error:', error);
      // Force clear state even on error
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsLoading(false);
      
      // Clear local storage as fallback
      localStorage.removeItem('supabase.auth.token');
      
      throw new Error(error.message || 'Logout failed');
    } finally {
      // Clear any pending timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;

      // Refresh profile data
      await fetchProfile(user.id);
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw new Error(error.message || 'Profile update failed');
    }
  };

  const value = {
    user,
    profile,
    session,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};