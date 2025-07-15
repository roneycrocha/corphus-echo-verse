import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar,
  Target,
  Award,
  BarChart3,
  PieChart,
  Download,
  Trophy,
  Flame,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardData {
  totalActions: number;
  completedActions: number;
  weeklyProgress: number;
  monthlyProgress: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  achievements: Achievement[];
  weeklyStats: WeeklyStats[];
  emotionalTrends: EmotionalTrend[];
}

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  description: string;
  points: number;
  earned_date: string;
}

interface WeeklyStats {
  week: string;
  completed: number;
  total: number;
  percentage: number;
}

interface EmotionalTrend {
  date: string;
  average_mood: number;
  executions_count: number;
}

interface TherapeuticDashboardProps {
  patientId: string;
  treatmentPlanId: string;
}

export const TherapeuticDashboard: React.FC<TherapeuticDashboardProps> = ({
  patientId,
  treatmentPlanId
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalActions: 0,
    completedActions: 0,
    weeklyProgress: 0,
    monthlyProgress: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalPoints: 0,
    achievements: [],
    weeklyStats: [],
    emotionalTrends: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, [patientId, treatmentPlanId, timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Definir período baseado no timeRange
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'week':
          startDate = subWeeks(now, 1);
          break;
        case 'month':
          startDate = subMonths(now, 1);
          break;
        case 'quarter':
          startDate = subMonths(now, 3);
          break;
        default:
          startDate = subMonths(now, 1);
      }

      // Carregar ações terapêuticas
      const { data: actionsData, error: actionsError } = await supabase
        .from('therapeutic_actions')
        .select('*')
        .eq('treatment_plan_id', treatmentPlanId)
        .eq('is_active', true);

      if (actionsError) throw actionsError;

      // Carregar execuções
      const { data: executionsData, error: executionsError } = await supabase
        .from('action_executions')
        .select('*')
        .eq('patient_id', patientId)
        .gte('execution_date', startDate.toISOString().split('T')[0])
        .order('execution_date', { ascending: false });

      if (executionsError) throw executionsError;

      // Carregar conquistas
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('patient_achievements')
        .select('*')
        .eq('patient_id', patientId)
        .order('earned_date', { ascending: false });

      if (achievementsError) throw achievementsError;

      // Calcular estatísticas
      const totalActions = actionsData?.length || 0;
      const completedExecutions = executionsData?.filter(e => e.completed) || [];
      const completedActions = completedExecutions.length;

      // Calcular progresso semanal e mensal
      const weekAgo = subWeeks(now, 1);
      const monthAgo = subMonths(now, 1);
      
      const weeklyCompleted = completedExecutions.filter(e => 
        new Date(e.execution_date) >= weekAgo
      ).length;
      
      const monthlyCompleted = completedExecutions.filter(e => 
        new Date(e.execution_date) >= monthAgo
      ).length;

      const weeklyProgress = totalActions > 0 ? Math.round((weeklyCompleted / totalActions) * 100) : 0;
      const monthlyProgress = totalActions > 0 ? Math.round((monthlyCompleted / totalActions) * 100) : 0;

      // Calcular streak (sequência de dias consecutivos)
      const { currentStreak, longestStreak } = calculateStreaks(completedExecutions);

      // Calcular pontos totais
      const totalPoints = achievementsData?.reduce((sum, achievement) => sum + achievement.points, 0) || 0;

      // Calcular estatísticas semanais para o gráfico
      const weeklyStats = calculateWeeklyStats(completedExecutions, totalActions);

      // Calcular tendências emocionais
      const emotionalTrends = calculateEmotionalTrends(executionsData || []);

      setDashboardData({
        totalActions,
        completedActions,
        weeklyProgress,
        monthlyProgress,
        currentStreak,
        longestStreak,
        totalPoints,
        achievements: achievementsData as Achievement[] || [],
        weeklyStats,
        emotionalTrends
      });

      // Verificar e adicionar novas conquistas
      await checkAndAddAchievements(patientId, {
        currentStreak,
        completedActions,
        weeklyCompleted,
        monthlyCompleted
      });

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do dashboard.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStreaks = (executions: any[]) => {
    if (executions.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Ordenar por data
    const sortedExecutions = executions
      .sort((a, b) => new Date(b.execution_date).getTime() - new Date(a.execution_date).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = new Date();

    // Verificar streak atual
    for (const execution of sortedExecutions) {
      const execDate = new Date(execution.execution_date);
      const daysDiff = Math.floor((lastDate.getTime() - execDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        currentStreak++;
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
      
      lastDate = execDate;
    }

    return { currentStreak, longestStreak };
  };

  const calculateWeeklyStats = (executions: any[], totalActions: number) => {
    const weeks: WeeklyStats[] = [];
    const now = new Date();

    for (let i = 0; i < 4; i++) {
      const weekStart = subWeeks(now, i + 1);
      const weekEnd = subWeeks(now, i);
      
      const weekExecutions = executions.filter(e => {
        const execDate = new Date(e.execution_date);
        return execDate >= weekStart && execDate < weekEnd;
      });

      const completed = weekExecutions.filter(e => e.completed).length;
      const percentage = totalActions > 0 ? Math.round((completed / totalActions) * 100) : 0;

      weeks.unshift({
        week: format(weekStart, 'dd/MM', { locale: ptBR }),
        completed,
        total: totalActions,
        percentage
      });
    }

    return weeks;
  };

  const calculateEmotionalTrends = (executions: any[]) => {
    const trends: { [date: string]: { total: number; sum: number } } = {};

    executions.forEach(execution => {
      if (execution.emotional_state) {
        const date = execution.execution_date;
        if (!trends[date]) {
          trends[date] = { total: 0, sum: 0 };
        }
        trends[date].total++;
        trends[date].sum += execution.emotional_state;
      }
    });

    return Object.entries(trends)
      .map(([date, data]) => ({
        date,
        average_mood: Math.round((data.sum / data.total) * 10) / 10,
        executions_count: data.total
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Últimos 7 dias
  };

  const checkAndAddAchievements = async (patientId: string, stats: any) => {
    const newAchievements = [];

    // Conquista de streak
    if (stats.currentStreak >= 7) {
      newAchievements.push({
        patient_id: patientId,
        achievement_type: 'streak',
        achievement_name: 'Sequência de 7 dias',
        description: 'Completou atividades por 7 dias consecutivos',
        points: 50
      });
    }

    if (stats.currentStreak >= 30) {
      newAchievements.push({
        patient_id: patientId,
        achievement_type: 'streak',
        achievement_name: 'Mestre da Consistência',
        description: 'Completou atividades por 30 dias consecutivos',
        points: 200
      });
    }

    // Conquista semanal
    if (stats.weeklyCompleted >= 5) {
      newAchievements.push({
        patient_id: patientId,
        achievement_type: 'weekly',
        achievement_name: 'Semana Completa',
        description: 'Completou 5 ou mais atividades em uma semana',
        points: 30
      });
    }

    // Conquista de primeira atividade
    if (stats.completedActions === 1) {
      newAchievements.push({
        patient_id: patientId,
        achievement_type: 'first',
        achievement_name: 'Primeiro Passo',
        description: 'Completou sua primeira atividade terapêutica',
        points: 10
      });
    }

    // Inserir novas conquistas (se não existirem)
    if (newAchievements.length > 0) {
      try {
        await supabase
          .from('patient_achievements')
          .upsert(newAchievements, { 
            onConflict: 'patient_id, achievement_name',
            ignoreDuplicates: true 
          });
      } catch (error) {
        console.error('Erro ao adicionar conquistas:', error);
      }
    }
  };

  const exportReport = async () => {
    // Implementar exportação de relatório PDF
    toast({
      title: 'Relatório',
      description: 'Funcionalidade de exportação em desenvolvimento.',
    });
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'streak': return <Flame className="w-5 h-5 text-orange-500" />;
      case 'weekly': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'first': return <Star className="w-5 h-5 text-yellow-500" />;
      default: return <Trophy className="w-5 h-5 text-purple-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard de Evolução</h2>
          <p className="text-muted-foreground">
            Acompanhe o progresso e conquistas terapêuticas
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setTimeRange('week')}>
            Semana
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTimeRange('month')}>
            Mês
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTimeRange('quarter')}>
            Trimestre
          </Button>
          <Button onClick={exportReport} className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{dashboardData.completedActions}</p>
                <p className="text-sm text-muted-foreground">Ações Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Flame className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{dashboardData.currentStreak}</p>
                <p className="text-sm text-muted-foreground">Sequência Atual</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{dashboardData.monthlyProgress}%</p>
                <p className="text-sm text-muted-foreground">Progresso Mensal</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Award className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{dashboardData.totalPoints}</p>
                <p className="text-sm text-muted-foreground">Pontos Totais</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progresso Semanal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span>Progresso por Semana</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.weeklyStats.map((week, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Semana {week.week}</span>
                  <span>{week.completed}/{week.total} ações</span>
                </div>
                <Progress value={week.percentage} className="w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conquistas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span>Conquistas Recentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData.achievements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conquista ainda</p>
                <p className="text-sm mt-2">Continue completando atividades para ganhar conquistas!</p>
              </div>
            ) : (
              dashboardData.achievements.slice(0, 5).map((achievement) => (
                <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  {getAchievementIcon(achievement.achievement_type)}
                  <div className="flex-1">
                    <h4 className="font-medium">{achievement.achievement_name}</h4>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Badge variant="secondary">+{achievement.points} pts</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(achievement.earned_date), 'dd/MM')}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tendências Emocionais */}
      {dashboardData.emotionalTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-primary" />
              <span>Tendência Emocional (Últimos 7 dias)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.emotionalTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{format(new Date(trend.date), 'dd/MM')}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                        style={{ width: `${(trend.average_mood / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{trend.average_mood}/5</span>
                    <Badge variant="outline" className="text-xs">
                      {trend.executions_count} atividades
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};