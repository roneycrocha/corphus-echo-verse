import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Instagram,
  Facebook, 
  Linkedin,
  Globe,
  MessageCircle,
  Star,
  Calendar,
  Shield,
  Heart,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

const TherapistProfile = () => {
  const { profile: loggedProfile, loading } = useProfile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userId } = useParams();
  const returnTo = searchParams.get('returnTo');
  const [therapistProfile, setTherapistProfile] = useState<any>(null);

  // Se userId for ":userId" (literal) ou inválido, redirecionar para home
  useEffect(() => {
    // Detectar se o userId é um placeholder ou inválido
    if (!userId || 
        userId === ':userId' || 
        userId === 'undefined' || 
        userId === 'null' || 
        userId.includes(':') ||
        userId.length < 10) { // UUIDs têm pelo menos 36 caracteres
      
      console.log('[TherapistProfile] Redirecionando para home - userId inválido:', userId);
      console.log('[TherapistProfile] URL atual:', window.location.href);
      
      // Forçar navegação para home
      window.location.href = '/';
      return;
    }
  }, [userId]);

  // Buscar perfil do terapeuta quando vem de link de cadastro
  useEffect(() => {
    if (returnTo) {
      fetchTherapistFromToken();
    }
  }, [returnTo]);

  const fetchTherapistFromToken = async () => {
    if (!returnTo) return;
    
    try {
      // Extrair token do returnTo (formato: patient-registration/TOKEN)
      const token = returnTo.split('/')[1];
      
      // Buscar dados do token
      const { data: tokenData } = await supabase
        .from('patient_registration_tokens')
        .select('created_by')
        .eq('token', token)
        .maybeSingle();

      if (tokenData?.created_by) {
        // Buscar perfil do terapeuta
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, job_title, logo_url, avatar_url, public_email, email, phone, website, facebook, instagram, linkedin, whatsapp, address')
          .eq('user_id', tokenData.created_by)
          .eq('user_type', 'therapist')
          .maybeSingle();

        if (profileData) {
          setTherapistProfile(profileData);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar perfil do terapeuta:', error);
    }
  };

  // Usar perfil do terapeuta se disponível, senão usar perfil logado
  const profile = therapistProfile || loggedProfile;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Botão de Voltar ao Cadastro (se vier de um link de cadastro) */}
      {returnTo && (
        <div className="fixed top-4 left-4 z-50">
          <Button 
            onClick={() => navigate(`/${returnTo}`)}
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Cadastro
          </Button>
        </div>
      )}

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              {profile?.logo_url ? (
                <img 
                  src={profile.logo_url} 
                  alt="Logo" 
                  className="h-24 w-auto object-contain"
                />
              ) : (
                <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center">
                  <Heart className="h-12 w-12 text-primary" />
                </div>
              )}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              {profile?.full_name || 'Monitor Terapêutico'}
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-4">
              {profile?.job_title || 'Especialista em Fisioterapia'}
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <Badge variant="secondary" className="px-4 py-2">
                <Shield className="w-4 h-4 mr-2" />
                Profissional Certificado
              </Badge>
              <Badge variant="secondary" className="px-4 py-2">
                <Star className="w-4 h-4 mr-2" />
                Atendimento Especializado
              </Badge>
              <Badge variant="secondary" className="px-4 py-2">
                <Calendar className="w-4 h-4 mr-2" />
                Agendamento Online
              </Badge>
            </div>
          </div>

          {/* CTA Principal */}
          <div className="text-center mb-16">
            <div className="space-y-4">
              {!returnTo ? (
                <>
                  <Link to="/patient-login">
                    <Button size="lg" className="text-lg px-8 py-6 h-auto mb-4 mr-4">
                      <Calendar className="w-6 h-6 mr-3" />
                      Área do Paciente
                    </Button>
                  </Link>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Já tem uma conta? Faça login acima. 
                      <br />
                      Novo paciente? Entre em contato para receber seu link de cadastro.
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 max-w-md mx-auto">
                  <p className="text-muted-foreground text-sm mb-4">
                    Você está visualizando o perfil do seu terapeuta. 
                    Use o botão acima para retornar ao seu cadastro quando terminar de explorar.
                  </p>
                  <Button 
                    onClick={() => navigate(`/${returnTo}`)}
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Continuar Cadastro
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Cards de Informações */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Card de Contato */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-primary" />
                  Contato
                </h3>
                <div className="space-y-3">
                  {profile?.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                      <a href={`tel:${profile.phone}`} className="hover:text-primary">
                        {profile.phone}
                      </a>
                    </div>
                  )}
                  {profile?.whatsapp && (
                    <div className="flex items-center text-sm">
                      <MessageCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                      <a 
                        href={`https://wa.me/55${profile.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        WhatsApp
                      </a>
                    </div>
                  )}
                  {(profile?.public_email || profile?.email) && (
                    <div className="flex items-center text-sm">
                      <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                      <a 
                        href={`mailto:${profile.public_email || profile.email}`}
                        className="hover:text-primary"
                      >
                        {profile.public_email || profile.email}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card de Localização */}
            {profile?.address && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary" />
                    Localização
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {profile.address.street && (
                      <p>{profile.address.street}, {profile.address.number}</p>
                    )}
                    {profile.address.neighborhood && (
                      <p>{profile.address.neighborhood}</p>
                    )}
                    {profile.address.city && profile.address.state && (
                      <p>{profile.address.city} - {profile.address.state}</p>
                    )}
                    {profile.address.zipcode && (
                      <p>CEP: {profile.address.zipcode}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card de Redes Sociais */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-primary" />
                  Redes Sociais
                </h3>
                <div className="space-y-3">
                  {profile?.instagram && (
                    <div className="flex items-center text-sm">
                      <Instagram className="w-4 h-4 mr-2 text-muted-foreground" />
                      <a 
                        href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        @{profile.instagram.replace('@', '')}
                      </a>
                    </div>
                  )}
                  {profile?.facebook && (
                    <div className="flex items-center text-sm">
                      <Facebook className="w-4 h-4 mr-2 text-muted-foreground" />
                      <a 
                        href={profile.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        Facebook
                      </a>
                    </div>
                  )}
                  {profile?.linkedin && (
                    <div className="flex items-center text-sm">
                      <Linkedin className="w-4 h-4 mr-2 text-muted-foreground" />
                      <a 
                        href={profile.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        LinkedIn
                      </a>
                    </div>
                  )}
                  {profile?.website && (
                    <div className="flex items-center text-sm">
                      <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                      <a 
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        Website
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seção de Benefícios */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-8">Por que escolher nosso atendimento?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Agendamento Fácil</h3>
                <p className="text-muted-foreground">
                  Sistema online para agendamento de consultas e acompanhamento
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Cuidado Personalizado</h3>
                <p className="text-muted-foreground">
                  Tratamento individualizado e acompanhamento contínuo
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Profissional Qualificado</h3>
                <p className="text-muted-foreground">
                  Atendimento com profissional certificado e experiente
                </p>
              </div>
            </div>
          </div>

          {/* CTA Secundário */}
          <div className="bg-white/50 rounded-2xl p-8 text-center border border-primary/10">
            <h2 className="text-2xl font-bold mb-4">Como começar?</h2>
            <p className="text-muted-foreground mb-6">
              Se você já é paciente, faça login. Para se tornar um novo paciente, entre em contato conosco.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!returnTo ? (
                <>
                  <Link to="/patient-login">
                    <Button size="lg" className="w-full sm:w-auto">
                      <Calendar className="w-5 h-5 mr-2" />
                      Área do Paciente
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      Área do Terapeuta
                    </Button>
                  </Link>
                </>
              ) : (
                <Button 
                  onClick={() => navigate(`/${returnTo}`)}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Finalizar Cadastro
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted/30 border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 {profile?.full_name || 'Monitor Terapêutico'}. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TherapistProfile;