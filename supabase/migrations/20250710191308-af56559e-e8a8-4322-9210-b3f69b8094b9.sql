-- Fix the get_user_credit_info function to avoid FULL JOIN issues
CREATE OR REPLACE FUNCTION public.get_user_credit_info(p_user_id uuid)
 RETURNS TABLE(balance integer, total_purchased integer, total_consumed integer, plan_type subscription_plan, credit_multiplier numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(uc.balance, 0) as balance,
    COALESCE(uc.total_purchased, 0) as total_purchased,
    COALESCE(uc.total_consumed, 0) as total_consumed,
    COALESCE(us.plan_type, 'bronze'::subscription_plan) as plan_type,
    COALESCE(sp.credit_multiplier, 1.0) as credit_multiplier
  FROM public.user_credits uc
  LEFT JOIN public.user_subscriptions us ON uc.user_id = us.user_id AND us.status = 'active'
  LEFT JOIN public.subscription_plans sp ON us.plan_type = sp.plan_type
  WHERE uc.user_id = p_user_id
  
  UNION ALL
  
  SELECT 
    0 as balance,
    0 as total_purchased,
    0 as total_consumed,
    'bronze'::subscription_plan as plan_type,
    1.0 as credit_multiplier
  WHERE NOT EXISTS (SELECT 1 FROM public.user_credits WHERE user_id = p_user_id)
  LIMIT 1;
END;
$function$