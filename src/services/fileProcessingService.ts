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
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      const pageCount = pdf.numPages;

      // Extract text from all pages
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
      }

      return {
        text: fullText.trim(),
        pageCount
      };
    } catch (error: any) {
      console.error('PDF extraction error:', error);
      
      // Fallback to basic text extraction
      if (error.message?.includes('Invalid PDF')) {
        throw new Error('Invalid PDF file. Please ensure the file is not corrupted.');
      } else if (error.message?.includes('password')) {
        throw new Error('Password-protected PDFs are not supported. Please upload an unprotected version.');
      } else {
        throw new Error('Failed to extract text from PDF. The file may be corrupted or contain only images.');
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

      return result.value;
    } catch (error: any) {
      console.error('DOCX extraction error:', error);
      
      if (error.message?.includes('not a valid zip file')) {
        throw new Error('Invalid DOCX file. Please ensure the file is not corrupted.');
      } else {
        throw new Error('Failed to extract text from DOCX file. The file may be corrupted.');
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
      contact: /(?:email|phone|address|linkedin|github)/i,
      experience: /(?:experience|work|employment|job|position)/i,
      education: /(?:education|degree|university|college|school)/i,
      skills: /(?:skills|technologies|proficient|expertise)/i
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