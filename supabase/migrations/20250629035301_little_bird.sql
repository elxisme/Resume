/*
  # Remove user_profiles table and fix RLS policies

  1. Changes
    - Drop user_profiles table completely
    - Remove churches table references
    - Fix RLS policies that referenced user_profiles
    - Update admin policies to use profiles table directly
    - Fix any functions that referenced user_profiles

  2. Security
    - Update admin policies to use profiles.is_admin
    - Ensure all RLS policies work with profiles table only
    - Remove any orphaned policies
*/

-- Drop user_profiles table if it exists
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop churches table if it exists  
DROP TABLE IF EXISTS churches CASCADE;

-- Drop any functions that might reference user_profiles
DROP FUNCTION IF EXISTS create_initial_admin() CASCADE;

-- Create a simple is_admin function that uses profiles table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Update RLS policies for packages table
DROP POLICY IF EXISTS "Admins can manage packages" ON packages;
CREATE POLICY "Admins can manage packages"
  ON packages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Update RLS policies for resume_templates table
DROP POLICY IF EXISTS "Admins can manage templates" ON resume_templates;
CREATE POLICY "Admins can manage templates"
  ON resume_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Update RLS policies for subscriptions table
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON subscriptions;
CREATE POLICY "Admins can read all subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Update RLS policies for resume_analyses table
DROP POLICY IF EXISTS "Admins can read all analyses" ON resume_analyses;
CREATE POLICY "Admins can read all analyses"
  ON resume_analyses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Update RLS policies for payment_transactions table
DROP POLICY IF EXISTS "Admins can read all transactions" ON payment_transactions;
CREATE POLICY "Admins can read all transactions"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Ensure profiles table has proper RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create a policy for admins to read all profiles (for admin dashboard)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() 
      AND p2.is_admin = true
    )
  );

-- Create a policy for admins to update any profile (for admin dashboard)
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() 
      AND p2.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() 
      AND p2.is_admin = true
    )
  );

-- Update the handle_new_user function to only create profiles record
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Check if this is the first user (make them admin)
  SELECT COUNT(*) INTO admin_count FROM auth.users;
  
  -- Insert into profiles table
  INSERT INTO profiles (
    id,
    first_name,
    last_name,
    is_admin
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
    CASE WHEN admin_count <= 1 THEN true ELSE false END
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create increment_usage function for usage tracking
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id uuid,
  p_action_type text,
  p_month_year text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usage_tracking 
  SET count = count + 1
  WHERE user_id = p_user_id 
    AND action_type = p_action_type 
    AND month_year = p_month_year;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;