export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          is_admin: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          is_admin?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          is_admin?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      packages: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          currency: string;
          duration_days: number;
          features: string[];
          template_access: number;
          analysis_limit: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          price?: number;
          currency?: string;
          duration_days?: number;
          features?: string[];
          template_access?: number;
          analysis_limit?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          currency?: string;
          duration_days?: number;
          features?: string[];
          template_access?: number;
          analysis_limit?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          package_id: string;
          status: 'active' | 'cancelled' | 'expired' | 'pending';
          start_date: string;
          end_date: string | null;
          auto_renew: boolean;
          paystack_subscription_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          package_id: string;
          status?: 'active' | 'cancelled' | 'expired' | 'pending';
          start_date?: string;
          end_date?: string | null;
          auto_renew?: boolean;
          paystack_subscription_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          package_id?: string;
          status?: 'active' | 'cancelled' | 'expired' | 'pending';
          start_date?: string;
          end_date?: string | null;
          auto_renew?: boolean;
          paystack_subscription_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      resume_templates: {
        Row: {
          id: string;
          name: string;
          description: string;
          category: 'modern' | 'classic' | 'creative' | 'minimal' | 'executive';
          preview_url: string | null;
          template_data: Record<string, any>;
          is_premium: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          category: 'modern' | 'classic' | 'creative' | 'minimal' | 'executive';
          preview_url?: string | null;
          template_data?: Record<string, any>;
          is_premium?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          category?: 'modern' | 'classic' | 'creative' | 'minimal' | 'executive';
          preview_url?: string | null;
          template_data?: Record<string, any>;
          is_premium?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      resume_analyses: {
        Row: {
          id: string;
          user_id: string;
          original_resume_text: string;
          job_description: string;
          tailored_resume_text: string | null;
          template_id: string | null;
          suggestions: string[];
          ats_score: number | null;
          analysis_data: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          original_resume_text: string;
          job_description: string;
          tailored_resume_text?: string | null;
          template_id?: string | null;
          suggestions?: string[];
          ats_score?: number | null;
          analysis_data?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          original_resume_text?: string;
          job_description?: string;
          tailored_resume_text?: string | null;
          template_id?: string | null;
          suggestions?: string[];
          ats_score?: number | null;
          analysis_data?: Record<string, any>;
          created_at?: string;
        };
      };
      usage_tracking: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          month_year: string;
          count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          month_year: string;
          count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          month_year?: string;
          count?: number;
          created_at?: string;
        };
      };
      payment_transactions: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string | null;
          amount: number;
          currency: string;
          status: 'pending' | 'completed' | 'failed' | 'refunded';
          paystack_reference: string | null;
          paystack_transaction_id: string | null;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id?: string | null;
          amount: number;
          currency?: string;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          paystack_reference?: string | null;
          paystack_transaction_id?: string | null;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string | null;
          amount?: number;
          currency?: string;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          paystack_reference?: string | null;
          paystack_transaction_id?: string | null;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      subscription_status: 'active' | 'cancelled' | 'expired' | 'pending';
      payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
      template_category: 'modern' | 'classic' | 'creative' | 'minimal' | 'executive';
    };
  };
}