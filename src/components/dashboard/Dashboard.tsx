import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FileUpload } from './FileUpload';
import { JobDescriptionInput } from './JobDescriptionInput';
import { AnalysisResults } from './AnalysisResults';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ResumeAnalysis } from '../../types';
import { ResumeService } from '../../services/resumeService';
import { FileProcessingResult } from '../../services/fileProcessingService';
import { downloadTextFile } from '../../utils/fileUtils';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../ui/Toast';
import { Sparkles, ArrowRight, AlertCircle, Crown, CheckCircle, Clock, Zap } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingResult, setProcessingResult] = useState<FileProcessingResult | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [error, setError] = useState<string>('');

  const { handleError } = useErrorHandler();
  const { showSuccess, showError } = useToast();

  const hasActiveSubscription = !!profile?.subscription;

  // Enhanced progress simulation with stages - Fixed for cross-browser compatibility
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isAnalyzing) {
      setAnalysisProgress(0);
      setAnalysisStage('Initializing analysis...');
      
      const stages = [
        { progress: 15, message: 'Extracting resume content...' },
        { progress: 30, message: 'Analyzing job requirements...' },
        { progress: 50, message: 'Matching skills and keywords...' },
        { progress: 70, message: 'Optimizing content for ATS...' },
        { progress: 85, message: 'Generating suggestions...' },
        { progress: 95, message: 'Finalizing analysis...' }
      ];
      
      let currentStage = 0;
      
      const updateProgress = () => {
        setAnalysisProgress(prev => {
          if (prev >= 95) return prev; // Stop at 95% until actual completion
          
          const nextProgress = prev + Math.random() * 8 + 2; // 2-10% increments
          
          // Update stage message based on progress
          while (currentStage < stages.length && nextProgress >= stages[currentStage].progress) {
            setAnalysisStage(stages[currentStage].message);
            currentStage++;
          }
          
          return Math.min(nextProgress, 95);
        });
      };
      
      // Use a more reliable interval approach for cross-browser compatibility
      interval = setInterval(updateProgress, 400);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [isAnalyzing]);

  const handleFileSelect = async (file: File, result: FileProcessingResult) => {
    setSelectedFile(file);
    setProcessingResult(result);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!processingResult || !jobDescription.trim()) return;

    setIsAnalyzing(true);
    setError('');
    setAnalysisProgress(0);
    setAnalysisStage('Starting analysis...');
    
    try {
      const analysisResponse = await ResumeService.analyzeResume({
        resumeText: processingResult.text,
        jobDescription,
        templateId: 'markdown' // Simple identifier for markdown output
      });

      // Complete progress
      setAnalysisProgress(100);
      setAnalysisStage('Analysis complete!');

      // Create analysis object for display
      const analysisData: ResumeAnalysis = {
        id: Date.now().toString(),
        user_id: profile!.id,
        original_resume_text: processingResult.text,
        job_description: jobDescription,
        tailored_resume_text: analysisResponse.tailoredResume,
        template_id: 'markdown',
        suggestions: analysisResponse.suggestions,
        ats_score: analysisResponse.atsScore,
        analysis_data: {
          ...analysisResponse.analysisData,
          fileMetadata: processingResult.metadata
        },
        created_at: new Date().toISOString()
      };

      // Save analysis to database
      try {
        await ResumeService.saveAnalysis({
          resumeText: processingResult.text,
          jobDescription,
          templateId: 'markdown',
          tailoredResume: analysisResponse.tailoredResume,
          suggestions: analysisResponse.suggestions,
          atsScore: analysisResponse.atsScore,
          analysisData: analysisResponse.analysisData
        });
      } catch (saveError) {
        console.warn('Failed to save analysis to database:', saveError);
        // Continue anyway - user can still see results
      }

      setAnalysis(analysisData);
      showSuccess('Analysis Complete!', 'Your resume has been successfully optimized.');
    } catch (error: any) {
      console.error('Analysis error:', error);
      setError(error.message || 'Analysis failed. Please try again.');
      setAnalysisProgress(0);
      setAnalysisStage('');
      handleError(error, 'Resume Analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = (content: string, filename: string = 'tailored-resume.md') => {
    try {
      downloadTextFile(content, filename, 'text/markdown');
      showSuccess('Download Complete!', 'Your resume has been downloaded successfully.');
    } catch (error) {
      console.error('Download error:', error);
      handleError(error, 'File Download', {
        fallbackMessage: 'Failed to download resume. Please try again.'
      });
    }
  };

  const canAnalyze = processingResult && jobDescription.trim();

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
                processingResult={processingResult}
                onClearFile={() => {
                  setSelectedFile(null);
                  setProcessingResult(null);
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
            <Card className="text-center">
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-full w-fit mx-auto">
                  <Sparkles className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze?</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Our AI will analyze your resume and create a tailored Markdown version specifically for this job opening.
                  </p>
                  {processingResult && (
                    <div className="mb-4 p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center space-x-2 text-sm text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        <span>Resume processed: {processingResult.metadata.wordCount} words extracted</span>
                      </div>
                    </div>
                  )}
                  
                  {isAnalyzing && (
                    <div className="mb-4 space-y-3">
                      <div className="flex items-center justify-center space-x-2 text-blue-600">
                        <Zap className="w-5 h-5 animate-pulse" />
                        <span className="text-sm font-medium">AI Analysis in Progress</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                          style={{ width: `${analysisProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-white opacity-25 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <p className="text-xs text-gray-600 font-medium">
                          {analysisStage}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {Math.round(analysisProgress)}% complete • Estimated time: {Math.max(1, Math.ceil((100 - analysisProgress) / 20))}s remaining
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze || isAnalyzing}
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
            tailoredResumeText={analysis.tailored_resume_text || analysis.original_resume_text}
            onDownload={handleDownload}
          />

          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => {
                setAnalysis(null);
                setSelectedFile(null);
                setProcessingResult(null);
                setJobDescription('');
                setError('');
                setAnalysisProgress(0);
                setAnalysisStage('');
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