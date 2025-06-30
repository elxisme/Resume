import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Package } from '../../types';
import { SubscriptionService } from '../../services/subscriptionService';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../ui/Toast';
import { Crown, Check, X, Loader, AlertCircle } from 'lucide-react';

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

  const { handleError } = useErrorHandler();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPackages();
    }
  }, [isOpen]);

  const loadPackages = async () => {
    try {
      setError('');
      setIsLoading(true);
      const data = await SubscriptionService.getPackages();
      const paidPackages = data.filter(pkg => pkg.price > 0); // Only show paid packages
      setPackages(paidPackages);
      
      // Auto-select the first package if available
      if (paidPackages.length > 0) {
        setSelectedPackage(paidPackages[0].id);
      }
    } catch (error: any) {
      console.error('Error loading packages:', error);
      const errorMessage = 'Failed to load subscription packages. Please try again.';
      setError(errorMessage);
      handleError(error, 'Package Loading', { showToast: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPackage) {
      showError('Selection Required', 'Please select a subscription package.');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    
    try {
      showSuccess('Initializing Payment...', 'Please wait while we prepare your subscription.');
      
      const paymentData = await SubscriptionService.initializePayment(selectedPackage);
      
      // Redirect to payment page
      if (paymentData.data?.authorization_url) {
        // Use window.location.href for better cross-browser compatibility
        window.location.href = paymentData.data.authorization_url;
      } else {
        throw new Error('Payment initialization failed - no authorization URL received');
      }
      
    } catch (error: any) {
      console.error('Subscription failed:', error);
      
      let errorMessage = 'Subscription failed. Please try again.';
      
      if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        errorMessage = 'Your session has expired. Please sign in again and try subscribing.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('payment')) {
        errorMessage = 'Payment service is temporarily unavailable. Please try again in a few minutes.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      handleError(error, 'Subscription', { showToast: false });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePackageSelect = (packageId: string) => {
    if (!isProcessing) {
      setSelectedPackage(packageId);
      setError(''); // Clear any previous errors
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
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
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isProcessing}
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-700 text-sm">{error}</p>
                  {error.includes('session has expired') && (
                    <p className="text-red-600 text-xs mt-1">
                      Please refresh the page and sign in again before subscribing.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading subscription packages...</p>
              </div>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Packages Available</h3>
              <p className="text-gray-600 mb-4">
                We're currently updating our subscription packages. Please try again later.
              </p>
              <Button onClick={loadPackages} variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {packages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedPackage === pkg.id
                        ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50'
                        : 'hover:border-gray-300 hover:shadow-md'
                    } ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''}`}
                    onClick={() => handlePackageSelect(pkg.id)}
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
                        <div className="p-3 bg-blue-100 rounded-lg border border-blue-200">
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

              {/* Additional Information */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• You'll be redirected to our secure payment processor</li>
                  <li>• Complete your payment using your preferred method</li>
                  <li>• Your premium features will be activated immediately</li>
                  <li>• You can cancel or modify your subscription anytime</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};