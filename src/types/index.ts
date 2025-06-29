import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Package = Database['public']['Tables']['packages']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type ResumeTemplate = Database['public']['Tables']['resume_templates']['Row'];
export type ResumeAnalysis = Database['public']['Tables']['resume_analyses']['Row'];
export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row'];
export type PaymentTransaction = Database['public']['Tables']['payment_transactions']['Row'];

export interface User extends Profile {
  email: string;
  subscription?: Subscription & { package: Package };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: Partial<Profile>) => Promise<void>;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface PaymentData {
  amount: number;
  email: string;
  packageId: string;
  callback_url: string;
}

export interface AnalysisRequest {
  resumeText: string;
  jobDescription: string;
  templateId: string;
}

export interface AnalysisResponse {
  tailoredResume: string;
  suggestions: string[];
  atsScore: number;
  analysisData: Record<string, any>;
}