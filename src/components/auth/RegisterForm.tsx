import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

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
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?/`~]/.test(password);
    
    if (!hasLowercase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasUppercase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasNumber) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password strength
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await register(formData);
    } catch (err: any) {
      // Handle specific Supabase auth errors
      if (err?.message?.includes('User already registered') || 
          err?.message?.includes('user_already_exists') ||
          err?.code === 'user_already_exists') {
        setError('This email is already registered. Please sign in instead.');
      } else if (err?.message?.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else if (err?.message?.includes('weak_password') || err?.code === 'weak_password') {
        setError('Password does not meet security requirements. Please ensure it contains uppercase, lowercase, numbers, and special characters.');
      } else if (err?.message?.includes('Database error saving new user')) {
        setError('Registration failed due to a server error. Please try again or contact support if the problem persists.');
      } else if (err?.message?.includes('Password')) {
        setError('Password requirements not met. Please choose a stronger password.');
      } else {
        setError(err?.message || 'Registration failed. Please try again.');
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-600 mt-2">Join ResumeAI today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            {error.includes('already registered') && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={onToggleForm}
                  className="text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  Sign in here
                </button>
              </div>
            )}
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
          />
          <Input
            name="lastName"
            label="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            required
            placeholder="Doe"
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
        />

        <Input
          type="password"
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          required
          placeholder="Create a strong password"
          helpText="Must contain: 8+ characters, uppercase, lowercase, number, and special character"
        />

        <Input
          type="password"
          name="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          placeholder="Repeat your password"
        />

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onToggleForm}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </Card>
  );
};