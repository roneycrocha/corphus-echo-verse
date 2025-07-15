import React, { useState } from 'react';
import { UserPlus, Upload, X, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreatePatientWithAuthDialogProps {
  onPatientCreated?: () => void;
}

export const CreatePatientWithAuthDialog: React.FC<CreatePatientWithAuthDialogProps> = ({ onPatientCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createAccess, setCreateAccess] = useState(true); // Nova opção para criar acesso
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    whatsapp: '',
    document: '',
    document_type: 'cpf',
    avatar_url: '',
    social_media: {
      instagram: '',
      facebook: '',
      linkedin: ''
    },
    address: {
      zipcode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    }
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      birthDate: '',
      whatsapp: '',
      document: '',
      document_type: 'cpf',
      avatar_url: '',
      social_media: {
        instagram: '',
        facebook: '',
        linkedin: ''
      },
      address: {
        zipcode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: ''
      }
    });
    setCreateAccess(true);
    setAvatarFile(null);
    setAvatarPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.name || !formData.email) {
      toast({
        title: 'Erro',
        description: 'Nome e email são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um email válido (ex: usuario@email.com).',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Obter o usuário atual (terapeuta que está criando o paciente)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // 2. Upload da foto do perfil se fornecida
      let avatarUrl = '';
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `patient_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      // 3. Obter o account_id do usuário atual
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', currentUser.id)
        .single();

      if (profileError) {
        throw new Error('Erro ao obter dados do perfil');
      }

      // 4. Criar paciente na tabela patients
      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          birth_date: formData.birthDate || null,
          whatsapp: formData.whatsapp || null,
          document: formData.document || null,
          document_type: formData.document_type,
          avatar_url: avatarUrl || null,
          social_media: formData.social_media,
          address: formData.address,
          created_by: currentUser.id,
          account_id: userProfile.account_id,
          is_active: true
        })
        .select()
        .single();

      if (patientError) {
        throw patientError;
      }

      let accessMessage = '';

      // 5. Se marcado para criar acesso, chamar a edge function
      if (createAccess && newPatient) {
        try {
          // Obter dados do terapeuta para o email
          const { data: therapistProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', currentUser.id)
            .single();

          const { data: accessResult, error: accessError } = await supabase.functions.invoke('create-patient-access', {
            body: {
              patientId: newPatient.id,
              patientEmail: formData.email,
              patientName: formData.name,
              therapistName: therapistProfile?.full_name || 'Seu terapeuta'
            }
          });

          if (accessError) {
            console.error('Erro ao criar acesso:', accessError);
            accessMessage = ' (Paciente criado, mas houve erro ao enviar credenciais de acesso)';
          } else if (accessResult?.success) {
            accessMessage = ' Credenciais de acesso enviadas por email!';
          }
        } catch (accessError) {
          console.error('Erro ao criar acesso:', accessError);
          accessMessage = ' (Paciente criado, mas houve erro ao enviar credenciais de acesso)';
        }
      }

      toast({
        title: 'Sucesso!',
        description: `Paciente ${formData.name} cadastrado com sucesso.${accessMessage}`
      });

      resetForm();
      setOpen(false);
      onPatientCreated?.();

    } catch (error: any) {
      console.error('Erro ao criar paciente:', error);
      
      let errorMessage = 'Erro ao cadastrar paciente.';
      
      if (error.message?.includes('duplicate key value violates unique constraint')) {
        errorMessage = 'Já existe um paciente com este email.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
  };

  const searchCEP = async (cep: string) => {
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData({
            ...formData,
            address: {
              ...formData.address,
              zipcode: cep,
              street: data.logradouro,
              neighborhood: data.bairro,
              city: data.localidade,
              state: data.uf
            }
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Paciente</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
          <DialogDescription>
            Cadastre um novo paciente e opcionalmente crie credenciais de acesso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Opção para criar acesso */}
          <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border">
            <Checkbox 
              id="createAccess" 
              checked={createAccess}
              onCheckedChange={(checked) => setCreateAccess(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="createAccess" className="text-sm font-medium cursor-pointer">
                <Mail className="w-4 h-4 inline mr-2" />
                Criar credenciais de acesso automaticamente
              </Label>
              <p className="text-xs text-muted-foreground">
                Se marcado, o paciente receberá um email com as credenciais para acessar a plataforma
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna 1 - Dados Básicos */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground border-b pb-2">Dados Básicos</h3>
              
              {/* Foto de Perfil */}
              <div className="space-y-2">
                <Label>Foto de Perfil</Label>
                <div className="flex items-center space-x-4">
                  {avatarPreview ? (
                    <div className="relative">
                      <img 
                        src={avatarPreview} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-full object-cover"
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
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>Escolher Foto</span>
                      </Button>
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do paciente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document_type">Tipo de Documento</Label>
                  <Select 
                    value={formData.document_type} 
                    onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="document">{formData.document_type.toUpperCase()}</Label>
                  <Input
                    id="document"
                    value={formData.document}
                    onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                    placeholder={formData.document_type === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
            </div>

            {/* Coluna 2 - Mídias Sociais e Endereço */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground border-b pb-2">Mídias Sociais</h3>
              
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.social_media.instagram}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_media: { ...formData.social_media, instagram: e.target.value }
                  })}
                  placeholder="@username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.social_media.facebook}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_media: { ...formData.social_media, facebook: e.target.value }
                  })}
                  placeholder="facebook.com/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={formData.social_media.linkedin}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_media: { ...formData.social_media, linkedin: e.target.value }
                  })}
                  placeholder="linkedin.com/in/username"
                />
              </div>

              <h3 className="font-medium text-foreground border-b pb-2 mt-6">Endereço</h3>
              
              <div className="space-y-2">
                <Label htmlFor="zipcode">CEP</Label>
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, street: e.target.value }
                  })}
                  placeholder="Nome da rua"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.address.number}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, number: e.target.value }
                    })}
                    placeholder="123"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.address.complement}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, complement: e.target.value }
                    })}
                    placeholder="Apto 101"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.address.neighborhood}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, neighborhood: e.target.value }
                  })}
                  placeholder="Nome do bairro"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value }
                    })}
                    placeholder="Nome da cidade"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value }
                    })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </div>
        </form>

        {createAccess && (
          <div className="text-xs text-muted-foreground mt-4 p-3 bg-blue-50 rounded">
            <p className="font-medium mb-1">📧 Credenciais de Acesso:</p>
            <p>O paciente receberá um email com instruções para criar sua senha e acessar a plataforma.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};