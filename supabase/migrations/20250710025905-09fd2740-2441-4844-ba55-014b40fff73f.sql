-- Corrigir associação entre pacientes e usuários autenticados
-- Atualizar o user_id do paciente com base no email
UPDATE patients 
SET user_id = (
    SELECT user_id 
    FROM profiles 
    WHERE profiles.email = patients.email 
    AND profiles.user_type = 'patient'
)
WHERE user_id IS NULL 
AND email IN (
    SELECT email 
    FROM profiles 
    WHERE user_type = 'patient'
);