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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
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
          placeholder="At least 6 characters"
          helpText="Choose a strong password"
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