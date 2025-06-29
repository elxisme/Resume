import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CreditCard, ArrowLeft } from 'lucide-react';

export const DemoPayment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const reference = searchParams.get('reference');
  const amount = searchParams.get('amount');
  const email = searchParams.get('email');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto-redirect to callback after countdown
      navigate(`/payment/callback?reference=${reference}&status=success`);
    }
  }, [countdown, navigate, reference]);

  const handlePayNow = () => {
    navigate(`/payment/callback?reference=${reference}&status=success`);
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-50 rounded-full">
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Demo Payment Gateway
            </h2>
            <p className="text-gray-600">
              This is a demo payment page for testing purposes
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">₦{amount ? (parseInt(amount) / 100).toFixed(2) : '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reference:</span>
              <span className="font-medium text-sm">{reference}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button onClick={handlePayNow} className="w-full" size="lg">
              Pay Now (Demo)
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel Payment
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Auto-redirecting in {countdown} seconds...
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Demo Mode:</strong> This is a simulated payment gateway. 
              In production, this would redirect to the actual Paystack checkout page.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};