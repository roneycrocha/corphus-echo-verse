import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChartData {
  occupancyRate: {
    month: string;
    sessions: number;
    available: number;
    rate: number;
  }[];
  patientsEvolution: {
    month: string;
    total: number;
    new: number;
  }[];
  sessionsEvolution: {
    month: string;
    sessions: number;
    growth: number;
  }[];
}

export const useChartData = () => {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartData>({
    occupancyRate: [],
    patientsEvolution: [],
    sessionsEvolution: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChartData();
    }
  }, [user]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        fetchOccupancyRate(),
        fetchPatientsEvolution(),
        fetchSessionsEvolution()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados dos gráficos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOccupancyRate = async () => {
    if (!user) return;
    
    try {
      // Buscar configurações do sistema para horários disponíveis
      const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (!settings) return;

      // Calcular horários disponíveis por dia
      const workingHours = calculateWorkingHours(settings);
      const availablePerDay = workingHours;
      const workingDaysPerWeek = settings.working_days.length;
      const availablePerMonth = availablePerDay * workingDaysPerWeek * 4; // Aproximadamente 4 semanas

      // Buscar dados dos últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: sessions } = await supabase
        .from('sessions')
        .select(`scheduled_at, patients!inner(created_by)`)
        .eq('patients.created_by', user.id)
        .gte('scheduled_at', sixMonthsAgo.toISOString());

      // Agrupar por mês
      const monthlyData = new Map();
      
      sessions?.forEach(session => {
        const date = new Date(session.scheduled_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthName,
            sessions: 0,
            available: availablePerMonth,
            rate: 0
          });
        }
        
        monthlyData.get(monthKey).sessions++;
      });

      // Calcular taxa de ocupação
      const occupancyData = Array.from(monthlyData.values()).map(data => ({
        ...data,
        rate: Math.round((data.sessions / data.available) * 100)
      }));

      setChartData(prev => ({ ...prev, occupancyRate: occupancyData }));
    } catch (error) {
      console.error('Erro ao buscar taxa de ocupação:', error);
    }
  };

  const fetchPatientsEvolution = async () => {
    if (!user) return;
    
    try {
      // Agora filtrado automaticamente via RLS por account_id
      const { data: patients } = await supabase
        .from('patients')
        .select('created_at')
        .order('created_at');

      if (!patients) return;

      // Agrupar por mês
      const monthlyData = new Map();

      patients.forEach(patient => {
        const date = new Date(patient.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthName,
            total: 0,
            new: 0
          });
        }
        
        monthlyData.get(monthKey).new++;
      });

      // Calcular total acumulativo
      const evolutionData = Array.from(monthlyData.values()).sort((a, b) => 
        new Date(a.month).getTime() - new Date(b.month).getTime()
      );
      
      let totalPatients = 0;
      evolutionData.forEach((data) => {
        totalPatients += data.new;
        data.total = totalPatients;
      });

      setChartData(prev => ({ ...prev, patientsEvolution: evolutionData.slice(-12) }));
    } catch (error) {
      console.error('Erro ao buscar evolução de pacientes:', error);
    }
  };

  const fetchSessionsEvolution = async () => {
    if (!user) return;
    
    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`scheduled_at, patients!inner(created_by)`)
        .eq('patients.created_by', user.id)
        .order('scheduled_at');

      if (!sessions) return;

      // Agrupar por mês
      const monthlyData = new Map();

      sessions.forEach(session => {
        const date = new Date(session.scheduled_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthName,
            sessions: 0,
            growth: 0
          });
        }
        
        monthlyData.get(monthKey).sessions++;
      });

      // Calcular crescimento
      const evolutionData = Array.from(monthlyData.values());
      evolutionData.forEach((data, index) => {
        if (index > 0) {
          const previousMonth = evolutionData[index - 1];
          data.growth = Math.round(((data.sessions - previousMonth.sessions) / previousMonth.sessions) * 100);
        }
      });

      setChartData(prev => ({ ...prev, sessionsEvolution: evolutionData.slice(-12) }));
    } catch (error) {
      console.error('Erro ao buscar evolução de sessões:', error);
    }
  };

  const calculateWorkingHours = (settings: any) => {
    const startTime = new Date(`2000-01-01T${settings.working_hours_start}`);
    const endTime = new Date(`2000-01-01T${settings.working_hours_end}`);
    const lunchStart = new Date(`2000-01-01T${settings.lunch_break_start}`);
    const lunchEnd = new Date(`2000-01-01T${settings.lunch_break_end}`);
    
    const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const lunchMinutes = (lunchEnd.getTime() - lunchStart.getTime()) / (1000 * 60);
    const workingMinutes = totalMinutes - lunchMinutes;
    
    return Math.floor(workingMinutes / settings.appointment_duration);
  };

  return {
    chartData,
    loading,
    refetch: fetchChartData
  };
};