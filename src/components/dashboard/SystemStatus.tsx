import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Wifi, 
  Database, 
  Server, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface SystemStatusInfo {
  database: 'online' | 'offline' | 'slow';
  api: 'online' | 'offline' | 'slow';
  connection: 'online' | 'offline' | 'slow';
  lastUpdate: Date;
}

/**
 * Componente de status do sistema
 */
export const SystemStatus: React.FC = () => {
  const [status, setStatus] = useState<SystemStatusInfo>({
    database: 'online',
    api: 'online',
    connection: 'online',
    lastUpdate: new Date()
  });

  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 60000); // Verificar a cada minuto
    
    return () => clearInterval(interval);
  }, []);

  const checkSystemStatus = async () => {
    const startTime = performance.now();
    
    try {
      // Testar conexão com o banco
      const { error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      setStatus({
        database: dbError ? 'offline' : responseTime > 2000 ? 'slow' : 'online',
        api: 'online',
        connection: navigator.onLine ? 'online' : 'offline',
        lastUpdate: new Date()
      });
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        database: 'offline',
        api: 'offline',
        lastUpdate: new Date()
      }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return { label: 'Online', variant: 'default' as const, icon: CheckCircle2 };
      case 'slow':
        return { label: 'Lento', variant: 'secondary' as const, icon: AlertTriangle };
      case 'offline':
        return { label: 'Offline', variant: 'destructive' as const, icon: AlertTriangle };
      default:
        return { label: 'Desconhecido', variant: 'outline' as const, icon: AlertTriangle };
    }
  };

  const systemItems = [
    {
      name: 'Banco de Dados',
      status: status.database,
      icon: Database
    },
    {
      name: 'Conexão',
      status: status.connection,
      icon: Wifi
    },
    {
      name: 'Serviços',
      status: status.api,
      icon: Server
    }
  ];

  const overallStatus = systemItems.every(item => item.status === 'online') ? 'online' : 
                      systemItems.some(item => item.status === 'offline') ? 'offline' : 'slow';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base sm:text-lg">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span>Status do Sistema</span>
          </div>
          <Badge 
            variant={getStatusBadge(overallStatus).variant}
            className="text-xs"
          >
            {getStatusBadge(overallStatus).label}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Monitoramento em tempo real dos serviços
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {systemItems.map((item) => {
            const statusInfo = getStatusBadge(item.status);
            return (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <Badge 
                  variant={statusInfo.variant}
                  className="text-xs flex items-center space-x-1"
                >
                  <statusInfo.icon className="w-3 h-3" />
                  <span>{statusInfo.label}</span>
                </Badge>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Última verificação: {status.lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};