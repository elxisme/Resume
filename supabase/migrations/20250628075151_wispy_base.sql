/*
  # Initial Database Schema for AI Resume Platform

  1. New Tables
    - `profiles` - Extended user profiles with subscription info
    - `packages` - Subscription packages with pricing and features
    - `subscriptions` - User subscriptions to packages
    - `resume_templates` - Available resume templates
    - `resume_analyses` - AI analysis results and tailored resumes
    - `usage_tracking` - Track user usage for limits
    - `payment_transactions` - Payment history and records

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Admin-only policies for management tables
*/

-- Create custom types
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'pending');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE template_category AS ENUM ('modern', 'classic', 'creative', 'minimal', 'executive');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  is_admin boolean DEFAULT false,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Packages table
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  duration_days integer NOT NULL DEFAULT 30,
  features jsonb NOT NULL DEFAULT '[]',
  template_access integer NOT NULL DEFAULT 1, -- -1 means unlimited
  analysis_limit integer NOT NULL DEFAULT 5, -- -1 means unlimited
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES packages(id),
  status subscription_status DEFAULT 'pending',
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  auto_renew boolean DEFAULT true,
  paystack_subscription_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Resume templates table
CREATE TABLE IF NOT EXISTS resume_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category template_category NOT NULL,
  preview_url text,
  template_data jsonb NOT NULL DEFAULT '{}',
  is_premium boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Resume analyses table
CREATE TABLE IF NOT EXISTS resume_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  original_resume_text text NOT NULL,
  job_description text NOT NULL,
  tailored_resume_text text,
  template_id uuid REFERENCES resume_templates(id),
  suggestions jsonb DEFAULT '[]',
  ats_score integer,
  analysis_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'analysis', 'download', etc.
  month_year text NOT NULL, -- 'YYYY-MM' format
  count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, action_type, month_year)
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id),
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status payment_status DEFAULT 'pending',
  paystack_reference text UNIQUE,
  paystack_transaction_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Packages policies
CREATE POLICY "Anyone can read active packages"
  ON packages FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage packages"
  ON packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Subscriptions policies
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Resume templates policies
CREATE POLICY "Anyone can read active templates"
  ON resume_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON resume_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Resume analyses policies
CREATE POLICY "Users can read own analyses"
  ON resume_analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own analyses"
  ON resume_analyses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all analyses"
  ON resume_analyses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Usage tracking policies
CREATE POLICY "Users can read own usage"
  ON usage_tracking FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own usage"
  ON usage_tracking FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own usage"
  ON usage_tracking FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Payment transactions policies
CREATE POLICY "Users can read own transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();