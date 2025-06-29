export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Only PDF and DOCX files are allowed' };
  }

  return { isValid: true };
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
  // In a real implementation, you'd use a library like pdf-parse
  // For now, return mock content
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Extracted PDF content would appear here...');
    }, 1000);
  });
};

export const extractTextFromDOCX = async (file: File): Promise<string> => {
  // In a real implementation, you'd use a library like mammoth
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Extracted DOCX content would appear here...');
    }, 1000);
  });
};

export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};