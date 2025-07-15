import React, { useState, useEffect } from 'react';
import { User, Camera, Save, Eye, EyeOff, Upload, MapPin, Briefcase, Mail, Phone, Globe, Instagram, Facebook, Linkedin, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/auth/AuthProvider';
import AIAgentSelector from './AIAgentSelector';
import { TIMEZONE_OPTIONS } from '@/utils/dateUtils';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    avatar_url: '',
    logo_url: '',
    public_email: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    whatsapp: '',
    website: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    },
    job_title: '',
    timezone: 'America/Sao_Paulo'
  });

  useEffect(() => {
    if (open && user) {
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        avatar_url: '',
        logo_url: '',
        public_email: '',
        instagram: '',
        facebook: '',
        linkedin: '',
        whatsapp: '',
        website: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: ''
        },
        job_title: '',
        timezone: 'America/Sao_Paulo'
      });
      loadUserProfile();
    }
  }, [open, user]);

  const loadUserProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (profile) {
        console.log('Profile loaded:', profile);
        const address = (profile.address as any) || {};
        setFormData({
          full_name: profile.full_name || '',
          email: profile.email || user?.email || '',
          phone: profile.phone || '',
          password: '',
          confirmPassword: '',
          avatar_url: profile.avatar_url || '',
          logo_url: profile.logo_url || '',
          public_email: profile.public_email || '',
          instagram: profile.instagram || '',
          facebook: profile.facebook || '',
          linkedin: profile.linkedin || '',
          whatsapp: profile.whatsapp || '',
          website: profile.website || '',
          address: {
            street: address.street || '',
            city: address.city || '',
            state: address.state || '',
            zip: address.zip || '',
            country: address.country || ''
          },
          job_title: profile.job_title || '',
          timezone: profile.timezone || 'America/Sao_Paulo'
        });
      } else {
        setFormData({
          full_name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
          phone: '',
          password: '',
          confirmPassword: '',
          avatar_url: '',
          logo_url: '',
          public_email: '',
          instagram: '',
          facebook: '',
          linkedin: '',
          whatsapp: '',
          website: '',
          address: {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: ''
          },
          job_title: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do perfil.',
        variant: 'destructive'
      });
    }
  };

  const uploadImage = async (file: File, bucket: string, type: 'avatar' | 'logo') => {
    const setUploading = type === 'avatar' ? setUploadingAvatar : setUploadingLogo;
    
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${type}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const fieldName = type === 'avatar' ? 'avatar_url' : 'logo_url';
      setFormData(prev => ({
        ...prev,
        [fieldName]: data.publicUrl
      }));

      toast({
        title: 'Sucesso',
        description: `${type === 'avatar' ? 'Foto' : 'Logo'} enviada com sucesso!`,
      });
      
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro',
        description: `Erro ao enviar ${type === 'avatar' ? 'foto' : 'logo'}.`,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (type: 'avatar' | 'logo') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'Erro',
            description: 'Arquivo muito grande. Máximo 5MB.',
            variant: 'destructive'
          });
          return;
        }
        const bucket = type === 'avatar' ? 'avatars' : 'logos';
        uploadImage(file, bucket, type);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Validações
      if (!formData.full_name.trim()) {
        toast({
          title: 'Erro',
          description: 'Nome completo é obrigatório.',
          variant: 'destructive'
        });
        return;
      }

      if (showPasswordFields) {
        if (formData.password.length < 6) {
          toast({
            title: 'Erro',
            description: 'A senha deve ter pelo menos 6 caracteres.',
            variant: 'destructive'
          });
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          toast({
            title: 'Erro',
            description: 'As senhas não coincidem.',
            variant: 'destructive'
          });
          return;
        }
      }

      // Verificar se o perfil já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      let profileError;
      
      if (existingProfile) {
        // Atualizar perfil existente
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            avatar_url: formData.avatar_url,
            logo_url: formData.logo_url,
            public_email: formData.public_email,
            instagram: formData.instagram,
            facebook: formData.facebook,
            linkedin: formData.linkedin,
            whatsapp: formData.whatsapp,
            website: formData.website,
            address: formData.address,
            job_title: formData.job_title,
            timezone: formData.timezone
          })
          .eq('user_id', user?.id);
        profileError = error;
      } else {
        // Criar novo perfil
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: user?.id,
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            avatar_url: formData.avatar_url,
            logo_url: formData.logo_url,
            public_email: formData.public_email,
            instagram: formData.instagram,
            facebook: formData.facebook,
            linkedin: formData.linkedin,
            whatsapp: formData.whatsapp,
            website: formData.website,
            address: formData.address,
            job_title: formData.job_title,
            timezone: formData.timezone
          });
        profileError = error;
      }

      if (profileError) throw profileError;

      // Atualizar senha se fornecida e diferente
      if (showPasswordFields && formData.password && formData.password.trim() !== '') {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.password
        });

        if (passwordError) {
          // Se o erro for que a senha é igual à atual, ignorar
          if (passwordError.message?.includes('same password')) {
            console.log('Senha não alterada, continuando...');
          } else {
            throw passwordError;
          }
        }
      }

      // Atualizar metadados do usuário
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name,
          avatar_url: formData.avatar_url
        }
      });

      if (metadataError) throw metadataError;

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso!',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o perfil.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Editar Perfil</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatares */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {formData.full_name.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
                  onClick={() => handleFileUpload('avatar')}
                  disabled={uploadingAvatar}
                >
                  <Camera className={`w-4 h-4 ${uploadingAvatar ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <Label className="text-sm font-medium">Foto do Perfil</Label>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center bg-muted/30">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
                  onClick={() => handleFileUpload('logo')}
                  disabled={uploadingLogo}
                >
                  <Upload className={`w-4 h-4 ${uploadingLogo ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <Label className="text-sm font-medium">Logomarca</Label>
            </div>
          </div>

          <Separator />

          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Básicas
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_title">Função</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="Ex: Fisioterapeuta, Médico..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Fuso Horário
              </Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => setFormData({ ...formData, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu fuso horário" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email (Privado)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Digite seu email"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="public_email">Email Público</Label>
                <Input
                  id="public_email"
                  type="email"
                  value={formData.public_email}
                  onChange={(e) => setFormData({ ...formData, public_email: e.target.value })}
                  placeholder="Email para contato público"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contato
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://seusite.com.br"
              />
            </div>
          </div>

          <Separator />

          {/* Redes Sociais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Redes Sociais
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@seuusuario ou https://instagram.com/seuusuario"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  placeholder="https://facebook.com/seuperfil"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/seuperfil"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, street: e.target.value }
                  })}
                  placeholder="Nome da rua e número"
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
                    placeholder="Cidade"
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
                    placeholder="UF"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip">CEP</Label>
                  <Input
                    id="zip"
                    value={formData.address.zip}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, zip: e.target.value }
                    })}
                    placeholder="00000-000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.address.country}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, country: e.target.value }
                    })}
                    placeholder="Brasil"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuração do Agente de IA */}
          <AIAgentSelector />

          <Separator />

          {/* Seção de senha */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Alterar Senha</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswordFields(!showPasswordFields)}
              >
                {showPasswordFields ? 'Cancelar' : 'Alterar'}
              </Button>
            </div>

            {showPasswordFields && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Digite a nova senha (mín. 6 caracteres)"
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirme a nova senha"
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

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};