import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Shield, 
  Bell, 
  Database, 
  Key, 
  User, 
  Mail, 
  Phone, 
  Save,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Heart,
  AlertTriangle,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionManagement } from '@/components/configuracoes/PermissionManagement';
import { AIPromptsSettings } from '@/components/configuracoes/AIPromptsSettings';
import { CustomAIAgentSettings } from '@/components/analise-corporal/CustomAIAgentSettings';
import { EmailConflictManager } from '@/components/configuracoes/EmailConflictManager';
import { SubscriptionManagement } from '@/components/configuracoes/SubscriptionManagement';
import { CreditDashboard } from '@/components/credits/CreditDashboard';
import AIAgentsManagement from '@/components/configuracoes/AIAgentsManagement';
import { PatientPasswordLink } from '@/components/configuracoes/PatientPasswordLink';
import PatientPasswordManager from '@/components/configuracoes/PatientPasswordManager';
import { PatientImportCSV } from '@/components/patients/PatientImportCSV';
import { useCredits } from '@/hooks/useCredits';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'specialist' | 'secretary' | 'assistant';
  user_type?: 'therapist' | 'patient';
  is_active: boolean;
  created_at: string;
}

interface PatientUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
}

export const ConfiguracoesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [patientUsers, setPatientUsers] = useState<PatientUser[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [importCSVOpen, setImportCSVOpen] = useState(false);
  const { toast } = useToast();
  const { canManageUsers, canManageSettings, userProfile, isAdmin } = usePermissions();
  const { verifyPayment } = useCredits();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'assistant' as 'admin' | 'specialist' | 'secretary' | 'assistant',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    console.log('Inicializando página, carregando dados...');
    loadData();
    
    // Forçar recarga quando a página ganha foco
    const handleFocus = () => {
      console.log('Página ganhou foco, recarregando dados...');
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Check for payment success in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentStatus === 'success' && sessionId) {
      // Verify payment automatically
      verifyPayment(sessionId).then((result) => {
        if (result.success) {
          // Clear URL parameters after successful verification
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      });
    } else if (paymentStatus === 'canceled') {
      toast({
        title: 'Pagamento cancelado',
        description: 'Você cancelou o pagamento. Tente novamente quando desejar.',
        variant: 'destructive',
      });
      
      // Clear URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [verifyPayment]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar todos os perfis da conta atual (sistema multi-tenant)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        // Primeiro buscar o account_id do usuário atual
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('user_id', currentUser.id)
          .single();

        if (currentProfile?.account_id) {
          // Carregar usuários da mesma conta
          console.log('Buscando profiles com account_id:', currentProfile.account_id);
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_type', 'therapist')
            .eq('account_id', currentProfile.account_id)
            .order('created_at', { ascending: false });

          console.log('Profiles encontrados:', profilesData);
          console.log('Query SQL aproximada:', `SELECT * FROM profiles WHERE user_type = 'therapist' AND account_id = '${currentProfile.account_id}' ORDER BY created_at DESC`);
          console.log('Primeira execução de busca:', new Date().toISOString());
          
          if (profilesError) {
            console.error('Erro ao carregar profiles:', profilesError);
            throw profilesError;
          }
          setProfiles(profilesData || []);
        }
      }

      // Carregar pacientes com contas de usuário da mesma conta (sistema multi-tenant)
      if (currentUser) {
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('id, user_id, name, email, phone, is_active, created_at')
          .not('user_id', 'is', null)
          .order('created_at', { ascending: false });

        if (patientsError) throw patientsError;
        setPatientUsers(patientsData || []);
      }

      // Carregar permissões
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .order('name', { ascending: true });

      if (permissionsError) throw permissionsError;
      setPermissions(permissionsData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      // Verificar permissões
      if (!canManageUsers) {
        toast({
          title: 'Erro',
          description: 'Você não tem permissão para gerenciar usuários.',
          variant: 'destructive'
        });
        return;
      }

      // Validação dos campos obrigatórios
      if (!formData.full_name || !formData.email || (!editingProfile && !formData.password)) {
        toast({
          title: 'Erro',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive'
        });
        return;
      }

      // Validação do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: 'Erro',
          description: 'Digite um email válido.',
          variant: 'destructive'
        });
        return;
      }

      // Validação da senha para novos usuários
      if (!editingProfile && formData.password.length < 6) {
        toast({
          title: 'Erro',
          description: 'A senha deve ter pelo menos 6 caracteres.',
          variant: 'destructive'
        });
        return;
      }

      if (!editingProfile && formData.password !== formData.confirmPassword) {
        toast({
          title: 'Erro',
          description: 'As senhas não coincidem.',
          variant: 'destructive'
        });
        return;
      }

      // Verificar se o usuário não-admin está tentando criar um admin
      if (!isAdmin && formData.role === 'admin') {
        toast({
          title: 'Erro',
          description: 'Apenas administradores podem criar outros administradores.',
          variant: 'destructive'
        });
        return;
      }

      if (editingProfile) {
        // Atualizar perfil existente
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            role: formData.role
          })
          .eq('id', editingProfile.id);

        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Usuário atualizado com sucesso!',
        });
      } else {
        // Buscar usuário atual
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          throw new Error('Usuário não autenticado');
        }
        
        // Criar novo usuário usando edge function (não faz login automático)
        console.log('Iniciando criação de usuário via edge function:', formData);
        
        const { data: createUserResponse, error: createUserError } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role
          }
        });

        if (createUserError) {
          console.error('Erro ao criar usuário via edge function:', createUserError);
          throw new Error(createUserError.message || 'Erro ao criar usuário');
        }

        if (!createUserResponse?.success) {
          console.error('Edge function retornou erro:', createUserResponse);
          throw new Error(createUserResponse?.error || 'Erro ao criar usuário');
        }
        
        console.log('Usuário criado com sucesso via edge function:', createUserResponse);
        
        // Aguardar e verificar se o perfil foi criado
        console.log('Aguardando criação do perfil...');
        let attempts = 0;
        const maxAttempts = 10;
        let profileCreated = false;
        
        while (attempts < maxAttempts && !profileCreated) {
          attempts++;
          console.log(`Tentativa ${attempts}/${maxAttempts} - Verificando criação do perfil...`);
          
          await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
          
          // Verificar se o perfil foi criado
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const { data: currentProfile } = await supabase
              .from('profiles')
              .select('account_id')
              .eq('user_id', currentUser.id)
              .single();

            if (currentProfile?.account_id) {
              const { data: newUserProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_type', 'therapist')
                .eq('account_id', currentProfile.account_id)
                .eq('email', formData.email)
                .single();
                
              if (newUserProfile) {
                console.log('✅ Perfil criado com sucesso!', newUserProfile);
                profileCreated = true;
              } else {
                console.log(`❌ Perfil ainda não encontrado (tentativa ${attempts})`);
              }
            }
          }
        }
        
        if (!profileCreated) {
          console.warn('⚠️ Perfil não foi encontrado após múltiplas tentativas');
        }
        
        // Enviar email de boas-vindas personalizado
        if (createUserResponse?.user_id) {
          try {
            await supabase.functions.invoke('send-welcome-email', {
              body: {
                user_name: formData.full_name,
                user_email: formData.email,
                created_by: currentUser.user_metadata?.full_name || currentUser.email
              }
            });
          } catch (emailError) {
            console.warn('Erro ao enviar email de boas-vindas:', emailError);
          }
        }
        
        toast({
          title: 'Sucesso',
          description: 'Usuário criado com sucesso! Email de confirmação enviado.',
        });
        
        // Recarregar dados após pequeno delay adicional
        setTimeout(() => {
          console.log('Recarregando dados da lista...');
          loadData();
        }, 1000);
      }

      setIsDialogOpen(false);
      setEditingProfile(null);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      
      // Tratamento específico para diferentes tipos de erro
      let errorMessage = 'Não foi possível salvar o usuário.';
      
      if (error instanceof Error) {
        if (error.message.includes('hook_timeout')) {
          errorMessage = 'Tempo limite excedido. Tente novamente.';
        } else if (error.message.includes('User already registered')) {
          errorMessage = 'Este email já está registrado.';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Email inválido.';
        } else if (error.message.includes('Password too weak')) {
          errorMessage = 'Senha muito fraca.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado.';
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleToggleUserStatus = async (profileId: string, isActive: boolean) => {
    try {
      if (!canManageUsers) {
        toast({
          title: 'Erro',
          description: 'Você não tem permissão para alterar status de usuários.',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('id', profileId);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: `Usuário ${!isActive ? 'ativado' : 'desativado'} com sucesso!`,
      });
      
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive'
      });
    }
  };

  const handleTogglePatientStatus = async (patientId: string, isActive: boolean) => {
    try {
      if (!canManageUsers) {
        toast({
          title: 'Erro',
          description: 'Você não tem permissão para alterar status de pacientes.',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('patients')
        .update({ is_active: !isActive })
        .eq('id', patientId);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: `Acesso do paciente ${!isActive ? 'liberado' : 'bloqueado'} com sucesso!`,
      });
      
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar status do paciente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do paciente.',
        variant: 'destructive'
      });
    }
  };

  const openDeleteDialog = (profile: Profile) => {
    if (!canManageUsers) {
      toast({
        title: 'Erro',
        description: 'Você não tem permissão para excluir usuários.',
        variant: 'destructive'
      });
      return;
    }

    // Verificar se não está tentando excluir o próprio usuário
    if (profile.user_id === userProfile?.user_id) {
      toast({
        title: 'Erro',
        description: 'Você não pode excluir seu próprio usuário.',
        variant: 'destructive'
      });
      return;
    }

    // Verificar se é admin tentando excluir outro admin
    if (profile.role === 'admin' && !isAdmin) {
      toast({
        title: 'Erro',
        description: 'Apenas administradores podem excluir outros administradores.',
        variant: 'destructive'
      });
      return;
    }

    setUserToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      console.log('Iniciando exclusão do usuário:', userToDelete.user_id, userToDelete.full_name);
      
      // Excluir o perfil (as políticas RLS permitirão apenas se for admin ou o próprio usuário)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userToDelete.user_id);

      if (profileError) {
        console.error('Erro ao excluir perfil:', profileError);
        throw new Error(`Erro ao excluir perfil: ${profileError.message}`);
      }

      console.log('Perfil excluído com sucesso');

      // Atualizar o estado local imediatamente para remover o usuário da lista
      setProfiles(prev => prev.filter(p => p.user_id !== userToDelete.user_id));

      toast({
        title: 'Usuário excluído',
        description: `${userToDelete.full_name} foi removido do sistema com sucesso.`,
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      
      let errorMessage = 'Não foi possível excluir o usuário. ';
      
      if (error.message?.includes('row-level security')) {
        errorMessage += 'Você não tem permissão para excluir este usuário.';
      } else if (error.message?.includes('foreign key')) {
        errorMessage += 'Este usuário possui dados vinculados que impedem a exclusão.';
      } else {
        errorMessage += 'Tente novamente.';
      }
      
      toast({
        title: 'Erro ao excluir',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleEditProfile = (profile: Profile) => {
    if (!canManageUsers) {
      toast({
        title: 'Erro',
        description: 'Você não tem permissão para editar usuários.',
        variant: 'destructive'
      });
      return;
    }

    setEditingProfile(profile);
    setFormData({
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone || '',
      role: profile.role,
      password: '',
      confirmPassword: ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: 'assistant',
      password: '',
      confirmPassword: ''
    });
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      'admin': 'Administrador',
      'specialist': 'Especialista',
      'secretary': 'Secretário(a)',
      'assistant': 'Assistente'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      'admin': 'bg-red-100 text-red-800 border-red-200',
      'specialist': 'bg-blue-100 text-blue-800 border-blue-200',
      'secretary': 'bg-green-100 text-green-800 border-green-200',
      'assistant': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const filteredPatients = patientUsers.filter(patient =>
    patient.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    patient.email?.toLowerCase().includes(patientSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Configure o sistema e gerencie usuários
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="patients">Pacientes</TabsTrigger>
          <TabsTrigger value="ai-agents">Agentes IA</TabsTrigger>
          <TabsTrigger value="subscription">Assinatura</TabsTrigger>
          <TabsTrigger value="credits">Créditos</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>Gerenciamento de Usuários</span>
                  </CardTitle>
                  <CardDescription>
                    Gerencie usuários do sistema e suas permissões
                  </CardDescription>
                </div>
                
                {canManageUsers && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        console.log('Recarregando dados manualmente...');
                        loadData();
                      }}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <span>Atualizar</span>
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="flex items-center space-x-2"
                          onClick={() => {
                            setEditingProfile(null);
                            resetForm();
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Novo Usuário</span>
                        </Button>
                      </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProfile ? 'Editar Usuário' : 'Novo Usuário'}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Nome Completo *</Label>
                          <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                            placeholder="Digite o nome completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="Digite o email"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Função *</Label>
                          <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value as any})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a função" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="assistant">Assistente</SelectItem>
                              <SelectItem value="secretary">Secretário(a)</SelectItem>
                              <SelectItem value="specialist">Especialista</SelectItem>
                              {isAdmin && <SelectItem value="admin">Administrador</SelectItem>}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {!editingProfile && (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label htmlFor="password">Senha * (mínimo 6 caracteres)</Label>
                             <div className="relative">
                               <Input
                                 id="password"
                                 type={showPassword ? "text" : "password"}
                                 value={formData.password}
                                 onChange={(e) => setFormData({...formData, password: e.target.value})}
                                 placeholder="Digite a senha (mín. 6 caracteres)"
                                 minLength={6}
                               />
                               <Button
                                 type="button"
                                 variant="ghost"
                                 size="sm"
                                 className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                 onClick={() => setShowPassword(!showPassword)}
                               >
                                 {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                               </Button>
                             </div>
                             {formData.password && formData.password.length < 6 && (
                               <p className="text-sm text-destructive">A senha deve ter pelo menos 6 caracteres</p>
                             )}
                           </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                            <div className="relative">
                              <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                placeholder="Confirme a senha"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                         </div>
                       )}
                     </div>
                    
                     <DialogFooter>
                       <div className="flex justify-end space-x-4 pt-6 border-t">
                         <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                           Cancelar
                         </Button>
                         <Button onClick={handleSaveUser}>
                           {editingProfile ? 'Atualizar' : 'Criar'}
                         </Button>
                       </div>
                     </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Debug info */}
              <div className="mb-4 p-2 bg-muted rounded text-sm">
                <strong>Debug:</strong> {profiles.length} usuários carregados
                {profiles.length > 0 && (
                  <div className="mt-1 text-xs">
                    Último criado: {profiles[0]?.full_name} ({profiles[0]?.email}) em {new Date(profiles[0]?.created_at).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{profile.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Badge className={getRoleColor(profile.role)}>
                        {getRoleLabel(profile.role)}
                      </Badge>
                      {canManageUsers && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={profile.is_active}
                            onCheckedChange={() => handleToggleUserStatus(profile.id, profile.is_active)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {profile.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      )}
                      {canManageUsers && (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProfile(profile)}
                            title="Editar usuário"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(profile)}
                            title="Excluir usuário"
                            className="hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <PatientPasswordManager />
          <PatientPasswordLink />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-primary" />
                    <span>Pacientes com Conta de Usuário</span>
                  </CardTitle>
                  <CardDescription>
                    Gerencie o acesso dos pacientes que possuem login no sistema. 
                    <br />
                    <span className="text-xs text-muted-foreground">
                      Pacientes sem conta de usuário aparecem apenas no gerenciamento geral de pacientes.
                    </span>
                  </CardDescription>
                </div>
                 
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => setImportCSVOpen(true)}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Importar CSV</span>
                  </Button>
                  
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar pacientes..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {patientSearch ? 'Nenhum paciente encontrado com este termo de busca.' : 'Nenhum paciente com conta de usuário encontrado.'}
                    </p>
                  </div>
                ) : (
                  filteredPatients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                          <Heart className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{patient.name}</h4>
                          <p className="text-sm text-muted-foreground">{patient.email}</p>
                          {patient.phone && (
                            <p className="text-sm text-muted-foreground">{patient.phone}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Badge className={patient.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}>
                          {patient.is_active ? 'Acesso Liberado' : 'Acesso Bloqueado'}
                        </Badge>
                        {canManageUsers && (
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={patient.is_active}
                              onCheckedChange={() => handleTogglePatientStatus(patient.id, patient.is_active)}
                            />
                            <span className="text-sm text-muted-foreground">
                              {patient.is_active ? 'Liberar' : 'Bloquear'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {filteredPatients.length > 0 && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Resumo</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total de pacientes:</span>
                      <span className="ml-2 font-medium">{filteredPatients.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Com acesso liberado:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {filteredPatients.filter(p => p.is_active).length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-agents" className="space-y-6">
          <AIAgentsManagement />
          {canManageSettings && <AIPromptsSettings />}
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionManagement />
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <EmailConflictManager />
        </TabsContent>

        <TabsContent value="credits" className="space-y-6">
          <CreditDashboard />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {canManageSettings ? (
            <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <span>Configurações do Sistema</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Configurações Gerais</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifications">Notificações</Label>
                      <Switch id="notifications" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="backup">Backup Automático</Label>
                      <Switch id="backup" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maintenance">Modo Manutenção</Label>
                      <Switch id="maintenance" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Configurações de Segurança</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="twoFactor">Autenticação 2FA</Label>
                      <Switch id="twoFactor" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="loginLogs">Logs de Login</Label>
                      <Switch id="loginLogs" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sessionTimeout">Timeout de Sessão</Label>
                      <Switch id="sessionTimeout" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <CustomAIAgentSettings />
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  Você não tem permissão para acessar as configurações do sistema.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <PermissionManagement />
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span>Confirmar Exclusão</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a excluir permanentemente o usuário:
              </p>
              <div className="p-3 bg-muted rounded-lg border">
                <p className="font-medium text-foreground">{userToDelete?.full_name}</p>
                <p className="text-sm text-muted-foreground">{userToDelete?.email}</p>
                <p className="text-sm text-muted-foreground">
                  Função: {userToDelete ? getRoleLabel(userToDelete.role) : ''}
                </p>
              </div>
              <p className="text-destructive font-medium">
                ⚠️ Esta ação não pode ser desfeita! O usuário perderá acesso ao sistema permanentemente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, excluir usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV Modal */}
      <PatientImportCSV
        isOpen={importCSVOpen}
        onClose={() => setImportCSVOpen(false)}
        onImportComplete={loadData}
      />
    </div>
  );
};