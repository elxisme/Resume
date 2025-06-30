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
    // Dynamic imports to reduce initial bundle size and improve cross-browser compatibility
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

    // Create a temporary container with better cross-browser support
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 8.5in;
      background-color: #ffffff;
      font-family: Arial, sans-serif;
      visibility: hidden;
      pointer-events: none;
    `;
    document.body.appendChild(container);

    try {
      // Render the React component
      const root = createRoot(container);
      
      await new Promise<void>((resolve, reject) => {
        try {
          root.render(
            React.createElement(ResumeDocument, {
              resumeText,
              templateData,
              templateCategory
            })
          );
          
          // Wait for rendering to complete with timeout for better reliability
          const timeoutId = setTimeout(() => {
            reject(new Error('Rendering timeout'));
          }, 10000); // 10 second timeout
          
          setTimeout(() => {
            clearTimeout(timeoutId);
            resolve();
          }, 1500); // Increased wait time for better cross-browser compatibility
        } catch (error) {
          reject(error);
        }
      });

      // Capture the rendered content as canvas with enhanced options for cross-browser compatibility
      const canvas = await html2canvas(container, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: false, // Better security
        backgroundColor: '#ffffff',
        width: 816, // 8.5 inches at 96 DPI
        height: 1056, // 11 inches at 96 DPI
        scrollX: 0,
        scrollY: 0,
        windowWidth: 816,
        windowHeight: 1056,
        ignoreElements: (element) => {
          // Ignore elements that might cause issues in some browsers
          return element.tagName === 'SCRIPT' || element.tagName === 'STYLE';
        }
      });

      // Create PDF with better error handling
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
        compress: true
      });

      // Calculate dimensions
      const imgWidth = 8.5;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF
      const imgData = canvas.toDataURL('image/png', 0.95); // Slightly compressed for better performance
      
      // If content is longer than one page, scale it to fit
      if (imgHeight > 11) {
        const scaledHeight = 10.5; // Leave some margin
        pdf.addImage(imgData, 'PNG', 0.25, 0.25, imgWidth - 0.5, scaledHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 0.25, 0.25, imgWidth - 0.5, imgHeight);
      }

      // Clean up
      root.unmount();
      document.body.removeChild(container);

      // Save the PDF with better cross-browser support
      try {
        pdf.save(filename);
      } catch (saveError) {
        // Fallback for browsers that don't support direct save
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
    } catch (renderError) {
      // Clean up on error
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      throw renderError;
    }

  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Provide more specific error messages for different browsers
    let errorMessage = 'Failed to generate PDF. ';
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage += 'The process took too long. Please try again.';
      } else if (error.message.includes('canvas')) {
        errorMessage += 'Unable to render the resume. Please try a different browser.';
      } else if (error.message.includes('memory')) {
        errorMessage += 'Insufficient memory. Please close other tabs and try again.';
      } else {
        errorMessage += 'Please try again or use a different browser.';
      }
    } else {
      errorMessage += 'Please try again or use a different browser.';
    }
    
    throw new Error(errorMessage);
  }
};