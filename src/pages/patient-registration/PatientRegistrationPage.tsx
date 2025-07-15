import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, X, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const PatientRegistrationPage: React.FC = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [therapistProfile, setTherapistProfile] = useState<any>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '',
    occupation: '',
    whatsapp: '',
    document: '',
    document_type: 'cpf',
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
    },
    emergency_contact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      setTokenValid(false);
      return;
    }

    try {
      setLoading(true);
      
      // Limpar estados anteriores quando verificar novo token
      setTherapistProfile(null);
      setIsEdit(false);
      setExistingPatientId(null);
      
      const { data, error } = await supabase
        .from('patient_registration_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        setTokenValid(false);
      } else {
        setTokenValid(true);
        
        // Verificar se é edição e carregar dados existentes
        const patientData = data.patient_data as any;
        console.log('Dados do token:', patientData);
        console.log('isEdit:', patientData?.isEdit);
        console.log('existingPatientId:', patientData?.existingPatientId);
        
        if (patientData?.isEdit === true && patientData?.existingPatientId) {
          console.log('Modo de edição detectado');
          setIsEdit(true);
          setExistingPatientId(patientData.existingPatientId);
          await loadExistingPatientData(patientData.existingPatientId);
        } else if (patientData) {
          // Pré-preencher dados básicos do token
          setFormData(prev => ({
            ...prev,
            name: patientData.name || '',
            email: patientData.email || '',
            phone: patientData.phone || '',
            whatsapp: patientData.whatsapp || ''
          }));
        }
        
        // Buscar dados do terapeuta
        if (data.created_by) {
          await fetchTherapistProfile(data.created_by);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      setTokenValid(false);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingPatientData = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (!error && data) {
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          birthDate: data.birth_date || '',
          gender: data.gender || '',
          occupation: data.occupation || '',
          whatsapp: data.whatsapp || '',
          document: data.document || '',
          document_type: data.document_type || 'cpf',
          social_media: (data.social_media && typeof data.social_media === 'object' && !Array.isArray(data.social_media)) ? {
            instagram: (data.social_media as any).instagram || '',
            facebook: (data.social_media as any).facebook || '',
            linkedin: (data.social_media as any).linkedin || ''
          } : {
            instagram: '',
            facebook: '',
            linkedin: ''
          },
          address: (data.address && typeof data.address === 'object' && !Array.isArray(data.address)) ? {
            zipcode: (data.address as any).zipcode || '',
            street: (data.address as any).street || '',
            number: (data.address as any).number || '',
            complement: (data.address as any).complement || '',
            neighborhood: (data.address as any).neighborhood || '',
            city: (data.address as any).city || '',
            state: (data.address as any).state || ''
          } : {
            zipcode: '',
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: ''
          },
          emergency_contact: (data.emergency_contact && typeof data.emergency_contact === 'object' && !Array.isArray(data.emergency_contact)) ? {
            name: (data.emergency_contact as any).name || '',
            phone: (data.emergency_contact as any).phone || '',
            relationship: (data.emergency_contact as any).relationship || ''
          } : {
            name: '',
            phone: '',
            relationship: ''
          }
        });

        if (data.avatar_url) {
          setAvatarPreview(data.avatar_url);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do paciente:', error);
    }
  };

  const fetchTherapistProfile = async (userId: string) => {
    try {
      // Limpar perfil anterior primeiro
      setTherapistProfile(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, job_title, logo_url, avatar_url, public_email, phone, website, facebook, instagram, linkedin')
        .eq('user_id', userId)
        .eq('user_type', 'therapist')
        .maybeSingle();

      if (!error && data) {
        console.log('Perfil do terapeuta carregado:', data);
        setTherapistProfile(data);
      } else {
        console.log('Nenhum perfil de terapeuta encontrado para:', userId);
        setTherapistProfile(null);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil do terapeuta:', error);
      setTherapistProfile(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast({
        title: 'Erro',
        description: 'Nome e email são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload da foto do perfil se fornecida
      let avatarUrl = '';
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `patient_registration_${Date.now()}.${fileExt}`;
        
        // Upload público para bucket de avatares
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        } else {
          console.error('Erro no upload:', uploadError);
        }
      }

      console.log('Verificando modo de edição:', { isEdit, existingPatientId });
      
      if (isEdit && existingPatientId) {
        console.log('Executando atualização do paciente existente');
        // Atualizar paciente existente
        const { error: updateError } = await supabase
          .from('patients')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            birth_date: formData.birthDate || null,
            gender: formData.gender || null,
            occupation: formData.occupation || null,
            whatsapp: formData.whatsapp || null,
            document: formData.document || null,
            document_type: formData.document_type || null,
            avatar_url: avatarUrl || avatarPreview || null,
            social_media: formData.social_media,
            address: formData.address,
            emergency_contact: formData.emergency_contact,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPatientId);

        if (updateError) {
          console.error('Erro ao atualizar paciente:', updateError);
          throw updateError;
        }

        console.log('Paciente atualizado com sucesso');

        // Marcar token como usado
        await supabase
          .from('patient_registration_tokens')
          .update({ used: true, used_at: new Date().toISOString() })
          .eq('token', token);

        // Criar acesso do paciente na plataforma e enviar email
        console.log('Criando acesso do paciente na plataforma...');
        const { data: accessData, error: accessError } = await supabase.functions.invoke('create-patient-access', {
          body: {
            patientId: existingPatientId,
            patientEmail: formData.email,
            patientName: formData.name,
            therapistName: therapistProfile?.full_name || undefined
          }
        });

        if (accessError) {
          console.error('Erro ao criar acesso:', accessError);
          console.error('Dados da resposta:', accessData);
          
          // Verificar se o erro é devido a email já usado por terapeuta
          if (accessData?.isTherapist) {
            toast({
              title: 'Email já cadastrado',
              description: accessData.message || 'Este email já está sendo usado por um terapeuta no sistema. Use um email diferente.',
              variant: 'destructive'
            });
          } else {
            // Tentar extrair detalhes do erro
            const errorDetails = accessData?.details || accessError.message || 'Erro desconhecido';
            toast({
              title: 'Erro ao criar acesso',
              description: `Dados atualizados, mas falha ao criar acesso: ${errorDetails}`,
              variant: 'destructive'
            });
          }
        } else if (accessData?.error) {
          // Tratar casos onde o erro vem no corpo da resposta
          console.error('Erro no corpo da resposta:', accessData);
          
          if (accessData.isTherapist) {
            toast({
              title: 'Email já cadastrado',
              description: accessData.message || 'Este email já está sendo usado por um terapeuta no sistema. Use um email diferente.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Erro ao criar acesso',
              description: accessData.details || accessData.error,
              variant: 'destructive'
            });
          }
        } else {
          console.log('Acesso criado com sucesso:', accessData);
          
          if (accessData?.userExists) {
            toast({
              title: 'Dados Atualizados!',
              description: 'Seus dados foram atualizados. Você já possui acesso à plataforma.',
            });
          } else if (accessData?.emailSent) {
            toast({
              title: 'Acesso Criado!',
              description: 'Seus dados foram atualizados e um email foi enviado para você criar sua senha de acesso.',
            });
          } else {
            toast({
              title: 'Sucesso!',
              description: 'Seus dados foram atualizados com sucesso!',
            });
          }
        }
      } else {
        // Criar novo paciente usando RPC para bypass das políticas RLS
        const { data: result, error: patientError } = await supabase.rpc('create_public_patient', {
          p_token: token,
          p_patient_data: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            birth_date: formData.birthDate || null,
            gender: formData.gender || null,
            occupation: formData.occupation || null,
            whatsapp: formData.whatsapp || null,
            document: formData.document || null,
            document_type: formData.document_type || null,
            avatar_url: avatarUrl || null,
            social_media: JSON.stringify(formData.social_media),
            address: JSON.stringify(formData.address),
            emergency_contact: JSON.stringify(formData.emergency_contact)
          }
        });

        if (patientError) {
          console.error('Erro ao criar paciente:', patientError);
          throw patientError;
        }

        // O token já foi marcado como usado pela função RPC
        console.log('Paciente criado com sucesso:', result);

        toast({
          title: 'Sucesso!',
          description: 'Seus dados foram cadastrados com sucesso! O terapeuta entrará em contato em breve.',
        });
      }

      // Mostrar tela de sucesso com os dados do paciente
      setShowSuccessScreen(true);

    } catch (error: any) {
      console.error('Erro ao cadastrar paciente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar seus dados. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verificando link...</p>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Link Inválido</CardTitle>
            <CardDescription>
              Este link de cadastro é inválido ou expirou. Entre em contato com seu terapeuta para obter um novo link.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')} variant="outline">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSuccessScreen) {
    return (
      <div className="min-h-screen bg-background">
        {/* Cabeçalho do Terapeuta */}
        {therapistProfile ? (
          <div className="bg-white border-b shadow-sm">
            <div className="container mx-auto px-4 py-3 sm:py-4">
              <div className="flex items-center gap-3 sm:gap-4">
                {therapistProfile.logo_url ? (
                  <img 
                    src={therapistProfile.logo_url} 
                    alt="Logo" 
                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0"
                  />
                ) : therapistProfile.avatar_url ? (
                  <img 
                    src={therapistProfile.avatar_url} 
                    alt="Avatar" 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-medium text-sm sm:text-lg">
                      {therapistProfile.full_name?.charAt(0) || 'T'}
                    </span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-foreground text-sm sm:text-base truncate">
                    {therapistProfile.full_name || 'Terapeuta'}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {therapistProfile.job_title || 'Profissional de Saúde'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl text-green-600">
                    {isEdit ? 'Dados Atualizados!' : 'Cadastro Realizado!'}
                  </CardTitle>
                  <CardDescription>
                    {isEdit 
                      ? 'Seus dados foram atualizados com sucesso.'
                      : 'Seu cadastro foi realizado com sucesso. Em breve o terapeuta entrará em contato.'
                    }
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Dados Cadastrados:</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Nome:</span>
                        <span>{formData.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Email:</span>
                        <span>{formData.email}</span>
                      </div>
                      {formData.phone && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Telefone:</span>
                          <span>{formData.phone}</span>
                        </div>
                      )}
                      {formData.whatsapp && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">WhatsApp:</span>
                          <span>{formData.whatsapp}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      {isEdit 
                        ? 'Você pode fechar esta janela.'
                        : 'Agradecemos por preencher seus dados. O terapeuta entrará em contato em breve.'
                      }
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button 
                        onClick={() => navigate('/')} 
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        Ir para página inicial
                      </Button>
                      
                      {therapistProfile && (
                        <Button 
                          onClick={() => window.close()} 
                          className="w-full sm:w-auto"
                        >
                          Fechar janela
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho do Terapeuta */}
      {therapistProfile ? (
        <div className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div 
              className="flex items-center gap-3 sm:gap-4 cursor-pointer hover:bg-muted/50 rounded-lg p-2 sm:p-3 transition-colors"
              onClick={() => navigate(`/?returnTo=patient-registration/${token}`)}
            >
              {therapistProfile.logo_url ? (
                <img 
                  src={therapistProfile.logo_url} 
                  alt="Logo" 
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0"
                />
              ) : therapistProfile.avatar_url ? (
                <img 
                  src={therapistProfile.avatar_url} 
                  alt="Avatar" 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-medium text-sm sm:text-lg">
                    {therapistProfile.full_name?.charAt(0) || 'T'}
                  </span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground text-sm sm:text-base truncate">
                  {therapistProfile.full_name || 'Terapeuta'}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {therapistProfile.job_title || 'Profissional de Saúde'}
                </p>
              </div>
              
              <div className="text-xs text-muted-foreground hidden sm:block flex-shrink-0">
                Clique para ver mais informações
              </div>
              <div className="text-xs text-muted-foreground sm:hidden">
                Ver perfil
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="py-4 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader className="text-center px-4 sm:px-6">
                <CardTitle className="text-xl sm:text-2xl">
                  {isEdit ? 'Editar Dados do Paciente' : 'Cadastro de Paciente'}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {isEdit 
                    ? 'Atualize seus dados conforme necessário. Seus dados estão seguros e serão utilizados apenas para fins terapêuticos.'
                    : 'Preencha seus dados para completar o cadastro. Seus dados estão seguros e serão utilizados apenas para fins terapêuticos.'
                  }
                </CardDescription>
              </CardHeader>
            
            <CardContent className="px-4 sm:px-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                        placeholder="Seu nome completo"
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
                        placeholder="seu@email.com"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="birthDate">Data de Nascimento</Label>
                        <Input
                          id="birthDate"
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gênero</Label>
                        <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="occupation">Profissão</Label>
                      <Input
                        id="occupation"
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        placeholder="Sua profissão"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <h4 className="font-medium text-foreground border-b pb-2 mt-6">Contato de Emergência</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emergency_name">Nome</Label>
                      <Input
                        id="emergency_name"
                        value={formData.emergency_contact.name}
                        onChange={(e) => setFormData({
                          ...formData,
                          emergency_contact: { ...formData.emergency_contact, name: e.target.value }
                        })}
                        placeholder="Nome do contato"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emergency_phone">Telefone</Label>
                        <Input
                          id="emergency_phone"
                          value={formData.emergency_contact.phone}
                          onChange={(e) => setFormData({
                            ...formData,
                            emergency_contact: { ...formData.emergency_contact, phone: e.target.value }
                          })}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="emergency_relationship">Parentesco</Label>
                        <Input
                          id="emergency_relationship"
                          value={formData.emergency_contact.relationship}
                          onChange={(e) => setFormData({
                            ...formData,
                            emergency_contact: { ...formData.emergency_contact, relationship: e.target.value }
                          })}
                          placeholder="Ex: Cônjuge, Filho(a)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="px-8"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {isEdit ? 'Atualizar Dados' : 'Finalizar Cadastro'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};