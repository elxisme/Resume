import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ResumeAnalysis } from '../../types';
import { Download, Eye, BarChart3, CheckCircle, AlertCircle } from 'lucide-react';

interface AnalysisResultsProps {
  analysis: ResumeAnalysis;
  onDownload: (format: 'pdf' | 'docx') => void;
  onPreview: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis,
  onDownload,
  onPreview
}) => {
  return (
    <div className="space-y-6">
      {/* ATS Score */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">ATS Score</h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{analysis.atsScore}%</div>
            <div className="text-sm text-gray-500">Compatibility</div>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000"
            style={{ width: `${analysis.atsScore}%` }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Needs Work</span>
          <span className="text-gray-500">Perfect Match</span>
        </div>
      </Card>

      {/* Suggestions */}
      <Card>
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Suggestions</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Key improvements made to optimize your resume for this position
          </p>
        </div>
        
        <div className="space-y-3">
          {analysis.suggestions.map((suggestion, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{suggestion}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Download Options */}
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Download Your Resume</h3>
          <p className="text-gray-600 text-sm">
            Your tailored resume is ready! Choose your preferred format.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onPreview}
            variant="outline"
            className="flex-1 flex items-center justify-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </Button>
          <Button
            onClick={() => onDownload('pdf')}
            className="flex-1 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </Button>
          <Button
            onClick={() => onDownload('docx')}
            variant="secondary"
            className="flex-1 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download DOCX</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};