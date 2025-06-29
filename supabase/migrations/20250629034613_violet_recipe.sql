/*
  # Add Missing RPC Functions

  1. RPC Functions
    - `increment_usage` - For tracking user usage
    - Helper functions for admin dashboard
*/

-- Create increment_usage function (referenced in code but missing)
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id uuid,
  p_action_type text,
  p_month_year text
)
RETURNS void AS $$
BEGIN
  UPDATE usage_tracking 
  SET count = count + 1
  WHERE user_id = p_user_id 
    AND action_type = p_action_type 
    AND month_year = p_month_year;
    
  -- If no rows were updated, the record doesn't exist
  IF NOT FOUND THEN
    INSERT INTO usage_tracking (user_id, action_type, month_year, count)
    VALUES (p_user_id, p_action_type, p_month_year, 1)
    ON CONFLICT (user_id, action_type, month_year) 
    DO UPDATE SET count = usage_tracking.count + 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE(
  total_users bigint,
  active_subscriptions bigint,
  total_analyses bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM profiles)::bigint as total_users,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active')::bigint as active_subscriptions,
    (SELECT COUNT(*) FROM resume_analyses)::bigint as total_analyses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get monthly revenue
CREATE OR REPLACE FUNCTION get_monthly_revenue(start_date timestamptz, end_date timestamptz)
RETURNS numeric AS $$
DECLARE
  revenue numeric := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO revenue
  FROM payment_transactions
  WHERE status = 'completed'
    AND created_at >= start_date
    AND created_at <= end_date;
    
  RETURN revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to safely check admin status without recursion
CREATE OR REPLACE FUNCTION check_admin_status(user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean := false;
BEGIN
  SELECT is_admin INTO is_admin_user
  FROM profiles
  WHERE id = user_id;
  
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the is_admin function to use the safer version
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN check_admin_status(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;