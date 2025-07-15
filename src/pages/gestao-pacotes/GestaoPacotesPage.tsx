import React from 'react';
import { Package, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/hooks/usePermissions';
import { CreditPackageManagement } from '@/components/configuracoes/CreditPackageManagement';

export const GestaoPacotesPage: React.FC = () => {
  const { isAdmin } = usePermissions();

  // Verificar se o usuário é administrador
  if (!isAdmin) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <Shield className="w-16 h-16 text-muted-foreground" />
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
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Pacotes</h1>
          <p className="text-muted-foreground">
            Configure e gerencie os pacotes de crédito da plataforma
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-primary" />
            <span>Pacotes de Crédito</span>
          </CardTitle>
          <CardDescription>
            Crie, edite e gerencie os pacotes de crédito disponíveis para os usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreditPackageManagement />
        </CardContent>
      </Card>
    </div>
  );
};