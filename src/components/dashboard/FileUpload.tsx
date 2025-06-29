import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  selectedFile,
  onClearFile
}) => {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploading(true);
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      onFileSelect(acceptedFiles[0]);
      setUploading(false);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    multiple: false
  });

  if (selectedFile) {
    return (
      <Card className="text-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClearFile}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="text-center" padding="lg">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {uploading ? (
            <div className="animate-spin mx-auto w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
          ) : (
            <Upload className={`mx-auto w-12 h-12 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          )}
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {uploading ? 'Uploading...' : 'Upload your resume'}
            </p>
            <p className="text-gray-500 mt-1">
              {isDragActive
                ? 'Drop your file here'
                : 'Drag & drop your resume here, or click to browse'
              }
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <File className="w-4 h-4" />
            <span>Supports PDF and DOCX files up to 10MB</span>
          </div>
        </div>
      </div>
    </Card>
  );
};