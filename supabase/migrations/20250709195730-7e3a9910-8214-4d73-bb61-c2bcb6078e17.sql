-- Criar função para verificar autenticação
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar políticas RLS para garantir acesso apenas para usuários autenticados
-- Remover políticas existentes e criar novas mais restritivas

-- Patients table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.patients;
CREATE POLICY "Authenticated users can manage patients" ON public.patients
  FOR ALL USING (public.is_authenticated());

-- Transactions table  
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.transactions;
CREATE POLICY "Authenticated users can manage transactions" ON public.transactions
  FOR ALL USING (public.is_authenticated());

-- Sessions table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.sessions;
CREATE POLICY "Authenticated users can manage sessions" ON public.sessions
  FOR ALL USING (public.is_authenticated());

-- Medical records table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.medical_records;
CREATE POLICY "Authenticated users can manage medical records" ON public.medical_records
  FOR ALL USING (public.is_authenticated());

-- Treatment plans table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.treatment_plans;
CREATE POLICY "Authenticated users can manage treatment plans" ON public.treatment_plans
  FOR ALL USING (public.is_authenticated());

-- Exercise prescriptions table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.exercise_prescriptions;
CREATE POLICY "Authenticated users can manage exercise prescriptions" ON public.exercise_prescriptions
  FOR ALL USING (public.is_authenticated());

-- Exercises table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.exercises;
CREATE POLICY "Authenticated users can manage exercises" ON public.exercises
  FOR ALL USING (public.is_authenticated());

-- Receipts table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.receipts;
CREATE POLICY "Authenticated users can manage receipts" ON public.receipts
  FOR ALL USING (public.is_authenticated());

-- System settings table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.system_settings;
CREATE POLICY "Authenticated users can manage system settings" ON public.system_settings
  FOR ALL USING (public.is_authenticated());

-- Profiles table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id AND public.is_authenticated());
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_authenticated());

-- Permissions table (read-only for all authenticated users)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.permissions;
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
  FOR SELECT USING (public.is_authenticated());

-- Role permissions table (read-only for all authenticated users)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.role_permissions;
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
  FOR SELECT USING (public.is_authenticated());