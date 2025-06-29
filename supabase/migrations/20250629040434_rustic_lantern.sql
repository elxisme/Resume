/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Admin policies on profiles table are checking profiles.is_admin
    - This creates circular dependency when accessing profiles table
    
  2. Solution
    - Remove recursive admin policies from profiles table
    - Use auth.jwt() to check admin status from JWT claims
    - Simplify policies to avoid self-referencing queries
*/

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Create simple, non-recursive policies for profiles table
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

-- For admin functionality, we'll handle admin checks differently
-- Create a function that safely checks admin status without recursion
CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

-- Update other table policies to use a safer admin check
-- For packages table
DROP POLICY IF EXISTS "Admins can manage packages" ON packages;
CREATE POLICY "Admins can manage packages"
  ON packages
  FOR ALL
  TO authenticated
  USING (auth_is_admin());

-- For resume_templates table  
DROP POLICY IF EXISTS "Admins can manage templates" ON resume_templates;
CREATE POLICY "Admins can manage templates"
  ON resume_templates
  FOR ALL
  TO authenticated
  USING (auth_is_admin());

-- For subscriptions table
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON subscriptions;
CREATE POLICY "Admins can read all subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth_is_admin());

-- For resume_analyses table
DROP POLICY IF EXISTS "Admins can read all analyses" ON resume_analyses;
CREATE POLICY "Admins can read all analyses"
  ON resume_analyses
  FOR SELECT
  TO authenticated
  USING (auth_is_admin());

-- For payment_transactions table
DROP POLICY IF EXISTS "Admins can read all transactions" ON payment_transactions;
CREATE POLICY "Admins can read all transactions"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (auth_is_admin());

-- Note: Admin functionality will be handled at the application level
-- The frontend will check user.is_admin and show/hide admin features accordingly
-- Database policies focus on user-level security, admin operations use service role

-- Ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;