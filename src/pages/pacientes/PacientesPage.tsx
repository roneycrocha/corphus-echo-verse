import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  Calendar,
  FileText,
  Activity,
  MoreHorizontal,
  Send,
  Link,
  Copy,
  UserPlus,
  ExternalLink,
  Key
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SendLinkDialog } from '@/components/patients/SendLinkDialog';
import { DeletePatientModal } from '@/components/patients/DeletePatientModal';

import { useNavigate } from 'react-router-dom';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birth_date: string;
  gender: string;
  occupation: string;
  whatsapp?: string;
  avatar_url?: string;
  social_media?: any;
  address?: any;
  emergency_contact?: any;
  user_id?: string; // Adicionado para verificar se já tem acesso
  created_at: string;
  updated_at: string;
}

/**
 * Página de Cadastro e Gerenciamento de Pacientes
 * CRUD completo para pacientes da clínica
 */
export const PacientesPage: React.FC = () => {
  console.log('PacientesPage component loaded - no TestTube references');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  
  const [filterGender, setFilterGender] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [sendLinkDialogOpen, setSendLinkDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      
      // Obter o usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Carregando pacientes para usuário:', currentUser.id);

      const { data, error } = await supabase
        .from('patients')
        .select('*, user_id') // Incluir user_id na consulta (agora filtrado via RLS por account_id)
        .order('created_at', { ascending: false });

      console.log('Resultado da consulta de pacientes:', { data, error, count: data?.length });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de pacientes.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPatient = (patient: Patient) => {
    // Navegar para a página de cadastro com os dados do paciente para edição
    navigate('/pacientes/cadastrar', { 
      state: { 
        editingPatient: patient 
      } 
    });
  };

  const handleDeletePatient = (patient: Patient) => {
    setPatientToDelete(patient);
    setDeleteModalOpen(true);
  };

  const confirmDeletePatient = async () => {
    if (!patientToDelete) return;

    try {
      setIsDeleting(true);
      console.log('Iniciando exclusão do paciente:', patientToDelete.id);
      
      // Verificar se o usuário atual pode deletar este paciente
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Usuário atual:', currentUser?.id);
      
      // Verificar o perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser?.id)
        .single();
      
      console.log('Perfil do usuário:', profile);
      console.log('Paciente a ser deletado:', patientToDelete);
      
      // Tentar deletar primeiro sem select para ver se a política permite
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientToDelete.id);

      console.log('Resultado da exclusão:', { error });

      if (error) {
        console.error('Erro específico na exclusão:', error);
        
        // Se deu erro, vamos tentar verificar se o paciente existe
        const { data: existingPatient } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientToDelete.id)
          .single();
        
        console.log('Paciente ainda existe?', existingPatient);
        throw error;
      }
      
      // Verificar se o paciente realmente foi deletado
      const { data: deletedCheck } = await supabase
        .from('patients')
        .select('id')
        .eq('id', patientToDelete.id)
        .single();
      
      console.log('Verificação pós-delete (deve ser null):', deletedCheck);
      
      // Remover da lista local imediatamente apenas se a exclusão foi bem-sucedida
      setPatients(prevPatients => {
        const updatedPatients = prevPatients.filter(p => p.id !== patientToDelete.id);
        console.log('Lista atualizada localmente:', updatedPatients.length, 'pacientes restantes');
        return updatedPatients;
      });
      
      toast({
        title: 'Sucesso',
        description: 'Paciente removido com sucesso!',
      });
      
      setDeleteModalOpen(false);
      setPatientToDelete(null);
      
      // Recarregar a lista para garantir sincronização
      console.log('Recarregando lista de pacientes...');
      await loadPatients();
    } catch (error) {
      console.error('Erro ao deletar paciente:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível remover o paciente: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setPatientToDelete(null);
  };

  const handleSendInvite = async (patient: Patient) => {
    if (!patient.email) {
      toast({
        title: 'Erro',
        description: 'Este paciente não possui email cadastrado.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('https://jqystivdecrjuulxyxet.supabase.co/functions/v1/send-patient-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          patientName: patient.name,
          patientEmail: patient.email,
          clinicName: 'Monitor Terapêutico'
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar convite');
      }

      toast({
        title: 'Convite Enviado!',
        description: `Email de convite enviado para ${patient.name} (${patient.email})`,
      });
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o convite. Tente novamente.',
        variant: 'destructive'
      });
    }
  };



  const handleGeneratePatientLink = (patient?: Patient) => {
    console.log('handleGeneratePatientLink chamado com:', patient);
    console.log('Definindo selectedPatient como:', patient);
    setSelectedPatient(patient || null);
    console.log('Abrindo dialog...');
    setSendLinkDialogOpen(true);
  };

  const handleCreatePatientAccess = async (patient: Patient) => {
    if (!patient.email) {
      toast({
        title: 'Erro',
        description: 'Este paciente não possui email cadastrado.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Obter dados do terapeuta para o email
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const { data: therapistProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', currentUser.id)
        .single();

      toast({
        title: 'Criando credenciais...',
        description: 'Aguarde enquanto criamos o acesso do paciente.',
      });

      const { data: accessResult, error: accessError } = await supabase.functions.invoke('create-patient-access', {
        body: {
          patientId: patient.id,
          patientEmail: patient.email,
          patientName: patient.name,
          therapistName: therapistProfile?.full_name || 'Seu terapeuta'
        }
      });

      if (accessError) {
        console.error('Erro da edge function:', accessError);
        throw new Error(`Erro na comunicação com o servidor: ${accessError.message}`);
      }

      if (accessResult?.success) {
        if (accessResult.userExists || accessResult.wasLinked) {
          toast({
            title: 'Acesso configurado!',
            description: `${patient.name} ${accessResult.wasLinked ? 'foi vinculado a uma conta existente' : 'já possui acesso'}. Um email foi enviado com instruções.`,
          });
        } else {
          toast({
            title: 'Credenciais criadas!',
            description: `${patient.name} recebeu um email com as credenciais de acesso.`,
          });
        }
        
        // Recarregar a lista para atualizar o status
        await loadPatients();
      } else if (accessResult?.error) {
        if (accessResult.isTherapist) {
          throw new Error(`Conflito de email: ${accessResult.message}`);
        } else if (accessResult.isPatient) {
          throw new Error(`Email já em uso: ${accessResult.message}`);
        } else {
          throw new Error(accessResult.message || accessResult.error);
        }
      } else {
        throw new Error('Resposta inesperada do servidor');
      }
    } catch (error: any) {
      console.error('Erro ao criar credenciais:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível criar as credenciais: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.phone?.includes(searchTerm);
    const matchesGender = filterGender === 'all' || patient.gender === filterGender;
    return matchesSearch && matchesGender;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando pacientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Pacientes</h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie todos os pacientes da clínica
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Botão para cadastro completo */}
          <Button 
            variant="default"
            className="flex items-center space-x-2"
            onClick={() => navigate('/pacientes/cadastrar')}
          >
            <Plus className="w-4 h-4" />
            <span>Novo Paciente</span>
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pacientes
            </CardTitle>
            <Users className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">{patients.length}</div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pacientes Ativos
            </CardTitle>
            <Activity className="w-5 h-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">{patients.length}</div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Novos Este Mês
            </CardTitle>
            <Calendar className="w-5 h-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">
              {patients.filter(p => {
                const created = new Date(p.created_at);
                const now = new Date();
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Idade Média
            </CardTitle>
            <Users className="w-5 h-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">
              {patients.length > 0 ? Math.round(
                patients.filter(p => p.birth_date).reduce((acc, p) => acc + calculateAge(p.birth_date), 0) / 
                patients.filter(p => p.birth_date).length
              ) : 0} anos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterGender} onValueChange={setFilterGender}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por gênero" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="masculino">Masculino</SelectItem>
            <SelectItem value="feminino">Feminino</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de pacientes */}
      <Card>
        <CardHeader>
          <CardTitle>Pacientes Cadastrados</CardTitle>
          <CardDescription>
            {filteredPatients.length} de {patients.length} pacientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{patient.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {patient.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{patient.email}</span>
                        </div>
                      )}
                      {patient.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{patient.phone}</span>
                        </div>
                      )}
                      {patient.birth_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{calculateAge(patient.birth_date)} anos</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {patient.occupation && (
                    <Badge variant="secondary" className="hidden sm:inline-flex">
                      {patient.occupation}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {patient.gender}
                  </Badge>
                   <div className="flex items-center space-x-1">
                     {/* Botão para criar credenciais - só aparece se paciente não tem user_id */}
                     {!patient.user_id && patient.email && (
                       <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={() => handleCreatePatientAccess(patient)}
                         title="Criar credenciais de acesso"
                         className="text-purple-600 hover:text-purple-700"
                       >
                         <Key className="w-4 h-4" />
                       </Button>
                     )}
                     {/* Badge para indicar se já tem acesso */}
                     {patient.user_id && (
                       <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                         ✓ Tem Acesso
                       </Badge>
                     )}
                     {patient.email && (
                       <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={() => handleSendInvite(patient)}
                         title="Enviar convite por email"
                         className="text-blue-600 hover:text-blue-700"
                       >
                         <Send className="w-4 h-4" />
                       </Button>
                     )}
                     <Button 
                       variant="ghost" 
                       size="sm"
                       onClick={() => handleGeneratePatientLink(patient)}
                       title="Gerar link de cadastro"
                       className="text-green-600 hover:text-green-700"
                     >
                       <Link className="w-4 h-4" />
                     </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditPatient(patient)}
                        title="Editar paciente"
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                     <Button 
                       variant="ghost" 
                       size="sm"
                       onClick={() => handleDeletePatient(patient)}
                       title="Excluir paciente"
                       className="text-red-600 hover:text-red-700"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SendLinkDialog 
        open={sendLinkDialogOpen}
        onOpenChange={setSendLinkDialogOpen}
        patientData={selectedPatient}
      />
      
      {/* Delete Patient Modal */}
      <DeletePatientModal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeletePatient}
        patient={patientToDelete}
        isDeleting={isDeleting}
      />
      
    </div>
  );
};