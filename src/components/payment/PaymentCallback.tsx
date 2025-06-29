import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SubscriptionService } from '../../services/subscriptionService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export const PaymentCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');
      
      if (!reference) {
        setStatus('error');
        setMessage('No payment reference found');
        return;
      }

      try {
        const result = await SubscriptionService.verifyPayment(reference);
        
        if (result.success) {
          setStatus('success');
          setMessage('Payment successful! Your subscription has been activated.');
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard');
            window.location.reload(); // Refresh to update subscription status
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage(error.message || 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <div className="space-y-6">
          {status === 'loading' && (
            <>
              <div className="flex justify-center">
                <Loader className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Verifying Payment
                </h2>
                <p className="text-gray-600">
                  Please wait while we confirm your payment...
                </p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Payment Successful!
                </h2>
                <p className="text-gray-600 mb-4">{message}</p>
                <p className="text-sm text-gray-500">
                  Redirecting to dashboard in 3 seconds...
                </p>
              </div>
              <Button onClick={handleReturnToDashboard} className="w-full">
                Return to Dashboard
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Payment Failed
                </h2>
                <p className="text-gray-600 mb-4">{message}</p>
              </div>
              <div className="space-y-3">
                <Button onClick={handleReturnToDashboard} className="w-full">
                  Return to Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = 'mailto:support@resumeai.com'}
                  className="w-full"
                >
                  Contact Support
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};