import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, Eye, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../ui/Toast';
import { FileProcessingService, FileProcessingResult } from '../../services/fileProcessingService';
import { formatFileSize, getFileIcon } from '../../utils/fileUtils';

interface FileUploadProps {
  onFileSelect: (file: File, result: FileProcessingResult) => void;
  selectedFile: File | null;
  processingResult: FileProcessingResult | null;
  onClearFile: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  selectedFile,
  processingResult,
  onClearFile
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [processingStage, setProcessingStage] = useState('');

  const { handleError } = useErrorHandler();
  const { showSuccess, showError } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      let errorMessage = 'File upload failed';
      
      if (rejection.errors) {
        const error = rejection.errors[0];
        if (error.code === 'file-too-large') {
          errorMessage = 'File is too large. Please select a file smaller than 10MB.';
        } else if (error.code === 'file-invalid-type') {
          errorMessage = 'Invalid file type. Please select a PDF or DOCX file.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      showError('Upload Failed', errorMessage);
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploading(true);
      setError('');
      setProcessingStage('Validating file...');

      try {
        // Process the file with progress updates
        setProcessingStage('Extracting text content...');
        const result = await FileProcessingService.processFile(file);
        
        setProcessingStage('Validating resume content...');
        // Validate resume content
        const validation = await FileProcessingService.validateResumeContent(result.text);
        
        if (!validation.isValid) {
          const errorMsg = 'Resume validation failed: ' + validation.suggestions.join(', ');
          setError(errorMsg);
          showError('Validation Failed', errorMsg);
          setUploading(false);
          return;
        }

        setProcessingStage('Processing complete!');
        onFileSelect(file, result);
        showSuccess('File uploaded successfully!', `Extracted ${result.metadata.wordCount} words from your resume.`);
      } catch (error: any) {
        console.error('File processing error:', error);
        
        let errorMessage = 'Failed to process file';
        
        if (error.message?.includes('PDF')) {
          errorMessage = 'Unable to extract text from PDF. Please ensure it contains selectable text, not just images.';
        } else if (error.message?.includes('DOCX')) {
          errorMessage = 'Unable to process DOCX file. Please ensure it\'s a valid Word document.';
        } else if (error.message?.includes('Insufficient text')) {
          errorMessage = 'The file doesn\'t contain enough readable text. Please upload a complete resume.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
        handleError(error, 'File Upload', { 
          showToast: true,
          fallbackMessage: errorMessage 
        });
      } finally {
        setUploading(false);
        setProcessingStage('');
      }
    }
  }, [onFileSelect, handleError, showSuccess, showError]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    disabled: uploading
  });

  const clearError = () => {
    setError('');
  };

  if (selectedFile && processingResult) {
    return (
      <div className="space-y-4">
        <Card className="border-green-200 bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getFileIcon(selectedFile.type)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(selectedFile.size)} • {processingResult.metadata.wordCount} words
                      {processingResult.metadata.pageCount && ` • ${processingResult.metadata.pageCount} pages`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClearFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* File Processing Info */}
          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>✅ Text extracted successfully</span>
              <span>✅ Content validated</span>
              <span>✅ Ready for analysis</span>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <h4 className="font-medium text-gray-900 mb-2">Content Preview:</h4>
              <div className="bg-white p-3 rounded border max-h-40 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {FileProcessingService.generatePreview(processingResult.text, 300)}
                </pre>
              </div>
            </div>
          )}
        </Card>

        {/* Processing Metadata */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-2">Processing Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-700">Extraction Method:</span>
                  <span className="ml-2 text-blue-900">{processingResult.metadata.extractionMethod}</span>
                </div>
                <div>
                  <span className="text-blue-700">Word Count:</span>
                  <span className="ml-2 text-blue-900">{processingResult.metadata.wordCount}</span>
                </div>
                {processingResult.metadata.pageCount && (
                  <div>
                    <span className="text-blue-700">Pages:</span>
                    <span className="ml-2 text-blue-900">{processingResult.metadata.pageCount}</span>
                  </div>
                )}
                <div>
                  <span className="text-blue-700">File Size:</span>
                  <span className="ml-2 text-blue-900">{formatFileSize(processingResult.metadata.fileSize)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Card className="text-center" padding="lg">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm text-red-700">{error}</p>
              {error.includes('PDF') && (
                <p className="text-xs text-red-600 mt-1">
                  Tip: Try converting your PDF to a Word document if it contains scanned images.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-200
          ${isDragActive && !isDragReject
            ? 'border-blue-500 bg-blue-50' 
            : isDragReject
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${uploading ? 'pointer-events-none opacity-75' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {uploading ? (
            <>
              <div className="animate-spin mx-auto w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
              <div>
                <p className="text-lg font-medium text-gray-900">Processing your resume...</p>
                <p className="text-gray-500 mt-1">
                  {processingStage || 'Extracting text and validating content'}
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className={`mx-auto w-12 h-12 ${
                isDragActive && !isDragReject ? 'text-blue-500' : 
                isDragReject ? 'text-red-500' : 'text-gray-400'
              }`} />
              
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragReject 
                    ? 'Invalid file type' 
                    : isDragActive 
                    ? 'Drop your resume here' 
                    : 'Upload your resume'
                  }
                </p>
                <p className="text-gray-500 mt-1">
                  {isDragReject
                    ? 'Please select a PDF or DOCX file'
                    : isDragActive
                    ? 'Release to upload'
                    : 'Drag & drop your resume here, or click to browse'
                  }
                </p>
              </div>
            </>
          )}
          
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <File className="w-4 h-4" />
            <span>Supports PDF and DOCX files up to 10MB</span>
          </div>

          {/* Processing Features */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">What we'll do with your file:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <span className="text-green-500">✓</span>
                <span>Extract text content</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-green-500">✓</span>
                <span>Validate resume structure</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-green-500">✓</span>
                <span>Detect contact information</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-green-500">✓</span>
                <span>Prepare for AI analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};