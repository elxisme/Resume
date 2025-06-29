import { validateFile } from '../utils/fileUtils';

export interface FileProcessingResult {
  text: string;
  metadata: {
    fileName: string;
    fileSize: number;
    fileType: string;
    pageCount?: number;
    wordCount: number;
    extractionMethod: string;
  };
}

export class FileProcessingService {
  static async processFile(file: File): Promise<FileProcessingResult> {
    // Validate file first
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    let extractedText: string;
    let extractionMethod: string;
    let pageCount: number | undefined;

    try {
      if (file.type === 'application/pdf') {
        const result = await this.extractTextFromPDF(file);
        extractedText = result.text;
        pageCount = result.pageCount;
        extractionMethod = 'PDF.js';
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        extractedText = await this.extractTextFromDOCX(file);
        extractionMethod = 'Mammoth.js';
      } else {
        throw new Error('Unsupported file type');
      }

      // Clean and validate extracted text
      const cleanedText = this.cleanExtractedText(extractedText);
      
      if (!cleanedText || cleanedText.trim().length < 50) {
        throw new Error('Insufficient text content extracted. Please ensure your resume contains readable text.');
      }

      const wordCount = this.countWords(cleanedText);

      return {
        text: cleanedText,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          pageCount,
          wordCount,
          extractionMethod
        }
      };
    } catch (error: any) {
      console.error('File processing error:', error);
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  private static async extractTextFromPDF(file: File): Promise<{ text: string; pageCount: number }> {
    try {
      // Dynamic import to avoid bundling issues
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source with fallback options
      const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      }

      const arrayBuffer = await file.arrayBuffer();
      
      // Configure PDF.js with better error handling
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Reduce console noise
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
        useSystemFonts: true,
        disableFontFace: false,
        disableRange: false,
        disableStream: false,
        disableAutoFetch: false,
        pdfBug: false
      });

      const pdf = await loadingTask.promise;
      
      let fullText = '';
      const pageCount = pdf.numPages;
      let successfulPages = 0;

      // Extract text from all pages with individual error handling
      for (let i = 1; i <= pageCount; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false
          });
          
          const pageText = textContent.items
            .filter((item: any) => item.str && item.str.trim())
            .map((item: any) => item.str)
            .join(' ');
          
          if (pageText.trim()) {
            fullText += pageText + '\n';
            successfulPages++;
          }
        } catch (pageError) {
          console.warn(`Error extracting text from page ${i}:`, pageError);
          // Continue with other pages
        }
      }

      // Clean up PDF resources
      await pdf.destroy();

      if (successfulPages === 0) {
        throw new Error('No readable text found in PDF. The document may contain only images or scanned content.');
      }

      if (fullText.trim().length < 50) {
        throw new Error('Very little text extracted from PDF. The document may be primarily image-based or have formatting issues.');
      }

      return {
        text: fullText.trim(),
        pageCount
      };
    } catch (error: any) {
      console.error('PDF extraction error:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('Invalid PDF')) {
        throw new Error('Invalid PDF file. Please ensure the file is not corrupted and is a valid PDF document.');
      } else if (error.message?.includes('password')) {
        throw new Error('Password-protected PDFs are not supported. Please upload an unprotected version.');
      } else if (error.message?.includes('No readable text found')) {
        throw new Error('This PDF appears to contain only images or scanned content. Please upload a PDF with selectable text or convert it using OCR software first.');
      } else if (error.message?.includes('Very little text extracted')) {
        throw new Error('Unable to extract sufficient text from this PDF. Please ensure it contains readable text content, not just images.');
      } else if (error.message?.includes('Loading')) {
        throw new Error('Failed to load PDF file. The file may be corrupted or too large.');
      } else if (error.name === 'UnexpectedResponseException') {
        throw new Error('PDF processing failed due to network issues. Please try again.');
      } else {
        throw new Error('Failed to extract text from PDF. The file may be corrupted, contain only images, or have an unsupported format. Please try uploading a different PDF or convert it to a text-based format.');
      }
    }
  }

  private static async extractTextFromDOCX(file: File): Promise<string> {
    try {
      // Dynamic import to avoid bundling issues
      const mammoth = await import('mammoth');
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages && result.messages.length > 0) {
        console.warn('DOCX extraction warnings:', result.messages);
      }

      if (!result.value || result.value.trim().length < 50) {
        throw new Error('Very little text extracted from DOCX. The document may be empty or contain primarily non-text content.');
      }

      return result.value;
    } catch (error: any) {
      console.error('DOCX extraction error:', error);
      
      if (error.message?.includes('not a valid zip file')) {
        throw new Error('Invalid DOCX file. Please ensure the file is not corrupted and is a valid Word document.');
      } else if (error.message?.includes('Very little text extracted')) {
        throw new Error('Unable to extract sufficient text from this DOCX file. Please ensure it contains readable content.');
      } else {
        throw new Error('Failed to extract text from DOCX file. The file may be corrupted or in an unsupported format.');
      }
    }
  }

  private static cleanExtractedText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might interfere with processing
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove multiple consecutive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Remove common PDF artifacts
      .replace(/\f/g, '\n') // Form feed characters
      .replace(/\u00A0/g, ' ') // Non-breaking spaces
      // Trim whitespace
      .trim();
  }

  private static countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  static async validateResumeContent(text: string): Promise<{ isValid: boolean; suggestions: string[] }> {
    const suggestions: string[] = [];
    let isValid = true;

    // Check for essential resume sections
    const sections = {
      contact: /(?:email|phone|address|linkedin|github|contact)/i,
      experience: /(?:experience|work|employment|job|position|career)/i,
      education: /(?:education|degree|university|college|school|academic)/i,
      skills: /(?:skills|technologies|proficient|expertise|competencies)/i
    };

    Object.entries(sections).forEach(([section, regex]) => {
      if (!regex.test(text)) {
        suggestions.push(`Consider adding a ${section} section to your resume`);
      }
    });

    // Check word count
    const wordCount = this.countWords(text);
    if (wordCount < 100) {
      isValid = false;
      suggestions.push('Resume appears too short. Consider adding more details about your experience and skills.');
    } else if (wordCount > 1000) {
      suggestions.push('Resume is quite long. Consider condensing to 1-2 pages for better readability.');
    }

    // Check for common issues
    if (!/\b\d{4}\b/.test(text)) {
      suggestions.push('Consider adding dates to your experience and education sections.');
    }

    if (!/(?:@|email)/i.test(text)) {
      suggestions.push('Make sure to include your email address for contact purposes.');
    }

    // Check for potential OCR or extraction issues
    if (text.includes('�') || /[^\x00-\x7F]{10,}/.test(text)) {
      suggestions.push('Some characters may not have been extracted correctly. Please review the content.');
    }

    return { isValid, suggestions };
  }

  static generatePreview(text: string, maxLength: number = 500): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  }

  static detectLanguage(text: string): string {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().split(/\s+/);
    
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    const englishRatio = englishWordCount / Math.min(words.length, 100);
    
    return englishRatio > 0.1 ? 'en' : 'unknown';
  }

  static extractContactInfo(text: string): {
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
  } {
    const contactInfo: any = {};

    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      contactInfo.email = emailMatch[0];
    }

    // Extract phone number
    const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
    if (phoneMatch) {
      contactInfo.phone = phoneMatch[0];
    }

    // Extract LinkedIn
    const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)[A-Za-z0-9-]+/i);
    if (linkedinMatch) {
      contactInfo.linkedin = linkedinMatch[0];
    }

    // Extract GitHub
    const githubMatch = text.match(/(?:github\.com\/)[A-Za-z0-9-]+/i);
    if (githubMatch) {
      contactInfo.github = githubMatch[0];
    }

    return contactInfo;
  }
}