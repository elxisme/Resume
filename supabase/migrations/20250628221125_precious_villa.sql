/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The "Admins can read all profiles" policy creates infinite recursion
    - It queries the profiles table to check if user is admin, which triggers the same policy

  2. Solution
    - Drop the problematic admin policy that causes recursion
    - Keep the simple user policy that allows users to read their own profile
    - Admins can be handled at the application level if needed

  3. Security
    - Users can only read and update their own profile
    - This prevents the infinite recursion while maintaining security
*/

-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Keep the working policies
-- "Users can read own profile" - this one works fine
-- "Users can update own profile" - this one works fine

-- If admin functionality is needed, it should be handled at the application level
-- or through a different approach that doesn't create circular dependencies