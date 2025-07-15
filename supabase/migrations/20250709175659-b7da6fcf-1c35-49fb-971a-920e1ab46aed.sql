-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'doctor', 'secretary', 'assistant');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'assistant',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create permissions table
CREATE TABLE public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create role permissions junction table
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Insert default permissions
INSERT INTO public.permissions (name, description) VALUES
('manage_users', 'Gerenciar usuários do sistema'),
('manage_patients', 'Gerenciar pacientes'),
('manage_appointments', 'Gerenciar agendamentos'),
('view_reports', 'Visualizar relatórios'),
('manage_treatments', 'Gerenciar tratamentos'),
('manage_medical_records', 'Gerenciar prontuários'),
('manage_exercises', 'Gerenciar exercícios'),
('system_settings', 'Configurações do sistema');

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'admin', id FROM public.permissions;

INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'doctor', id FROM public.permissions 
WHERE name IN ('manage_patients', 'manage_appointments', 'view_reports', 'manage_treatments', 'manage_medical_records', 'manage_exercises');

INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'secretary', id FROM public.permissions 
WHERE name IN ('manage_patients', 'manage_appointments', 'view_reports');

INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'assistant', id FROM public.permissions 
WHERE name IN ('manage_appointments', 'view_reports');

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles access
CREATE POLICY "Allow all operations for authenticated users" ON public.profiles
FOR ALL USING (true);

-- Enable RLS on permissions table
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create policy for permissions access
CREATE POLICY "Allow all operations for authenticated users" ON public.permissions
FOR ALL USING (true);

-- Enable RLS on role_permissions table
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy for role_permissions access
CREATE POLICY "Allow all operations for authenticated users" ON public.role_permissions
FOR ALL USING (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    'assistant'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION public.user_has_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.role_permissions rp ON p.role = rp.role
    JOIN public.permissions perm ON rp.permission_id = perm.id
    WHERE p.user_id = user_uuid 
    AND perm.name = permission_name
    AND p.is_active = true
  );
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid AND is_active = true;
$$;

-- Add updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();