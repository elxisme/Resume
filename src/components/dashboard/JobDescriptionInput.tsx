import React from 'react';
import { Card } from '../ui/Card';
import { Briefcase } from 'lucide-react';

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  value,
  onChange
}) => {
  return (
    <Card>
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Briefcase className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Job Description</h3>
        </div>
        <p className="text-gray-600 text-sm">
          Paste the job description you're applying for. Our AI will analyze it to tailor your resume.
        </p>
      </div>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the complete job description here including requirements, responsibilities, and qualifications..."
        className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
      />
    </Card>
  );
};