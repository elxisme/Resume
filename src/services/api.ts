// Mock API service - replace with actual API calls in production

export const api = {
  // Authentication
  async login(email: string, password: string) {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      user: {
        id: '1',
        email,
        firstName: 'Demo',
        lastName: 'User',
        isAdmin: email === 'admin@example.com',
        subscription: email.includes('premium') ? {
          id: '1',
          userId: '1',
          packageId: '1',
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          autoRenew: true,
        } : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: 'mock-jwt-token'
    };
  },

  // Resume Analysis
  async analyzeResume(resumeFile: File, jobDescription: string, templateId: string) {
    // Mock OpenAI API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return {
      tailoredResume: 'AI-tailored resume content based on job description...',
      suggestions: [
        'Added relevant keywords from job description',
        'Highlighted matching skills and experience',
        'Optimized for ATS compatibility',
        'Improved formatting and structure'
      ],
      atsScore: Math.floor(Math.random() * 20) + 80
    };
  },

  // File Processing
  async extractTextFromFile(file: File): Promise<string> {
    // Mock file processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'Extracted resume text content...';
  },

  // Payment Processing
  async initializePayment(packageId: string, amount: number) {
    // Mock Paystack initialization
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      authorization_url: 'https://checkout.paystack.com/mock',
      access_code: 'mock-access-code',
      reference: 'mock-reference'
    };
  },

  async verifyPayment(reference: string) {
    // Mock payment verification
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      status: 'success',
      data: {
        status: 'success',
        reference,
        amount: 1999,
        currency: 'USD'
      }
    };
  },

  // Template Management
  async getTemplates() {
    return [
      {
        id: '1',
        name: 'Modern Professional',
        description: 'Clean and contemporary design',
        previewUrl: '/templates/modern-professional.jpg',
        isPremium: false,
        category: 'modern'
      },
      {
        id: '2',
        name: 'Executive Classic',
        description: 'Traditional format for senior roles',
        previewUrl: '/templates/executive-classic.jpg',
        isPremium: true,
        category: 'executive'
      },
      // Add more templates...
    ];
  },

  // Subscription Packages
  async getPackages() {
    return [
      {
        id: '1',
        name: 'Free',
        description: 'Basic features to get started',
        price: 0,
        currency: 'USD',
        duration: 30,
        features: ['1 Template Access', '5 Analyses per month', 'Basic Support'],
        templateAccess: 1,
        analysisLimit: 5,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Premium',
        description: 'Full access to all features',
        price: 19.99,
        currency: 'USD',
        duration: 30,
        features: ['All Template Access', 'Unlimited Analyses', 'Priority Support', 'Advanced AI Features'],
        templateAccess: -1, // -1 means unlimited
        analysisLimit: -1,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }
};