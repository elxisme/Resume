import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Package } from '../../types';
import { SubscriptionService } from '../../services/subscriptionService';
import { Crown, Check, X, Loader } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadPackages();
    }
  }, [isOpen]);

  const loadPackages = async () => {
    try {
      setError('');
      const data = await SubscriptionService.getPackages();
      setPackages(data.filter(pkg => pkg.price > 0)); // Only show paid packages
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error loading packages:', error);
      setError('Failed to load subscription packages');
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPackage) return;
    
    setIsProcessing(true);
    setError('');
    
    try {
      const paymentData = await SubscriptionService.initializePayment(selectedPackage);
      
      // Redirect to Paystack checkout
      if (paymentData.data?.authorization_url) {
        window.location.href = paymentData.data.authorization_url;
      } else {
        throw new Error('Payment initialization failed - no authorization URL received');
      }
      
    } catch (error: any) {
      console.error('Subscription failed:', error);
      setError(error.message || 'Subscription failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upgrade to Premium</h2>
              <p className="text-gray-600 mt-1">Unlock all features and get unlimited access</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isProcessing}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {packages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedPackage === pkg.id
                        ? 'ring-2 ring-blue-500 border-blue-500'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => !isProcessing && setSelectedPackage(pkg.id)}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                            <span>{pkg.name}</span>
                            <Crown className="w-5 h-5 text-yellow-500" />
                          </h3>
                          <p className="text-gray-600 mt-1">{pkg.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            ${pkg.price}
                          </div>
                          <div className="text-sm text-gray-500">per month</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Features included:</h4>
                        <ul className="space-y-2">
                          {pkg.features.map((feature, index) => (
                            <li key={index} className="flex items-center space-x-2 text-sm">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-gray-700">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Template Access:</span>
                          <span className="font-medium">
                            {pkg.template_access === -1 ? 'All Templates' : `${pkg.template_access} Templates`}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-600">Monthly Analyses:</span>
                          <span className="font-medium">
                            {pkg.analysis_limit === -1 ? 'Unlimited' : pkg.analysis_limit}
                          </span>
                        </div>
                      </div>

                      {selectedPackage === pkg.id && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2">
                            <Check className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Selected Plan</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="mt-8 text-center">
                <Button
                  onClick={handleSubscribe}
                  disabled={!selectedPackage || isProcessing}
                  isLoading={isProcessing}
                  size="lg"
                  className="px-8"
                >
                  {isProcessing ? 'Redirecting to Payment...' : 'Subscribe Now'}
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Secure payment powered by Paystack
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  You will be redirected to Paystack's secure checkout page
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};