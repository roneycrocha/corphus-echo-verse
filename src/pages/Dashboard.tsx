import React from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Star,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePermissions } from '@/hooks/usePermissions';
import { useChartData } from '@/hooks/useChartData';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { InteractiveMetricCard } from '@/components/dashboard/InteractiveMetricCard';
import { SystemStatus } from '@/components/dashboard/SystemStatus';

/**
 * Dashboard principal do corphus.ai
 * Visão geral das métricas e atividades do terapeuta
 */
export const Dashboard: React.FC = () => {
  const { 
    metrics, 
    recentSessions, 
    upcomingAppointments, 
    loading, 
    refetch 
  } = useDashboardData();
  
  const { canViewReports, canManageFinances, userProfile } = usePermissions();
  const { chartData, loading: chartLoading } = useChartData();
  const { profile: currentProfile, loading: profileLoading } = useCurrentProfile();

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'agendada': { label: 'Agendada', variant: 'secondary' as const },
      'confirmada': { label: 'Confirmada', variant: 'default' as const },
      'concluida': { label: 'Concluída', variant: 'default' as const },
      'cancelada': { label: 'Cancelada', variant: 'destructive' as const },
      'completed': { label: 'Concluída', variant: 'default' as const }
    };
    return statusMap[status] || { label: status, variant: 'outline' as const };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo(a), {currentProfile?.full_name || userProfile?.full_name || 'Usuário'}! Visão geral da sua clínica e atividades recentes
          </p>
          {currentProfile && (
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>📧 {currentProfile.email}</span>
              {currentProfile.phone && <span>📞 {currentProfile.phone}</span>}
              {currentProfile.job_title && <span>💼 {currentProfile.job_title}</span>}
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {currentProfile.role === 'specialist' ? 'Especialista' : 
                 currentProfile.role === 'admin' ? 'Administrador' : 
                 currentProfile.role === 'assistant' ? 'Assistente' : currentProfile.role}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Online
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
        <InteractiveMetricCard
          title="Total de Pacientes"
          value={metrics.totalPatients}
          subtitle="Total cadastrado"
          icon={Users}
          iconColor="text-primary"
          loading={loading}
          navigateTo="/pacientes"
        />

        <InteractiveMetricCard
          title="Agendamentos Hoje"
          value={metrics.appointmentsToday}
          subtitle="Para hoje"
          icon={Calendar}
          iconColor="text-warning"
          loading={loading}
          navigateTo="/agenda"
        />


        {canManageFinances && (
          <InteractiveMetricCard
            title="Pendências"
            value={metrics.pendingTransactions}
            subtitle="Transações pendentes"
            icon={AlertTriangle}
            iconColor="text-destructive"
            loading={loading}
            navigateTo="/financeiro?tab=overdue"
          />
        )}

        <InteractiveMetricCard
          title="Feedback Pendente"
          value={metrics.patientsAwaitingFeedback}
          subtitle="Pacientes aguardando"
          icon={MessageSquare}
          iconColor="text-warning"
          loading={loading}
          navigateTo="/gestao-terapeutica"
        />
      </div>

      {/* Dashboard Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - Sessions and Appointments */}
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sessions */}
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                  <span>Sessões Recentes</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Últimas sessões realizadas
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-2 sm:p-3 bg-secondary/20 rounded-lg">
                        <div className="space-y-2 flex-1 min-w-0">
                          <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
                          <Skeleton className="h-2 sm:h-3 w-16 sm:w-24" />
                        </div>
                        <div className="text-right space-y-2 flex-shrink-0 ml-2">
                          <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                          <Skeleton className="h-4 sm:h-5 w-12 sm:w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSessions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                        Nenhuma sessão recente encontrada
                      </p>
                    ) : (
                      recentSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-2 sm:p-3 bg-secondary/20 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm sm:text-base truncate">{session.patient_name}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{session.session_type}</p>
                            {session.price && (
                              <p className="text-xs sm:text-sm font-medium text-success">{formatCurrency(session.price)}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-xs sm:text-sm font-medium">{formatDate(session.scheduled_at)}</p>
                            <Badge 
                              variant={getStatusBadge(session.status).variant}
                              className="text-[10px] sm:text-xs mt-1"
                            >
                              {getStatusBadge(session.status).label}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-secondary flex-shrink-0" />
                  <span>Próximos Agendamentos</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Agenda para os próximos dias
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-2 sm:p-3 border border-border rounded-lg">
                        <div className="space-y-2 flex-1 min-w-0">
                          <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
                          <Skeleton className="h-2 sm:h-3 w-16 sm:w-24" />
                        </div>
                        <div className="text-right space-y-2 flex-shrink-0 ml-2">
                          <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                          <Skeleton className="h-2 sm:h-3 w-16 sm:w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                        Nenhum agendamento próximo
                      </p>
                    ) : (
                      upcomingAppointments.map((appointment) => (
                        <div key={appointment.id} className="flex items-center justify-between p-2 sm:p-3 border border-border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm sm:text-base truncate">{appointment.patient_name}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{appointment.session_type}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-xs sm:text-sm font-medium text-primary">{formatTime(appointment.scheduled_at)}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {appointment.duration_minutes ? `${appointment.duration_minutes} min` : 'Sem duração'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Quick Actions, Notifications and System Status */}
        <div className="space-y-6">
          <QuickActions />
          <NotificationCenter />
          <SystemStatus />
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-6 lg:space-y-8">
        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Occupancy Rate Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <BarChart className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span>Taxa de Ocupação</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Taxa de ocupação mensal dos horários disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {chartLoading ? (
                <Skeleton className="h-56 sm:h-64 w-full" />
              ) : (
                <div className="h-56 sm:h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.occupancyRate} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        className="text-xs"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        className="text-xs"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          fontSize: '12px',
                          padding: '8px',
                          borderRadius: '6px'
                        }}
                        formatter={(value, name) => [
                          name === 'rate' ? `${value}%` : value,
                          name === 'rate' ? 'Taxa de Ocupação' : 
                          name === 'sessions' ? 'Sessões Realizadas' : 'Horários Disponíveis'
                        ]}
                      />
                      <Bar dataKey="available" fill="hsl(var(--muted))" name="available" />
                      <Bar dataKey="sessions" fill="hsl(var(--primary))" name="sessions" />
                      <Line type="monotone" dataKey="rate" stroke="hsl(var(--destructive))" strokeWidth={2} name="rate" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patients Evolution Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                <span>Evolução de Pacientes</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Crescimento da base de pacientes ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {chartLoading ? (
                <Skeleton className="h-56 sm:h-64 w-full" />
              ) : (
                <div className="h-56 sm:h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.patientsEvolution} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        className="text-xs"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        className="text-xs"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          fontSize: '12px',
                          padding: '8px',
                          borderRadius: '6px'
                        }}
                        formatter={(value, name) => [
                          value,
                          name === 'total' ? 'Total de Pacientes' : 'Novos Pacientes'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        name="total"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="new" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={2}
                        name="new"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sessions Evolution Chart - Full Width */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-warning flex-shrink-0" />
              <span>Evolução de Sessões</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Quantidade de sessões realizadas mensalmente e crescimento
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {chartLoading ? (
              <Skeleton className="h-64 sm:h-80 w-full" />
            ) : (
              <div className="h-64 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData.sessionsEvolution} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      className="text-xs"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      className="text-xs"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        fontSize: '12px',
                        padding: '8px',
                        borderRadius: '6px'
                      }}
                      formatter={(value, name) => [
                        value,
                        name === 'total' ? 'Total de Sessões' : 
                        name === 'growth' ? 'Crescimento (%)' : 'Sessões'
                      ]}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" name="total" />
                    <Line 
                      type="monotone" 
                      dataKey="growth" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={3}
                      name="growth"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="status-card">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge className="bg-primary text-primary-foreground">Sistema Ativo</Badge>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  Função: {userProfile?.role ? 
                    ({ admin: 'Administrador', doctor: 'Médico', secretary: 'Secretário(a)', assistant: 'Assistente' }[userProfile.role] || userProfile.role) : 
                    'Carregando...'
                  }
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Sistema de gestão corporal integrado com todas as funcionalidades ativas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};