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

export const generatePDF = async (
  resumeText: string, 
  templateData: any, 
  templateCategory: string = 'modern',
  filename: string = 'resume.pdf'
) => {
  try {
    // Dynamic imports to reduce initial bundle size
    const [
      { default: jsPDF },
      { default: html2canvas },
      { createRoot }
    ] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
      import('react-dom/client')
    ]);

    // Dynamically import the ResumeDocument component
    const { ResumeDocument } = await import('../components/resume/ResumeDocument');
    const React = await import('react');

    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '8.5in';
    container.style.backgroundColor = '#ffffff';
    document.body.appendChild(container);

    try {
      // Render the React component
      const root = createRoot(container);
      
      await new Promise<void>((resolve) => {
        root.render(
          React.createElement(ResumeDocument, {
            resumeText,
            templateData,
            templateCategory
          })
        );
        
        // Wait for rendering to complete
        setTimeout(resolve, 1000);
      });

      // Capture the rendered content as canvas
      const canvas = await html2canvas(container, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 816, // 8.5 inches at 96 DPI
        height: 1056, // 11 inches at 96 DPI
        scrollX: 0,
        scrollY: 0
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      });

      // Calculate dimensions
      const imgWidth = 8.5;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // If content is longer than one page, we might need to split it
      if (imgHeight > 11) {
        // For now, we'll scale it to fit one page
        // In a more advanced implementation, we could split into multiple pages
        const scaledHeight = 10.5; // Leave some margin
        pdf.addImage(imgData, 'PNG', 0.25, 0.25, imgWidth - 0.5, scaledHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 0.25, 0.25, imgWidth - 0.5, imgHeight);
      }

      // Clean up
      root.unmount();
      document.body.removeChild(container);

      // Save the PDF
      pdf.save(filename);
      
    } catch (renderError) {
      // Clean up on error
      document.body.removeChild(container);
      throw renderError;
    }

  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

// Remove the old generateDOCX function as it doesn't provide proper formatting
// We'll focus on high-quality PDF generation instead