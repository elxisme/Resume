import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AdminService } from '../../services/adminService';
import { Package } from '../../types';
import { Plus, Edit, Trash2, Crown, Settings, X, Check } from 'lucide-react';

export const PackageManager: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await AdminService.getPackages();
      setPackages(data);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePackage = async (packageData: any) => {
    try {
      await AdminService.createPackage(packageData);
      await loadPackages();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating package:', error);
    }
  };

  const handleUpdatePackage = async (id: string, packageData: any) => {
    try {
      await AdminService.updatePackage(id, packageData);
      await loadPackages();
      setEditingPackage(null);
    } catch (error) {
      console.error('Error updating package:', error);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    
    try {
      await AdminService.deletePackage(id);
      await loadPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading packages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Subscription Packages</h2>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Package
        </Button>
      </div>

      {showCreateForm && (
        <PackageForm
          onSubmit={handleCreatePackage}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingPackage && (
        <PackageForm
          package={editingPackage}
          onSubmit={(data) => handleUpdatePackage(editingPackage.id, data)}
          onCancel={() => setEditingPackage(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <Card key={pkg.id} hover>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <span>{pkg.name}</span>
                    {pkg.price > 0 && <Crown className="w-4 h-4 text-yellow-500" />}
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
                <h4 className="font-medium text-gray-900 mb-2">Features:</h4>
                <ul className="space-y-1">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-center space-x-2">
                      <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Template Access:</span>
                  <span className="font-medium">
                    {pkg.template_access === -1 ? 'All Templates' : `${pkg.template_access} Templates`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monthly Analyses:</span>
                  <span className="font-medium">
                    {pkg.analysis_limit === -1 ? 'Unlimited' : pkg.analysis_limit}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setEditingPackage(pkg)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDeletePackage(pkg.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

interface PackageFormProps {
  package?: Package;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const PackageForm: React.FC<PackageFormProps> = ({ package: pkg, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    description: pkg?.description || '',
    price: pkg?.price || 0,
    template_access: pkg?.template_access || 1,
    analysis_limit: pkg?.analysis_limit || 5,
    features: pkg?.features || ['']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      features: formData.features.filter(f => f.trim())
    });
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => i === index ? value : feature)
    }));
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {pkg ? 'Edit Package' : 'Create New Package'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Package Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Price (USD)"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
            required
          />
        </div>

        <Input
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Template Access (-1 for unlimited)"
            type="number"
            value={formData.template_access}
            onChange={(e) => setFormData(prev => ({ ...prev, template_access: parseInt(e.target.value) }))}
            required
          />
          <Input
            label="Analysis Limit (-1 for unlimited)"
            type="number"
            value={formData.analysis_limit}
            onChange={(e) => setFormData(prev => ({ ...prev, analysis_limit: parseInt(e.target.value) }))}
            required
          />
        </div>

        {/* Enhanced Features Input */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Package Features
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFeature}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Feature
            </Button>
          </div>
          
          <div className="space-y-2">
            {formData.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder={`Feature ${index + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {formData.features.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFeature(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {formData.features.length === 0 && (
            <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 text-sm">No features added yet</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFeature}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add First Feature
              </Button>
            </div>
          )}
        </div>

        {/* Feature Preview */}
        {formData.features.some(f => f.trim()) && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Feature Preview:</h4>
            <ul className="space-y-1">
              {formData.features
                .filter(f => f.trim())
                .map((feature, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <Button type="submit" className="flex-1">
            {pkg ? 'Update Package' : 'Create Package'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};