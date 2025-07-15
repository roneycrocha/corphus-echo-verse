import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Save, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions, UserRole } from '@/hooks/usePermissions';

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface RolePermission {
  id: string;
  role: UserRole;
  permission_id: string;
  permission_name: string;
  description: string;
}

interface PermissionState {
  [role: string]: {
    [permissionId: string]: boolean;
  };
}

const ROLES = [
  { 
    key: 'admin', 
    label: 'Administrador', 
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Acesso total ao sistema'
  },
  { 
    key: 'specialist', 
    label: 'Especialista', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Foco em atendimento e tratamentos'
  },
  { 
    key: 'secretary', 
    label: 'Secretário(a)', 
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Gestão de pacientes e agendamentos'
  },
  { 
    key: 'assistant', 
    label: 'Assistente', 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Operações básicas do sistema'
  }
];

const PERMISSION_CATEGORIES = {
  'manage_users': {
    category: 'Usuários',
    icon: '👥',
    color: 'text-blue-600'
  },
  'manage_patients': {
    category: 'Pacientes',
    icon: '🏥',
    color: 'text-green-600'
  },
  'manage_appointments': {
    category: 'Agenda',
    icon: '📅',
    color: 'text-purple-600'
  },
  'manage_medical_records': {
    category: 'Prontuários',
    icon: '📋',
    color: 'text-orange-600'
  },
  'manage_treatments': {
    category: 'Tratamentos',
    icon: '💊',
    color: 'text-teal-600'
  },
  'manage_exercises': {
    category: 'Exercícios',
    icon: '🏃‍♂️',
    color: 'text-indigo-600'
  },
  'view_reports': {
    category: 'Relatórios',
    icon: '📊',
    color: 'text-pink-600'
  },
  'system_settings': {
    category: 'Configurações',
    icon: '⚙️',
    color: 'text-gray-600'
  }
};

export const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [permissionState, setPermissionState] = useState<PermissionState>({});
  const [originalState, setOriginalState] = useState<PermissionState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { canManageSettings } = usePermissions();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar permissões
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .order('name', { ascending: true });

      if (permissionsError) throw permissionsError;

      // Carregar role_permissions
      const { data: rolePermissionsData, error: rolePermissionsError } = await supabase
        .from('role_permissions')
        .select(`
          id,
          role,
          permission_id,
          permissions (
            name,
            description
          )
        `)
        .order('role', { ascending: true });

      if (rolePermissionsError) throw rolePermissionsError;

      const formattedRolePermissions = rolePermissionsData?.map(rp => ({
        id: rp.id,
        role: rp.role,
        permission_id: rp.permission_id,
        permission_name: rp.permissions?.name || '',
        description: rp.permissions?.description || ''
      })) || [];

      setPermissions(permissionsData || []);
      setRolePermissions(formattedRolePermissions);

      // Criar estado das permissões
      const state: PermissionState = {};
      ROLES.forEach(role => {
        state[role.key] = {};
        permissionsData?.forEach(permission => {
          const hasPermission = formattedRolePermissions.some(
            rp => rp.role === role.key && rp.permission_id === permission.id
          );
          state[role.key][permission.id] = hasPermission;
        });
      });

      setPermissionState(state);
      setOriginalState(JSON.parse(JSON.stringify(state)));

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as permissões.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (role: string, permissionId: string) => {
    if (!canManageSettings) {
      toast({
        title: 'Erro',
        description: 'Você não tem permissão para alterar permissões.',
        variant: 'destructive'
      });
      return;
    }

    setPermissionState(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionId]: !prev[role][permissionId]
      }
    }));
  };

  const hasChanges = () => {
    return JSON.stringify(permissionState) !== JSON.stringify(originalState);
  };

  const resetChanges = () => {
    setPermissionState(JSON.parse(JSON.stringify(originalState)));
  };

  const saveChanges = async () => {
    if (!canManageSettings) {
      toast({
        title: 'Erro',
        description: 'Você não tem permissão para salvar alterações.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      // Primeiro, deletar todas as role_permissions existentes
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos

      if (deleteError) throw deleteError;

      // Inserir as novas permissões
      const newRolePermissions: any[] = [];
      Object.entries(permissionState).forEach(([role, rolePermissions]) => {
        Object.entries(rolePermissions).forEach(([permissionId, hasPermission]) => {
          if (hasPermission) {
            newRolePermissions.push({
              role: role as UserRole,
              permission_id: permissionId
            });
          }
        });
      });

      if (newRolePermissions.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(newRolePermissions);

        if (insertError) throw insertError;
      }

      setOriginalState(JSON.parse(JSON.stringify(permissionState)));
      
      toast({
        title: 'Sucesso',
        description: 'Permissões atualizadas com sucesso!',
      });

    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  if (!canManageSettings) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Você não tem permissão para gerenciar permissões do sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <span>Controle de Acesso por Função</span>
              </CardTitle>
              <CardDescription>
                Defina quais módulos e funcionalidades cada função pode acessar no sistema
              </CardDescription>
            </div>
            
            {hasChanges() && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetChanges}
                  disabled={saving}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Desfazer
                </Button>
                <Button
                  size="sm"
                  onClick={saveChanges}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Cabeçalho das funções */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="grid grid-cols-5 gap-4">
                <div className="font-semibold text-foreground">Módulos do Sistema</div>
                {ROLES.map(role => (
                  <div key={role.key} className="text-center space-y-2">
                    <Badge className={role.color}>
                      {role.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Linhas de permissões organizadas por categoria */}
            <div className="space-y-6">
              {permissions.map(permission => {
                const category = PERMISSION_CATEGORIES[permission.name as keyof typeof PERMISSION_CATEGORIES];
                return (
                  <div key={permission.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          {category && (
                            <span className="text-lg" role="img" aria-label={category.category}>
                              {category.icon}
                            </span>
                          )}
                          <div>
                            <h4 className={`font-semibold ${category?.color || 'text-foreground'}`}>
                              {category?.category || permission.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">{permission.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      {ROLES.map(role => (
                        <div key={`${role.key}-${permission.id}`} className="flex justify-center">
                          <div className="flex flex-col items-center space-y-2">
                            <Switch
                              checked={permissionState[role.key]?.[permission.id] || false}
                              onCheckedChange={() => togglePermission(role.key, permission.id)}
                              disabled={saving}
                            />
                            <span className="text-xs text-muted-foreground">
                              {permissionState[role.key]?.[permission.id] ? 'Permitido' : 'Negado'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumo das mudanças */}
            {hasChanges() && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <h4 className="font-medium text-yellow-800">Alterações Pendentes</h4>
                </div>
                <div className="text-sm text-yellow-700">
                  Você tem alterações não salvas nas permissões. Clique em "Salvar Alterações" para aplicá-las ao sistema.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards informativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Funções do Sistema</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ROLES.map(role => (
              <div key={role.key} className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
                <Badge className={role.color} variant="outline">
                  {role.label}
                </Badge>
                <span className="text-sm text-muted-foreground">{role.description}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <div className="w-5 h-5">🏥</div>
              <span>Módulos da Plataforma</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
              <div key={key} className="flex items-center space-x-3 p-2 hover:bg-muted/20 rounded-lg transition-colors">
                <span className="text-lg" role="img" aria-label={category.category}>
                  {category.icon}
                </span>
                <span className={`font-medium ${category.color}`}>
                  {category.category}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Guia de uso */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <div className="w-5 h-5">💡</div>
            <span>Como Usar</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</div>
              <div>
                <p className="font-medium">Selecione a Função</p>
                <p className="text-muted-foreground">Cada coluna representa uma função diferente no sistema</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</div>
              <div>
                <p className="font-medium">Configure Permissões</p>
                <p className="text-muted-foreground">Use os switches para permitir ou negar acesso a cada módulo</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</div>
              <div>
                <p className="font-medium">Salve as Alterações</p>
                <p className="text-muted-foreground">Clique em "Salvar Alterações" para aplicar as configurações</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};