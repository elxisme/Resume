/*
  # Fix Database Errors - Missing Tables and Functions

  1. Missing Tables
    - `user_profiles` - Referenced in policies but doesn't exist
    - `churches` - Referenced in schema but missing from migrations

  2. Missing Functions
    - `is_admin()` - Referenced in policies
    - `handle_updated_at()` - Referenced in triggers
    - `create_initial_admin()` - Referenced in triggers

  3. Fix User Registration
    - Ensure proper profile creation on user signup
    - Fix RLS policies that may cause infinite recursion
*/

-- Create user_profiles table (referenced in policies but missing)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create churches table (referenced in schema)
CREATE TABLE IF NOT EXISTS churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  minister_name text NOT NULL,
  minister_phone text,
  contact_phone text NOT NULL,
  photo_url text DEFAULT 'https://images.pexels.com/photos/8468689/pexels-photo-8468689.jpeg?auto=compress&cs=tinysrgb&w=400',
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sunday_service_time text DEFAULT '9:00 AM'
);

-- Enable RLS on new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

-- Create missing functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_initial_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user
  IF NOT EXISTS (SELECT 1 FROM user_profiles LIMIT 1) THEN
    NEW.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS churches_city_idx ON churches(city);
CREATE INDEX IF NOT EXISTS churches_state_idx ON churches(state);
CREATE INDEX IF NOT EXISTS churches_status_idx ON churches(status);
CREATE INDEX IF NOT EXISTS churches_created_by_idx ON churches(created_by);
CREATE INDEX IF NOT EXISTS churches_name_idx ON churches USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS user_profiles_email_key ON user_profiles(email);

-- Add unique constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_email_key' 
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create RLS policies for churches
DROP POLICY IF EXISTS "Users can read approved churches" ON churches;
DROP POLICY IF EXISTS "Users can read own submissions" ON churches;
DROP POLICY IF EXISTS "Users can insert churches" ON churches;
DROP POLICY IF EXISTS "Users can update own submissions" ON churches;
DROP POLICY IF EXISTS "Admins can read all churches" ON churches;
DROP POLICY IF EXISTS "Admins can update all churches" ON churches;
DROP POLICY IF EXISTS "Admins can delete churches" ON churches;

CREATE POLICY "Users can read approved churches"
  ON churches FOR SELECT
  TO authenticated
  USING (status = 'approved');

CREATE POLICY "Users can read own submissions"
  ON churches FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert churches"
  ON churches FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own submissions"
  ON churches FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can read all churches"
  ON churches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all churches"
  ON churches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete churches"
  ON churches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS churches_updated_at ON churches;
DROP TRIGGER IF EXISTS create_initial_admin_trigger ON user_profiles;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER churches_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER create_initial_admin_trigger
  BEFORE INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION create_initial_admin();

-- Fix the user registration function to create both profiles and user_profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, first_name, last_name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    false
  );

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      ),
      'User'
    ),
    'member',
    'approved'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create demo users if they don't exist (for testing)
DO $$
DECLARE
  demo_user_id uuid;
  premium_user_id uuid;
  admin_user_id uuid;
BEGIN
  -- Check if demo users already exist in auth.users
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1;
  SELECT id INTO premium_user_id FROM auth.users WHERE email = 'premium@example.com' LIMIT 1;
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1;

  -- Create demo user profile if user exists but profile doesn't
  IF demo_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = demo_user_id) THEN
    INSERT INTO profiles (id, first_name, last_name, is_admin)
    VALUES (demo_user_id, 'Demo', 'User', false);
    
    INSERT INTO user_profiles (id, email, full_name, role, status)
    VALUES (demo_user_id, 'demo@example.com', 'Demo User', 'member', 'approved')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Create premium user profile if user exists but profile doesn't
  IF premium_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = premium_user_id) THEN
    INSERT INTO profiles (id, first_name, last_name, is_admin)
    VALUES (premium_user_id, 'Premium', 'User', false);
    
    INSERT INTO user_profiles (id, email, full_name, role, status)
    VALUES (premium_user_id, 'premium@example.com', 'Premium User', 'member', 'approved')
    ON CONFLICT (id) DO NOTHING;

    -- Create premium subscription
    INSERT INTO subscriptions (user_id, package_id, status, start_date, end_date)
    SELECT premium_user_id, id, 'active', now(), now() + interval '30 days'
    FROM packages WHERE name = 'Premium' LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create admin user profile if user exists but profile doesn't
  IF admin_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_user_id) THEN
    INSERT INTO profiles (id, first_name, last_name, is_admin)
    VALUES (admin_user_id, 'Admin', 'User', true);
    
    INSERT INTO user_profiles (id, email, full_name, role, status)
    VALUES (admin_user_id, 'admin@example.com', 'Admin User', 'admin', 'approved')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;