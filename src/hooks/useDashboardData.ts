import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DashboardMetrics {
  totalPatients: number;
  appointmentsToday: number;
  monthlyRevenue: number;
  pendingTransactions: number;
  patientsAwaitingFeedback: number;
}

export interface RecentSession {
  id: string;
  patient_name: string;
  session_type: string;
  scheduled_at: string;
  status: string;
  price: number | null;
}

export interface UpcomingAppointment {
  id: string;
  patient_name: string;
  session_type: string;
  scheduled_at: string;
  status: string;
  duration_minutes: number | null;
}

export const useDashboardData = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPatients: 0,
    appointmentsToday: 0,
    monthlyRevenue: 0,
    pendingTransactions: 0,
    patientsAwaitingFeedback: 0
  });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Buscar métricas
      await Promise.all([
        fetchMetrics(),
        fetchRecentSessions(),
        fetchUpcomingAppointments()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    if (!user) return;
    
    try {
      // Total de pacientes da conta atual (filtrado via RLS)
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Agendamentos hoje do usuário atual
      const today = new Date().toISOString().split('T')[0];
      const { count: appointmentsToday } = await supabase
        .from('sessions')
        .select(`*, patients!inner(created_by)`, { count: 'exact', head: true })
        .eq('patients.created_by', user.id)
        .gte('scheduled_at', `${today}T00:00:00.000Z`)
        .lt('scheduled_at', `${today}T23:59:59.999Z`);

      // Receita mensal do usuário atual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: monthlyTransactions } = await supabase
        .from('transactions')
        .select(`amount, patients!inner(created_by)`)
        .eq('patients.created_by', user.id)
        .eq('status', 'paid')
        .gte('payment_date', startOfMonth.toISOString().split('T')[0]);

      const monthlyRevenue = monthlyTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Transações pendentes do usuário atual
      const { count: pendingTransactions } = await supabase
        .from('transactions')
        .select(`*, patients!inner(created_by)`, { count: 'exact', head: true })
        .eq('patients.created_by', user.id)
        .eq('status', 'pending');

      // Pacientes aguardando feedback - buscar execuções de ações sem feedback do terapeuta do usuário atual
      const { data: executionsWithoutFeedback } = await supabase
        .from('action_executions')
        .select(`
          id,
          patient_id,
          patients!inner(created_by)
        `)
        .eq('patients.created_by', user.id)
        .eq('completed', true);

      // Buscar quais execuções já têm feedback
      const { data: feedbackData } = await supabase
        .from('therapist_feedback')
        .select('execution_id');

      const executionIdsWithFeedback = new Set(
        feedbackData?.map(feedback => feedback.execution_id) || []
      );

      // Filtrar execuções que não têm feedback
      const executionsWithoutFeedbackFiltered = executionsWithoutFeedback?.filter(
        execution => !executionIdsWithFeedback.has(execution.id)
      ) || [];

      // Contar pacientes únicos que têm execuções sem feedback
      const uniquePatientsAwaitingFeedback = new Set(
        executionsWithoutFeedbackFiltered.map(exec => exec.patient_id)
      ).size;

      setMetrics({
        totalPatients: totalPatients || 0,
        appointmentsToday: appointmentsToday || 0,
        monthlyRevenue,
        pendingTransactions: pendingTransactions || 0,
        patientsAwaitingFeedback: uniquePatientsAwaitingFeedback
      });
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    }
  };

  const fetchRecentSessions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          session_type,
          scheduled_at,
          status,
          price,
          patients!inner(name, created_by)
        `)
        .eq('patients.created_by', user.id)
        .order('scheduled_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const sessions: RecentSession[] = data?.map(session => ({
        id: session.id,
        patient_name: (session.patients as any)?.name || 'Paciente não encontrado',
        session_type: session.session_type,
        scheduled_at: session.scheduled_at,
        status: session.status || 'agendada',
        price: session.price
      })) || [];

      setRecentSessions(sessions);
    } catch (error) {
      console.error('Erro ao buscar sessões recentes:', error);
    }
  };

  const fetchUpcomingAppointments = async () => {
    if (!user) return;
    
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          session_type,
          scheduled_at,
          status,
          duration_minutes,
          patients!inner(name, created_by)
        `)
        .eq('patients.created_by', user.id)
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (error) throw error;

      const appointments: UpcomingAppointment[] = data?.map(session => ({
        id: session.id,
        patient_name: (session.patients as any)?.name || 'Paciente não encontrado',
        session_type: session.session_type,
        scheduled_at: session.scheduled_at,
        status: session.status || 'agendada',
        duration_minutes: session.duration_minutes
      })) || [];

      setUpcomingAppointments(appointments);
    } catch (error) {
      console.error('Erro ao buscar próximos agendamentos:', error);
    }
  };

  return {
    metrics,
    recentSessions,
    upcomingAppointments,
    loading,
    refetch: fetchDashboardData
  };
};