import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ResumeAnalysis } from '../../types';
import { BarChart3, CheckCircle, AlertCircle, Download, Edit3, Copy } from 'lucide-react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../ui/Toast';

interface AnalysisResultsProps {
  analysis: ResumeAnalysis;
  tailoredResumeText: string;
  onDownload: (content: string, filename: string) => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis,
  tailoredResumeText,
  onDownload
}) => {
  const [editableContent, setEditableContent] = useState(tailoredResumeText);
  const [isEditing, setIsEditing] = useState(false);
  const { handleError } = useErrorHandler();
  const { showSuccess } = useToast();

  const handleDownloadClick = () => {
    try {
      const filename = `tailored-resume-${new Date().toISOString().split('T')[0]}.md`;
      onDownload(editableContent, filename);
    } catch (error) {
      handleError(error, 'Download', {
        fallbackMessage: 'Failed to download resume. Please try again.'
      });
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editableContent);
      showSuccess('Copied!', 'Resume content copied to clipboard.');
    } catch (error) {
      handleError(error, 'Copy to Clipboard', {
        fallbackMessage: 'Failed to copy to clipboard. Please try again.'
      });
    }
  };

  const resetToOriginal = () => {
    setEditableContent(tailoredResumeText);
    setIsEditing(false);
  };

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
            <div className="text-2xl font-bold text-blue-600">{analysis.ats_score}%</div>
            <div className="text-sm text-gray-500">Compatibility</div>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000"
            style={{ width: `${analysis.ats_score}%` }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Needs Work</span>
          <span className="text-gray-500">Perfect Match</span>
        </div>

        {/* Score interpretation */}
        <div className="mt-4 p-3 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-800">
            {analysis.ats_score >= 80 ? (
              <>
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Excellent! Your resume is highly optimized for ATS systems.
              </>
            ) : analysis.ats_score >= 60 ? (
              <>
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Good score! Consider implementing the suggestions below for further improvement.
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Your resume could benefit from optimization. Review the suggestions below.
              </>
            )}
          </p>
        </div>
      </Card>

      {/* Suggestions */}
      <Card>
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Improvements</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Key optimizations made to enhance your resume for this position
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

        {/* Analysis metadata */}
        {analysis.analysis_data && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {analysis.analysis_data.keywordsAdded && analysis.analysis_data.keywordsAdded.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Keywords Added:</span>
                  <p className="text-gray-600 mt-1">
                    {analysis.analysis_data.keywordsAdded.slice(0, 3).join(', ')}
                    {analysis.analysis_data.keywordsAdded.length > 3 && '...'}
                  </p>
                </div>
              )}
              {analysis.analysis_data.sectionsOptimized && (
                <div>
                  <span className="font-medium text-gray-700">Sections Optimized:</span>
                  <p className="text-gray-600 mt-1">
                    {analysis.analysis_data.sectionsOptimized.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Tailored Resume (Markdown) */}
      <Card>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Your Tailored Resume (Markdown)</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center space-x-1"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditing ? 'View Mode' : 'Edit Mode'}</span>
              </Button>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToOriginal}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            {isEditing 
              ? 'Edit your resume content below, then download when ready.'
              : 'Your optimized resume in Markdown format. Click Edit Mode to make changes.'
            }
          </p>
        </div>

        <div className="space-y-4">
          <textarea
            value={editableContent}
            onChange={(e) => setEditableContent(e.target.value)}
            readOnly={!isEditing}
            className={`w-full h-96 p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isEditing 
                ? 'border-blue-300 bg-white' 
                : 'border-gray-300 bg-gray-50 cursor-default'
            }`}
            placeholder="Your tailored resume content will appear here..."
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleDownloadClick}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Markdown (.md)</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyToClipboard}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copy to Clipboard</span>
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Markdown Format:</strong> Your resume is formatted in Markdown, which can be easily 
            converted to PDF, HTML, or other formats using tools like Pandoc, or opened in any text editor. 
            The format is ATS-friendly and maintains clean, readable structure.
          </p>
        </div>
      </Card>
    </div>
  );
};