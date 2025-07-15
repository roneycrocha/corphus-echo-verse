-- Limpar todos os dados do sistema para reiniciar os testes

-- 1. Desabilitar triggers temporariamente para evitar problemas
SET session_replication_role = replica;

-- 2. Limpar dados de execução de ações e feedback
DELETE FROM public.patient_feedback_reads;
DELETE FROM public.action_executions;
DELETE FROM public.therapeutic_actions;
DELETE FROM public.therapist_feedback;

-- 3. Limpar dados de planos de tratamento
DELETE FROM public.treatment_plans;

-- 4. Limpar prescrições de exercícios
DELETE FROM public.exercise_prescriptions;

-- 5. Limpar conquistas de pacientes
DELETE FROM public.patient_achievements;

-- 6. Limpar análises de conversação
DELETE FROM public.conversation_analyses;

-- 7. Limpar transcrições
DELETE FROM public.transcriptions;

-- 8. Limpar análises corporais
DELETE FROM public.body_analyses;

-- 9. Limpar registros médicos
DELETE FROM public.medical_records;

-- 10. Limpar dados financeiros
DELETE FROM public.receipts;
DELETE FROM public.transactions;
DELETE FROM public.financial_entries;

-- 11. Limpar sessões
DELETE FROM public.sessions;

-- 12. Limpar tokens de agendamento e registro
DELETE FROM public.patient_booking_tokens;
DELETE FROM public.patient_registration_tokens;

-- 13. Limpar cache de sugestões de IA
DELETE FROM public.ai_suggestion_cache;

-- 14. Limpar pacientes
DELETE FROM public.patients;

-- 15. Limpar dados de usuários
DELETE FROM public.credit_transactions;
DELETE FROM public.user_credits;
DELETE FROM public.user_subscriptions;

-- 16. Limpar convites de pacientes
DELETE FROM public.patient_invites;

-- 17. Limpar agentes de IA criados por usuários
DELETE FROM public.ai_agents;

-- 18. Limpar despesas
DELETE FROM public.expenses;

-- 19. Limpar perfis de usuários
DELETE FROM public.profiles;

-- 20. Limpar contas
DELETE FROM public.accounts;

-- 21. Limpar usuários da auth (isso deve ser feito por último)
DELETE FROM auth.users;

-- 22. Reabilitar triggers
SET session_replication_role = DEFAULT;

-- 23. Resetar sequences se necessário
-- (As sequences UUIDs não precisam ser resetadas)

-- Comentário sobre a limpeza completa
COMMENT ON SCHEMA public IS 'Sistema limpo em 2025-01-14 - todos os dados removidos para reiniciar testes';