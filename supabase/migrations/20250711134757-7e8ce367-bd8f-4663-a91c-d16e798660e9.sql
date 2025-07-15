-- Fix user type for therapist user
UPDATE public.profiles 
SET user_type = 'therapist' 
WHERE user_id = '5d6bc866-1ddd-4598-a3af-a4716e74b336' AND user_type = 'patient';