-- Limpar todos os dados de pacientes e dados relacionados (dados de teste do método antigo)

-- 1. Remover dados de execução de ações e feedback
DELETE FROM public.patient_feedback_reads;
DELETE FROM public.action_executions;
DELETE FROM public.therapeutic_actions;

-- 2. Remover planos de tratamento
DELETE FROM public.treatment_plans;

-- 3. Remover prescrições de exercícios
DELETE FROM public.exercise_prescriptions;

-- 4. Remover conquistas de pacientes
DELETE FROM public.patient_achievements;

-- 5. Remover análises de conversação
DELETE FROM public.conversation_analyses;

-- 6. Remover transcrições
DELETE FROM public.transcriptions;

-- 7. Remover análises corporais
DELETE FROM public.body_analyses;

-- 8. Remover registros médicos
DELETE FROM public.medical_records;

-- 9. Remover transações financeiras
DELETE FROM public.transactions;

-- 10. Remover entradas financeiras
DELETE FROM public.financial_entries;

-- 11. Remover sessões
DELETE FROM public.sessions;

-- 12. Remover tokens de agendamento e registro
DELETE FROM public.patient_booking_tokens;
DELETE FROM public.patient_registration_tokens;

-- 13. Remover cache de sugestões de IA
DELETE FROM public.ai_suggestion_cache;

-- 14. Por fim, remover os pacientes
DELETE FROM public.patients;

-- Comentário sobre a limpeza
COMMENT ON TABLE public.patients IS 'Dados de pacientes limpos em 2025-01-14 - removidos dados de teste do método antigo';