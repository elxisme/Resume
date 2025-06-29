/*
  # Fix user signup database error

  1. Database Function
    - Create `handle_new_user()` function that automatically creates a profile record
    - Function extracts first_name and last_name from user metadata
    - Uses SECURITY DEFINER to bypass RLS during profile creation

  2. Database Trigger
    - Create trigger on `auth.users` table
    - Executes after each new user insert
    - Calls the `handle_new_user()` function

  3. Security
    - Function runs with elevated privileges to insert into profiles table
    - Maintains existing RLS policies for normal operations
*/

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();