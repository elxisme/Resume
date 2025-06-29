-- First, let's create a policy that allows inserting profiles during user creation
CREATE POLICY "Allow profile creation during registration"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_count integer;
  user_email text;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  
  -- Check if this is the first user (make them admin)
  SELECT COUNT(*) INTO admin_count FROM auth.users;
  
  -- Insert into profiles table with better error handling
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
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create profiles for any existing users who don't have them
INSERT INTO profiles (id, first_name, last_name, is_admin)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'first_name', 'User') as first_name,
  COALESCE(au.raw_user_meta_data->>'last_name', 'Name') as last_name,
  false as is_admin
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Make the first user an admin if no admin exists
UPDATE profiles 
SET is_admin = true 
WHERE id = (
  SELECT id FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 1
) 
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE is_admin = true
);

-- Create some sample data for testing
DO $$
DECLARE
  sample_package_id uuid;
  sample_template_id uuid;
BEGIN
  -- Insert sample packages if they don't exist (fixing the JSONB array issue)
  INSERT INTO packages (name, description, price, features, template_access, analysis_limit)
  VALUES 
    ('Free Plan', 'Basic resume analysis and templates', 0, 
     '["1 Resume Template", "5 AI Analyses per month", "Basic Support", "PDF Download"]'::jsonb, 
     1, 5),
    ('Premium Plan', 'Unlimited access to all features', 19.99, 
     '["All Resume Templates", "Unlimited AI Analyses", "Priority Support", "PDF & DOCX Downloads", "Advanced AI Features", "ATS Score Analysis"]'::jsonb, 
     -1, -1)
  ON CONFLICT (name) DO NOTHING;

  -- Insert sample resume templates if they don't exist
  INSERT INTO resume_templates (name, description, category, is_premium, template_data)
  VALUES 
    ('Modern Professional', 'Clean and modern design perfect for tech roles', 'modern', false, '{"layout": "modern", "colors": ["#2563eb", "#1f2937"]}'),
    ('Executive Classic', 'Traditional format ideal for senior positions', 'executive', true, '{"layout": "classic", "colors": ["#1f2937", "#374151"]}'),
    ('Creative Designer', 'Eye-catching design for creative professionals', 'creative', true, '{"layout": "creative", "colors": ["#7c3aed", "#ec4899"]}'),
    ('Minimalist Clean', 'Simple and elegant design', 'minimal', false, '{"layout": "minimal", "colors": ["#000000", "#6b7280"]}')
  ON CONFLICT (name) DO NOTHING;

END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;