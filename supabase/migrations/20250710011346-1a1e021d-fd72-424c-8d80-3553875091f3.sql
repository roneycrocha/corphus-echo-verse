-- Primeiro, vamos verificar se já temos campos de prioridade e frequência em therapeutic_actions
-- Adicionar campos de prioridade e frequência para each objetivo em therapeutic_actions se não existirem

-- Verificar campos existentes na tabela therapeutic_actions
-- Priority já existe
-- Frequency já existe

-- Criar tabela para gerenciar planos de tratamento com ações
-- Vamos adicionar funcionalidades para editar/excluir planos se não existirem

-- Verificar se existem políticas RLS adequadas para operações CRUD
-- As políticas já existem para therapeutic_actions e treatment_plans

-- Adicionar função helper para calcular estatísticas de planos
CREATE OR REPLACE FUNCTION get_treatment_plan_stats(plan_id UUID)
RETURNS TABLE (
    total_actions INTEGER,
    completed_actions INTEGER,
    progress_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(ta.id)::INTEGER as total_actions,
        COUNT(CASE WHEN ae.completed = true THEN 1 END)::INTEGER as completed_actions,
        CASE 
            WHEN COUNT(ta.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN ae.completed = true THEN 1 END) * 100.0 / COUNT(ta.id)), 2)
            ELSE 0.0 
        END as progress_percentage
    FROM therapeutic_actions ta
    LEFT JOIN action_executions ae ON ta.id = ae.action_id
    WHERE ta.treatment_plan_id = plan_id AND ta.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;