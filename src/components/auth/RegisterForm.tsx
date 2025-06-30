import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface RegisterFormProps {
  onToggleForm: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleForm }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });

  const { register, isLoading } = useAuth();
  const { handleError } = useErrorHandler();
  const { showSuccess } = useToast();

  const validatePassword = (password: string) => {
    const feedback = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One lowercase letter');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One uppercase letter');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One number');
    }

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?/`~]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One special character');
    }

    return { score, feedback };
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }

    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.password) {
      setError('Password is required');
      return false;
    }

    if (passwordStrength.score < 4) {
      setError('Password does not meet security requirements');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update password strength when password changes
    if (name === 'password') {
      setPasswordStrength(validatePassword(value));
    }

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register(formData);
      showSuccess(
        'Account created successfully!', 
        'Welcome to ResumeAI. You can now start analyzing your resume.'
      );
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle specific registration errors
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.message?.includes('User already registered') || 
          err.message?.includes('user_already_exists') ||
          err.code === 'user_already_exists') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (err.message?.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (err.message?.includes('weak_password') || err.code === 'weak_password') {
        errorMessage = 'Password does not meet security requirements. Please ensure it contains uppercase, lowercase, numbers, and special characters.';
      } else if (err.message?.includes('Database error saving new user')) {
        errorMessage = 'Registration failed due to a server error. Please try again or contact support if the problem persists.';
      } else if (err.message?.includes('Password')) {
        errorMessage = 'Password requirements not met. Please choose a stronger password.';
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('fetch')) {
        errorMessage = 'Unable to connect to the database. Please check your internet connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Also use the error handler for logging
      handleError(err, 'Registration', { showToast: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = () => {
    setError('');
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'bg-red-500';
    if (passwordStrength.score === 3) return 'bg-yellow-500';
    if (passwordStrength.score === 4) return 'bg-green-500';
    return 'bg-green-600';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score <= 2) return 'Weak';
    if (passwordStrength.score === 3) return 'Good';
    if (passwordStrength.score === 4) return 'Strong';
    return 'Very Strong';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-600 mt-2">Join ResumeAI today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-700 text-sm">{error}</p>
                {error.includes('already registered') && (
                  <button
                    type="button"
                    onClick={onToggleForm}
                    className="text-blue-600 hover:text-blue-700 font-medium underline text-sm mt-1"
                  >
                    Sign in here
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                ×
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            name="firstName"
            label="First Name"
            value={formData.firstName}
            onChange={handleChange}
            required
            placeholder="John"
            autoComplete="given-name"
            disabled={isSubmitting || isLoading}
          />
          <Input
            name="lastName"
            label="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            required
            placeholder="Doe"
            autoComplete="family-name"
            disabled={isSubmitting || isLoading}
          />
        </div>

        <Input
          type="email"
          name="email"
          label="Email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="your@email.com"
          autoComplete="email"
          disabled={isSubmitting || isLoading}
        />

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Create a strong password"
            autoComplete="new-password"
            disabled={isSubmitting || isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
            disabled={isSubmitting || isLoading}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {formData.password && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Password strength:</span>
              <span className={`text-sm font-medium ${
                passwordStrength.score <= 2 ? 'text-red-600' :
                passwordStrength.score === 3 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {getPasswordStrengthText()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
              ></div>
            </div>
            {passwordStrength.feedback.length > 0 && (
              <div className="text-xs text-gray-600">
                Missing: {passwordStrength.feedback.join(', ')}
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            label="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="Repeat your password"
            autoComplete="new-password"
            disabled={isSubmitting || isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
            disabled={isSubmitting || isLoading}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {formData.confirmPassword && formData.password && (
            <div className="absolute right-10 top-8">
              {formData.password === formData.confirmPassword ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isSubmitting || isLoading}
          disabled={isSubmitting || isLoading || passwordStrength.score < 4}
        >
          {isSubmitting || isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onToggleForm}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            disabled={isSubmitting || isLoading}
          >
            Sign in
          </button>
        </p>
      </div>
    </Card>
  );
};