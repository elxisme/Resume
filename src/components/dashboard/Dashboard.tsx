import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FileUpload } from './FileUpload';
import { JobDescriptionInput } from './JobDescriptionInput';
import { TemplateSelector } from './TemplateSelector';
import { AnalysisResults } from './AnalysisResults';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ResumeTemplate, ResumeAnalysis } from '../../types';
import { ResumeService } from '../../services/resumeService';
import { Sparkles, ArrowRight, AlertCircle, Crown } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');

  const hasActiveSubscription = !!profile?.subscription;

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templatesData = await ResumeService.getTemplates();
      setTemplates(templatesData);
      // Auto-select first available template
      const availableTemplate = templatesData.find(t => 
        !t.is_premium || hasActiveSubscription
      );
      if (availableTemplate) {
        setSelectedTemplate(availableTemplate.id);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setError('');
    
    try {
      // Extract text from file (simplified for demo)
      const text = await extractTextFromFile(file);
      setResumeText(text);
    } catch (error) {
      setError('Failed to extract text from file. Please try again.');
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // In production, use proper PDF/DOCX parsing libraries
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // This is a simplified version - in production you'd use pdf-parse or mammoth
        resolve(`Extracted text from ${file.name}:\n\n[Resume content would be extracted here using proper libraries like pdf-parse for PDF files or mammoth for DOCX files]`);
      };
      reader.readAsText(file);
    });
  };

  const handleAnalyze = async () => {
    if (!resumeText || !jobDescription.trim() || !selectedTemplate) return;

    setIsAnalyzing(true);
    setError('');
    
    try {
      const analysisResponse = await ResumeService.analyzeResume({
        resumeText,
        jobDescription,
        templateId: selectedTemplate
      });

      // Create analysis object for display
      const analysisData: ResumeAnalysis = {
        id: Date.now().toString(),
        user_id: profile!.id,
        original_resume_text: resumeText,
        job_description: jobDescription,
        tailored_resume_text: analysisResponse.tailoredResume,
        template_id: selectedTemplate,
        suggestions: analysisResponse.suggestions,
        ats_score: analysisResponse.atsScore,
        analysis_data: analysisResponse.analysisData,
        created_at: new Date().toISOString()
      };

      setAnalysis(analysisData);
    } catch (error: any) {
      setError(error.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = (format: 'pdf' | 'docx') => {
    if (!analysis) return;
    
    // In production, generate actual files using jsPDF and other libraries
    const content = analysis.tailored_resume_text || '';
    const blob = new Blob([content], { 
      type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tailored-resume.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreview = () => {
    if (!analysis) return;
    // In production, open a modal with formatted resume preview
    alert('Preview feature: Would show formatted resume with selected template');
  };

  const canAnalyze = resumeText && jobDescription.trim() && selectedTemplate;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {profile?.first_name}!
        </h1>
        <p className="text-gray-600">
          Let's create your perfect, ATS-optimized resume tailored for your dream job.
        </p>
        {hasActiveSubscription && (
          <div className="mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
              <Crown className="w-4 h-4 mr-1" />
              {profile.subscription?.package?.name} Plan
            </span>
          </div>
        )}
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {!analysis ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Upload Resume</h2>
              <FileUpload
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClearFile={() => {
                  setSelectedFile(null);
                  setResumeText('');
                }}
              />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Job Description</h2>
              <JobDescriptionInput
                value={jobDescription}
                onChange={setJobDescription}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Choose Template</h2>
              <TemplateSelector
                templates={templates}
                selectedTemplate={selectedTemplate}
                onTemplateSelect={setSelectedTemplate}
                hasActiveSubscription={hasActiveSubscription}
              />
            </div>

            <Card className="text-center">
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-full w-fit mx-auto">
                  <Sparkles className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze?</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Our AI will analyze your resume and tailor it specifically for this job opening.
                  </p>
                  <Button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze}
                    isLoading={isAnalyzing}
                    className="w-full flex items-center justify-center space-x-2"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <span>Analyzing with AI...</span>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Analyze & Tailor Resume</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Complete!</h2>
            <p className="text-gray-600">
              Your resume has been optimized and tailored for the job description.
            </p>
          </div>
          
          <AnalysisResults
            analysis={analysis}
            onDownload={handleDownload}
            onPreview={handlePreview}
          />

          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => {
                setAnalysis(null);
                setSelectedFile(null);
                setResumeText('');
                setJobDescription('');
                setError('');
              }}
            >
              Start New Analysis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};