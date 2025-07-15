import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertCircle, 
  Calendar, 
  MessageSquare, 
  X,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'appointment' | 'feedback' | 'payment' | 'system';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Central de notificações do dashboard
 */
export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    
    // Simular notificações em tempo real (posteriormente usar websockets)
    const interval = setInterval(loadNotifications, 30000); // Atualizar a cada 30 segundos
    
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const notifications: Notification[] = [];

      // Buscar agendamentos para hoje
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAppointments } = await supabase
        .from('sessions')
        .select(`
          id,
          scheduled_at,
          patients (name)
        `)
        .gte('scheduled_at', `${today}T00:00:00.000Z`)
        .lt('scheduled_at', `${today}T23:59:59.999Z`)
        .eq('status', 'agendada');

      todayAppointments?.forEach(appointment => {
        const appointmentTime = new Date(appointment.scheduled_at);
        const now = new Date();
        const timeDiff = appointmentTime.getTime() - now.getTime();
        const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));

        if (hoursUntil <= 2 && hoursUntil > 0) {
          notifications.push({
            id: `appointment-${appointment.id}`,
            type: 'appointment',
            title: 'Consulta em breve',
            message: `Consulta com ${(appointment.patients as any)?.name} em ${hoursUntil}h`,
            created_at: new Date().toISOString(),
            read: false,
            priority: 'high'
          });
        }
      });

      // Buscar execuções de ações pendentes de feedback
      const { data: allExecutions } = await supabase
        .from('action_executions')
        .select(`
          id,
          patients (name),
          therapeutic_actions (name)
        `)
        .eq('completed', true);

      // Buscar quais execuções já têm feedback
      const { data: feedbackData } = await supabase
        .from('therapist_feedback')
        .select('execution_id');

      const executionIdsWithFeedback = new Set(
        feedbackData?.map(feedback => feedback.execution_id) || []
      );

      // Filtrar execuções que não têm feedback
      const pendingFeedback = allExecutions?.filter(
        execution => !executionIdsWithFeedback.has(execution.id)
      ).slice(0, 5) || [];

      pendingFeedback.forEach(execution => {
        notifications.push({
          id: `feedback-${execution.id}`,
          type: 'feedback',
          title: 'Feedback pendente',
          message: `${(execution.patients as any)?.name} aguarda feedback sobre "${(execution.therapeutic_actions as any)?.name}"`,
          created_at: new Date().toISOString(),
          read: false,
          priority: 'medium'
        });
      });

      // Buscar transações pendentes
      const { data: pendingTransactions } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          patients (name)
        `)
        .eq('status', 'pending')
        .limit(3);

      pendingTransactions?.forEach(transaction => {
        notifications.push({
          id: `payment-${transaction.id}`,
          type: 'payment',
          title: 'Pagamento pendente',
          message: `${(transaction.patients as any)?.name} - R$ ${transaction.amount}`,
          created_at: new Date().toISOString(),
          read: false,
          priority: 'medium'
        });
      });

      // Ordenar por prioridade e data
      const sortedNotifications = notifications.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setNotifications(sortedNotifications.slice(0, 5)); // Mostrar apenas as 5 mais importantes
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'feedback': return <MessageSquare className="w-4 h-4 text-orange-600" />;
      case 'payment': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-200';
      case 'medium': return 'bg-yellow-100 border-yellow-200';
      case 'low': return 'bg-gray-100 border-gray-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base sm:text-lg">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span>Notificações</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotifications([])}
              className="text-xs"
            >
              Limpar todas
            </Button>
          )}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Atualizações importantes da plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Nenhuma notificação no momento</p>
            <p className="text-xs mt-2">Você está em dia com suas atividades!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border ${getPriorityColor(notification.priority)} ${
                  notification.read ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notification.created_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-6 w-6 p-0"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNotification(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};