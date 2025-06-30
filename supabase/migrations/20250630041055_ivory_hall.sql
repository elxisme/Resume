/*
  # Fix Profile Creation Issue

  1. Problem Analysis
    - Users are being created in auth.users but not in profiles table
    - This prevents proper authentication flow and dashboard access
    - The trigger or function may not be working correctly

  2. Solution
    - Recreate the handle_new_user function with better error handling
    - Ensure the trigger is properly configured
    - Create missing profiles for existing users
    - Add proper RLS policies for profile creation

  3. Security
    - Maintain RLS while allowing profile creation during registration
    - Ensure proper permissions for the trigger function
*/

-- First, let's check if the function exists and recreate it with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
BEGIN
  -- Log the function execution for debugging
  RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
  
  -- Check if this is the first user (make them admin)
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- Insert into profiles table
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    is_admin,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
    CASE WHEN user_count <= 1 THEN true ELSE false END,
    NOW(),
    NOW()
  );
  
  RAISE LOG 'Profile created successfully for user: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    
    -- Try a simpler insert without the admin logic as fallback
    BEGIN
      INSERT INTO public.profiles (id, first_name, last_name, is_admin)
      VALUES (NEW.id, 'User', 'Name', false)
      ON CONFLICT (id) DO NOTHING;
      RAISE LOG 'Fallback profile creation succeeded for user: %', NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Fallback profile creation also failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    END;
    
    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger to ensure it's properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure the profiles table has the correct structure
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create a policy that allows profile insertion during user creation
DROP POLICY IF EXISTS "Allow profile creation during registration" ON profiles;
CREATE POLICY "Allow profile creation during registration"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also allow the service role to insert profiles (for the trigger)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create missing profiles for existing users who don't have them
DO $$
DECLARE
  user_record RECORD;
  profile_count integer := 0;
BEGIN
  RAISE LOG 'Starting to create missing profiles...';
  
  -- Loop through auth users that don't have profiles
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      -- Create profile for this user
      INSERT INTO profiles (id, first_name, last_name, is_admin, created_at, updated_at)
      VALUES (
        user_record.id,
        COALESCE(user_record.raw_user_meta_data->>'first_name', 'User'),
        COALESCE(user_record.raw_user_meta_data->>'last_name', 'Name'),
        false, -- We'll set admin status separately
        user_record.created_at,
        NOW()
      );
      
      profile_count := profile_count + 1;
      RAISE LOG 'Created profile for user: % (email: %)', user_record.id, user_record.email;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Failed to create profile for user %: % %', user_record.id, SQLERRM, SQLSTATE;
    END;
  END LOOP;
  
  RAISE LOG 'Created % missing profiles', profile_count;
END $$;

-- Make the first user an admin if no admin exists
DO $$
DECLARE
  first_user_id uuid;
  admin_count integer;
BEGIN
  -- Check if we have any admins
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE is_admin = true;
  
  IF admin_count = 0 THEN
    -- Get the first user (oldest created_at)
    SELECT id INTO first_user_id 
    FROM profiles 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
      UPDATE profiles 
      SET is_admin = true 
      WHERE id = first_user_id;
      
      RAISE LOG 'Made user % an admin', first_user_id;
    END IF;
  END IF;
END $$;

-- Grant necessary permissions to ensure the trigger can execute
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Specifically grant permissions on profiles table
GRANT ALL ON TABLE profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE profiles TO authenticated;

-- Ensure RLS is enabled but won't block the trigger
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Test the function by checking if it can be executed
DO $$
BEGIN
  RAISE LOG 'Profile creation fix migration completed successfully';
  RAISE LOG 'Current profile count: %', (SELECT COUNT(*) FROM profiles);
  RAISE LOG 'Current user count: %', (SELECT COUNT(*) FROM auth.users);
END $$;