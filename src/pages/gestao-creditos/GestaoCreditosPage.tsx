import React from 'react';
import { Coins } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/hooks/usePermissions';
import { PlatformCreditManagement } from '@/components/configuracoes/PlatformCreditManagement';

export const GestaoCreditosPage: React.FC = () => {
  const { isAdmin } = usePermissions();

  // Verificar se o usuário é administrador
  if (!isAdmin) {
    return (
      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <Coins className="w-16 h-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Acesso Restrito</h2>
              <p className="text-muted-foreground max-w-md">
                Esta página é exclusiva para administradores da plataforma. 
                Entre em contato com um administrador se você precisa acessar esta funcionalidade.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestão de Créditos da Plataforma</h1>
          <p className="text-muted-foreground">
            Gerencie os créditos de todas as contas da plataforma
          </p>
        </div>
      </div>

      <PlatformCreditManagement />
    </div>
  );
};