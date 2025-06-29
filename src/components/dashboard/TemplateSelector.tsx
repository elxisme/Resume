import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ResumeTemplate } from '../../types';
import { Crown, Check } from 'lucide-react';

interface TemplateSelectorProps {
  templates: ResumeTemplate[];
  selectedTemplate: string | null;
  onTemplateSelect: (templateId: string) => void;
  hasActiveSubscription: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  hasActiveSubscription
}) => {
  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Template</h3>
        <p className="text-gray-600 text-sm">
          Select an ATS-friendly template for your tailored resume
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = selectedTemplate === template.id;
          const isAccessible = !template.is_premium || hasActiveSubscription;

          return (
            <div
              key={template.id}
              className={`
                relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${!isAccessible && 'opacity-75'}
              `}
              onClick={() => isAccessible && onTemplateSelect(template.id)}
            >
              {template.is_premium && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                    <Crown className="w-3 h-3" />
                    <span>Premium</span>
                  </div>
                </div>
              )}

              {isSelected && (
                <div className="absolute top-2 left-2 z-10">
                  <div className="bg-blue-500 text-white p-1 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              )}

              <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 relative">
                <div className="absolute inset-4 bg-white rounded shadow-sm p-3">
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-1 bg-gray-200 rounded w-1/2"></div>
                    <div className="space-y-1 mt-3">
                      <div className="h-1 bg-gray-200 rounded"></div>
                      <div className="h-1 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-1 bg-gray-200 rounded w-4/6"></div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="h-1 bg-gray-300 rounded w-1/3"></div>
                      <div className="h-1 bg-gray-200 rounded"></div>
                      <div className="h-1 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white">
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                    {template.category}
                  </span>
                </div>
              </div>

              {!isAccessible && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-center">
                    <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-white text-sm font-medium">Premium Required</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};