-- Criar tipos enum se não existirem
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'specialist', 'assistant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.user_type AS ENUM ('therapist', 'patient');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.subscription_plan AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.credit_transaction_type AS ENUM ('purchase', 'consumption', 'bonus', 'refund');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;