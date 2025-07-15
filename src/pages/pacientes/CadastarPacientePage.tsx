import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Send,
  Link,
  X,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PatientFormData {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  birth_date: string;
  gender: string;
  occupation: string;
  document: string;
  document_type: string;
  address: {
    zipcode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export const CadastrarPacientePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Estados para criação de credenciais
  const [createAccess, setCreateAccess] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);

  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    birth_date: '',
    gender: '',
    occupation: '',
    document: '',
    document_type: 'cpf',
    address: {
      zipcode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    },
    emergency_contact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  // Carregar dados do paciente para edição
  useEffect(() => {
    const editingPatient = location.state?.editingPatient;
    if (editingPatient) {
      console.log('Carregando dados do paciente para edição:', editingPatient);
      setIsEditMode(true);
      setEditingPatientId(editingPatient.id);
      
      setFormData({
        name: editingPatient.name || '',
        email: editingPatient.email || '',
        phone: editingPatient.phone || '',
        whatsapp: editingPatient.whatsapp || '',
        birth_date: editingPatient.birth_date || '',
        gender: editingPatient.gender || '',
        occupation: editingPatient.occupation || '',
        document: editingPatient.document || '',
        document_type: editingPatient.document_type || 'cpf',
        address: {
          zipcode: editingPatient.address?.zipcode || '',
          street: editingPatient.address?.street || '',
          number: editingPatient.address?.number || '',
          complement: editingPatient.address?.complement || '',
          neighborhood: editingPatient.address?.neighborhood || '',
          city: editingPatient.address?.city || '',
          state: editingPatient.address?.state || ''
        },
        emergency_contact: {
          name: editingPatient.emergency_contact?.name || '',
          phone: editingPatient.emergency_contact?.phone || '',
          relationship: editingPatient.emergency_contact?.relationship || ''
        }
      });
    }
  }, [location.state]);

  const searchCEP = async (cep: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData({
          ...formData,
          address: {
            ...formData.address,
            zipcode: cep,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleSavePatient = async (skipNavigation = false) => {
    try {
      if (!formData.name) {
        toast({
          title: 'Erro',
          description: 'O nome é obrigatório.',
          variant: 'destructive'
        });
        return null;
      }

      setIsLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      let patientId = null;

      if (isEditMode && editingPatientId) {
        // Obter o account_id do usuário atual para validação
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('user_id', currentUser.id)
          .single();

        if (profileError) {
          throw new Error('Erro ao obter dados do perfil');
        }

        // Atualizar paciente existente
        const { error } = await supabase
          .from('patients')
          .update({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            whatsapp: formData.whatsapp || null,
            birth_date: formData.birth_date || null,
            gender: formData.gender || null,
            occupation: formData.occupation || null,
            document: formData.document || null,
            document_type: formData.document_type,
            address: formData.address,
            emergency_contact: formData.emergency_contact,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPatientId)
          .eq('account_id', userProfile.account_id); // Garantir que só edite pacientes da mesma conta

        if (error) throw error;
        
        patientId = editingPatientId;
        
        if (!skipNavigation) {
          toast({
            title: 'Sucesso',
            description: 'Paciente atualizado com sucesso!',
          });
        }
      } else {
        // Obter o account_id do usuário atual
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('user_id', currentUser.id)
          .single();

        if (profileError) {
          throw new Error('Erro ao obter dados do perfil');
        }

        // Criar novo paciente
        const { data, error } = await supabase
          .from('patients')
          .insert({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            whatsapp: formData.whatsapp || null,
            birth_date: formData.birth_date || null,
            gender: formData.gender || null,
            occupation: formData.occupation || null,
            document: formData.document || null,
            document_type: formData.document_type,
            address: formData.address,
            emergency_contact: formData.emergency_contact,
            created_by: currentUser.id,
            account_id: userProfile.account_id
          })
          .select()
          .single();

        if (error) throw error;
        
        patientId = data.id;
        
        if (!skipNavigation) {
          toast({
            title: 'Sucesso',
            description: 'Paciente cadastrado com sucesso!',
          });
        }
      }
      
      if (!skipNavigation) {
        navigate('/pacientes');
      }
      
      return patientId;
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o paciente.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!formData.email) {
      toast({
        title: 'Erro',
        description: 'Email é obrigatório para enviar convite.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSendingInvite(true);
      
      // Primeiro salvar o paciente
      await handleSavePatient(false);
      
      // Depois enviar o convite
      const { error } = await supabase.functions.invoke('send-patient-invite', {
        body: {
          patientEmail: formData.email,
          patientName: formData.name
        }
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Convite enviado por email com sucesso!',
      });
      
      navigate('/pacientes');
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o convite.',
        variant: 'destructive'
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleGenerateLink = async () => {
    try {
      setIsGeneratingLink(true);
      
      // Primeiro salvar o paciente se for novo ou atualizar se for edição
      const savedPatientId = await handleSavePatient(true);
      
      // Obter dados do usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Preparar dados do paciente incluindo ID se for edição
      const patientDataForLink = {
        id: isEditMode ? editingPatientId : savedPatientId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        birth_date: formData.birth_date,
        gender: formData.gender,
        occupation: formData.occupation,
        whatsapp: formData.whatsapp
      };
      
      // Gerar o link usando a edge function correta
      const { data, error } = await supabase.functions.invoke('generate-patient-registration-link', {
        body: {
          patientData: patientDataForLink,
          isEdit: isEditMode || false
        }
      });

      if (error) throw error;

      if (data?.registrationUrl) {
        navigator.clipboard.writeText(data.registrationUrl);
        toast({
          title: 'Sucesso',
          description: `Link de ${isEditMode ? 'edição' : 'cadastro'} copiado para a área de transferência!`,
        });
      }
      
      navigate('/pacientes');
    } catch (error) {
      console.error('Erro ao gerar link:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível gerar o link de ${isEditMode ? 'edição' : 'cadastro'}.`,
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Funções para o avatar
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
  };

  // Função para criar paciente com credenciais
  const handleCreateWithCredentials = async () => {
    if (!formData.name || !formData.email) {
      toast({
        title: 'Erro',
        description: 'Nome e email são obrigatórios para criar credenciais.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      let avatarUrl = '';
      
      // Upload do avatar se fornecido
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) {
          console.error('Erro no upload do avatar:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          avatarUrl = publicUrl;
        }
      }

      // Criar o paciente usando a edge function
      const { data, error } = await supabase.functions.invoke('create-patient-account', {
        body: {
          patientData: {
            ...formData,
            avatar_url: avatarUrl
          },
          password: Math.random().toString(36).slice(-8) // Senha temporária gerada automaticamente
        }
      });

      if (error) throw error;

      let successMessage = `Paciente ${formData.name} cadastrado com sucesso.`;
      if (data?.tempPassword) {
        successMessage += ` Senha temporária: ${data.tempPassword}`;
      }

      toast({
        title: 'Sucesso',
        description: successMessage
      });

      navigate('/pacientes');
    } catch (error: any) {
      console.error('Erro ao criar paciente:', error);
      
      let errorMessage = 'Erro ao cadastrar paciente.';
      
      if (error.message?.includes('duplicate key value violates unique constraint')) {
        errorMessage = 'Já existe um paciente com este email.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Email inválido.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pacientes')}
              className="flex items-center space-x-2 hover:bg-background/80"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                {isEditMode ? 'Editar Paciente' : 'Cadastrar Paciente'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isEditMode 
                  ? 'Edite os dados do paciente. Os campos marcados com * são obrigatórios.'
                  : 'Preencha os dados do paciente. Os campos marcados com * são obrigatórios.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Opção para criar credenciais - Card separado no topo */}
        {!isEditMode && (
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Mail className="w-5 h-5 text-primary" />
                <span>Opções de Acesso</span>
              </CardTitle>
              <CardDescription>
                Configure como o paciente irá acessar a plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="createAccess" 
                  checked={createAccess}
                  onCheckedChange={(checked) => setCreateAccess(checked === true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="createAccess" className="text-sm font-medium cursor-pointer">
                    Criar credenciais de acesso automaticamente
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    O paciente receberá uma conta para acessar a plataforma diretamente
                  </p>
                </div>
              </div>
              
              {createAccess && (
                <div className="mt-6 p-4 bg-background/50 rounded-lg border space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Foto de Perfil (Opcional)</Label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="relative">
                        {avatarPreview ? (
                          <>
                            <img 
                              src={avatarPreview} 
                              alt="Preview" 
                              className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={removeAvatar}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <Label htmlFor="avatar-upload" className="cursor-pointer">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span className="flex items-center space-x-2">
                              <Upload className="w-4 h-4" />
                              <span>Escolher Foto</span>
                            </span>
                          </Button>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Formatos aceitos: JPG, PNG, GIF (máx. 5MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Form Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Dados Pessoais */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-primary" />
                <span>Dados Pessoais</span>
              </CardTitle>
              <CardDescription>
                Informações básicas do paciente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome completo do paciente"
                  className="h-10"
                />
              </div>
            
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@exemplo.com"
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(00) 00000-0000"
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                  placeholder="(00) 00000-0000"
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="birth_date" className="text-sm font-medium">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-medium">Gênero</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="nao_informar">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="occupation" className="text-sm font-medium">Ocupação</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                  placeholder="Profissão do paciente"
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_type" className="text-sm font-medium">Tipo de Documento</Label>
                <Select value={formData.document_type} onValueChange={(value) => setFormData({...formData, document_type: value})}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="rg">RG</SelectItem>
                    <SelectItem value="cnh">CNH</SelectItem>
                    <SelectItem value="passaporte">Passaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="document" className="text-sm font-medium">Documento</Label>
                <Input
                  id="document"
                  value={formData.document}
                  onChange={(e) => setFormData({...formData, document: e.target.value})}
                  placeholder="Número do documento"
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>Endereço</span>
            </CardTitle>
            <CardDescription>
              Informações de localização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zipcode" className="text-sm font-medium">CEP</Label>
              <Input
                id="zipcode"
                value={formData.address.zipcode}
                onChange={(e) => {
                  const cep = e.target.value.replace(/\D/g, '');
                  setFormData({
                    ...formData,
                    address: { ...formData.address, zipcode: cep }
                  });
                  if (cep.length === 8) {
                    searchCEP(cep);
                  }
                }}
                placeholder="00000-000"
                maxLength={8}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="street" className="text-sm font-medium">Rua</Label>
              <Input
                id="street"
                value={formData.address.street}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value }
                })}
                placeholder="Nome da rua"
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number" className="text-sm font-medium">Número</Label>
                <Input
                  id="number"
                  value={formData.address.number}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, number: e.target.value }
                  })}
                  placeholder="123"
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="complement" className="text-sm font-medium">Complemento</Label>
                <Input
                  id="complement"
                  value={formData.address.complement}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, complement: e.target.value }
                  })}
                  placeholder="Apto 101"
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood" className="text-sm font-medium">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.address.neighborhood}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, neighborhood: e.target.value }
                  })}
                  placeholder="Nome do bairro"
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">Cidade</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value }
                  })}
                  placeholder="Nome da cidade"
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm font-medium">Estado</Label>
              <Input
                id="state"
                value={formData.address.state}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, state: e.target.value }
                })}
                placeholder="UF"
                maxLength={2}
                className="h-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contato de Emergência */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5 text-primary" />
              <span>Contato de Emergência</span>
            </CardTitle>
            <CardDescription>
              Pessoa para contato em caso de emergência
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_name" className="text-sm font-medium">Nome</Label>
              <Input
                id="emergency_name"
                value={formData.emergency_contact.name}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_contact: { ...formData.emergency_contact, name: e.target.value }
                })}
                placeholder="Nome do contato"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_phone" className="text-sm font-medium">Telefone</Label>
              <Input
                id="emergency_phone"
                value={formData.emergency_contact.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_contact: { ...formData.emergency_contact, phone: e.target.value }
                })}
                placeholder="(00) 00000-0000"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_relationship" className="text-sm font-medium">Parentesco</Label>
              <Input
                id="emergency_relationship"
                value={formData.emergency_contact.relationship}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_contact: { ...formData.emergency_contact, relationship: e.target.value }
                })}
                placeholder="Ex: Mãe, Pai, Cônjuge..."
                className="h-10"
              />
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Action Buttons - Fixed position at bottom */}
        <Card className="sticky bottom-4 border-2 border-primary/20 bg-background/95 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {createAccess && !isEditMode ? (
                <Button 
                  onClick={handleCreateWithCredentials}
                  disabled={isLoading || !formData.name || !formData.email}
                  className="flex items-center justify-center space-x-2 h-11"
                  size="lg"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Criando...' : 'Criar Paciente com Credenciais'}</span>
                </Button>
              ) : (
                <Button 
                  onClick={() => handleSavePatient(false)}
                  disabled={isLoading || !formData.name}
                  className="flex items-center justify-center space-x-2 h-11"
                  size="lg"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Salvando...' : (isEditMode ? 'Atualizar Paciente' : 'Salvar Paciente')}</span>
                </Button>
              )}
              
              {!createAccess && !isEditMode && (
                <>
                  <Button 
                    variant="secondary"
                    onClick={handleSendInvite}
                    disabled={isSendingInvite || !formData.email || !formData.name}
                    className="flex items-center justify-center space-x-2 h-11"
                    size="lg"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSendingInvite ? 'Enviando...' : 'Salvar e Enviar Convite'}</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleGenerateLink}
                    disabled={isGeneratingLink || !formData.name}
                    className="flex items-center justify-center space-x-2 h-11"
                    size="lg"
                  >
                    <Link className="w-4 h-4" />
                    <span>{isGeneratingLink ? 'Gerando...' : 'Salvar e Gerar Link'}</span>
                  </Button>
                </>
              )}
            </div>
            
            {/* Help text */}
            <div className="mt-3 text-xs text-muted-foreground">
              {createAccess && !isEditMode ? (
                <p>* Nome e email são obrigatórios para criar credenciais de acesso</p>
              ) : (
                <p>* Apenas o nome é obrigatório para salvar o paciente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};