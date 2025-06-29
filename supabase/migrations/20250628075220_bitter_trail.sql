/*
  # Seed Initial Data

  1. Default Packages
    - Free tier with basic features
    - Premium tier with full access

  2. Resume Templates
    - 5 professional ATS-friendly templates
    - Mix of free and premium templates

  3. Admin User
    - Create default admin account
*/

-- Insert default packages
INSERT INTO packages (name, description, price, features, template_access, analysis_limit) VALUES
(
  'Free',
  'Perfect for getting started with AI resume optimization',
  0.00,
  '["1 Resume Template", "5 AI Analyses per month", "Basic Support", "PDF Download"]',
  1,
  5
),
(
  'Premium',
  'Full access to all features and unlimited usage',
  19.99,
  '["All Resume Templates", "Unlimited AI Analyses", "Priority Support", "PDF & DOCX Downloads", "Advanced AI Features", "ATS Score Analysis"]',
  -1,
  -1
);

-- Insert resume templates
INSERT INTO resume_templates (name, description, category, is_premium, template_data) VALUES
(
  'Modern Professional',
  'Clean and contemporary design perfect for any industry',
  'modern',
  false,
  '{"layout": "single-column", "colors": {"primary": "#2563eb", "secondary": "#64748b"}, "fonts": {"heading": "Inter", "body": "Inter"}}'
),
(
  'Executive Classic',
  'Traditional format ideal for senior-level positions',
  'executive',
  true,
  '{"layout": "two-column", "colors": {"primary": "#1f2937", "secondary": "#6b7280"}, "fonts": {"heading": "Georgia", "body": "Georgia"}}'
),
(
  'Creative Designer',
  'Eye-catching design for creative professionals',
  'creative',
  true,
  '{"layout": "creative", "colors": {"primary": "#7c3aed", "secondary": "#a855f7"}, "fonts": {"heading": "Poppins", "body": "Open Sans"}}'
),
(
  'Tech Minimalist',
  'Clean, minimal design perfect for tech roles',
  'minimal',
  true,
  '{"layout": "minimal", "colors": {"primary": "#059669", "secondary": "#10b981"}, "fonts": {"heading": "JetBrains Mono", "body": "Inter"}}'
),
(
  'Corporate Professional',
  'Professional design for corporate environments',
  'classic',
  true,
  '{"layout": "traditional", "colors": {"primary": "#dc2626", "secondary": "#ef4444"}, "fonts": {"heading": "Times New Roman", "body": "Arial"}}'
);