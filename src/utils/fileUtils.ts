export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  // Check file size
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Only PDF and DOCX files are allowed' };
  }

  // Check file name for security
  const fileName = file.name.toLowerCase();
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { isValid: false, error: 'Invalid file name' };
  }

  // Check for minimum file size (empty files)
  if (file.size < 100) {
    return { isValid: false, error: 'File appears to be empty or corrupted' };
  }

  return { isValid: true };
};

export const getFileIcon = (fileType: string): string => {
  switch (fileType) {
    case 'application/pdf':
      return '📄';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '📝';
    default:
      return '📄';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const downloadTextFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadHtmlFile = (content: string, filename: string) => {
  // Add basic HTML structure if not present
  const htmlContent = content.includes('<!DOCTYPE html>') ? content : `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resume</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1f2937; margin-top: 30px; margin-bottom: 15px; }
        h3 { color: #374151; margin-top: 20px; margin-bottom: 10px; }
        ul { padding-left: 20px; }
        li { margin-bottom: 5px; }
        strong { color: #1f2937; }
        em { color: #6b7280; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 30px 0; }
        @media print {
            body { margin: 0; padding: 15px; }
            h1 { page-break-after: avoid; }
        }
    </style>
</head>
<body>
${content}
</body>
</html>`;

  downloadTextFile(htmlContent, filename, 'text/html');
};