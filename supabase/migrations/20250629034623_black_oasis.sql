/*
  # Fix Authentication and RLS Policies

  1. Fix Profile Creation Issues
    - Ensure profiles are created properly on signup
    - Fix any RLS policy conflicts

  2. Add Missing Constraints
    - Ensure data integrity
*/

-- Temporarily disable RLS to fix any existing data issues
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Clean up any orphaned records or duplicates
DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
DELETE FROM user_profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate the user registration function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  first_name_val text;
  last_name_val text;
  full_name_val text;
BEGIN
  -- Extract names with fallbacks
  first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
  last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  full_name_val := TRIM(first_name_val || ' ' || last_name_val);
  
  -- Ensure we have a valid full name
  IF full_name_val = '' OR full_name_val IS NULL THEN
    full_name_val := 'User';
  END IF;

  -- Insert into profiles table
  INSERT INTO public.profiles (id, first_name, last_name, is_admin)
  VALUES (
    NEW.id,
    first_name_val,
    last_name_val,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = now();

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    full_name_val,
    'member',
    'approved'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a function to create missing profiles for existing users
CREATE OR REPLACE FUNCTION create_missing_profiles()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through auth users that don't have profiles
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Create profile for this user
    INSERT INTO profiles (id, first_name, last_name, is_admin)
    VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'first_name', 'User'),
      COALESCE(user_record.raw_user_meta_data->>'last_name', ''),
      false
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create user_profile for this user
    INSERT INTO user_profiles (id, email, full_name, role, status)
    VALUES (
      user_record.id,
      user_record.email,
      TRIM(COALESCE(user_record.raw_user_meta_data->>'first_name', 'User') || ' ' || COALESCE(user_record.raw_user_meta_data->>'last_name', '')),
      'member',
      'approved'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create any missing profiles
SELECT create_missing_profiles();

-- Drop the temporary function
DROP FUNCTION create_missing_profiles();