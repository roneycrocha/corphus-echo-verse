import React, { useState, useEffect } from 'react';
import { Link, Copy, Mail, MessageCircle, X, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SendLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientData?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    birth_date?: string;
    gender?: string;
    occupation?: string;
  } | null;
}

export const SendLinkDialog: React.FC<SendLinkDialogProps> = ({
  open,
  onOpenChange,
  patientData
}) => {
  const [email, setEmail] = useState(patientData?.email || '');
  const [whatsapp, setWhatsapp] = useState(patientData?.whatsapp || patientData?.phone || '');
  
  console.log('SendLinkDialog renderizado com patientData:', patientData);
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingToken, setExistingToken] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const { toast } = useToast();

  // Atualizar campos quando patientData mudar
  useEffect(() => {
    if (patientData) {
      setEmail(patientData.email || '');
      setWhatsapp(patientData.whatsapp || patientData.phone || '');
      console.log('Atualizando campos com dados do paciente:', patientData);
    }
  }, [patientData]);

  // Verificar se existe um token válido quando o dialog abrir
  useEffect(() => {
    console.log('SendLinkDialog useEffect - dialog aberto:', open, 'patientData:', patientData);
    if (open) {
      checkExistingToken();
    } else {
      // Limpar estado quando fechar
      setLink('');
      setExistingToken(null);
      setTokenExpired(false);
    }
  }, [open, patientData?.id]);

  const checkExistingToken = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Se for para um paciente específico, procurar token específico para ele
      if (patientData?.id) {
        // Agora filtrado automaticamente via RLS por account_id
        const { data: tokens, error } = await supabase
          .from('patient_registration_tokens')
          .select('token, expires_at, used, patient_data')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Procurar token específico para este paciente
        const patientToken = tokens?.find(token => {
          const tokenData = token.patient_data as any;
          return tokenData?.existingPatientId === patientData.id && 
                 !token.used && 
                 new Date(token.expires_at) > new Date();
        });

        if (patientToken) {
          setExistingToken(patientToken.token);
          setTokenExpired(false);
          setLink(`${window.location.origin}/patient-registration/${patientToken.token}`);
          return;
        }
      } else {
        // Para cadastro geral, verificar último token não usado (agora filtrado via RLS)
        const { data: tokens, error } = await supabase
          .from('patient_registration_tokens')
          .select('token, expires_at, used, patient_data')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (tokens && tokens.length > 0) {
          const latestToken = tokens[0];
          const tokenData = latestToken.patient_data as any;
          const now = new Date();
          const expiresAt = new Date(latestToken.expires_at);
          const isExpired = expiresAt < now;
          const isUsed = latestToken.used;

          // Só reutilizar se for token geral (sem paciente específico)
          if (!isUsed && !isExpired && !tokenData?.existingPatientId) {
            setExistingToken(latestToken.token);
            setTokenExpired(false);
            setLink(`${window.location.origin}/patient-registration/${latestToken.token}`);
            return;
          }
        }
      }

      // Se chegou aqui, não há token válido
      setTokenExpired(false);
      setExistingToken(null);
      setLink('');
    } catch (error) {
      console.error('Erro ao verificar token existente:', error);
    }
  };

  const generateLink = async (forceNew = false) => {
    try {
      setLoading(true);

      // Se existe um token válido e não estamos forçando um novo, usar o existente
      if (existingToken && !forceNew) {
        setLink(`${window.location.origin}/patient-registration/${existingToken}`);
        toast({
          title: 'Link Existente!',
          description: 'Usando link válido já gerado.',
        });
        return;
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Dados do paciente para pré-preenchimento ou edição
      const patientDataForToken = patientData ? {
        name: patientData.name || '',
        email: patientData.email || '',
        phone: patientData.phone || '',
        whatsapp: patientData.whatsapp || '',
        birth_date: (patientData as any).birth_date || '',
        gender: (patientData as any).gender || '',
        occupation: (patientData as any).occupation || '',
        existingPatientId: patientData.id || null,
        isEdit: !!patientData.id // Flag para indicar que é edição
      } : {};

      console.log('Gerando link com dados do paciente:', patientDataForToken);

      const { error } = await supabase
        .from('patient_registration_tokens')
        .insert({
          token,
          patient_data: patientDataForToken,
          expires_at: expiresAt.toISOString(),
          created_by: currentUser.id
        });

      if (error) throw error;

      const generatedLink = `${window.location.origin}/patient-registration/${token}`;
      setLink(generatedLink);
      setExistingToken(token);
      setTokenExpired(false);
      
      toast({
        title: 'Link Gerado!',
        description: 'Agora você pode copiá-lo ou enviá-lo por email/WhatsApp.',
      });
    } catch (error) {
      console.error('Erro ao gerar link:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o link.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!link) {
      await generateLink();
      return;
    }
    
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Copiado!',
        description: 'Link copiado para a área de transferência.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o link.',
        variant: 'destructive'
      });
    }
  };

  const sendByEmail = async () => {
    if (!email) {
      toast({
        title: 'Email necessário',
        description: 'Digite um email para enviar o link.',
        variant: 'destructive'
      });
      return;
    }

    if (!link) {
      await generateLink();
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('send-patient-invite', {
        body: {
          patientEmail: email,
          patientName: patientData?.name || 'Paciente',
          clinicName: 'Monitor Terapêutico'
        }
      });

      if (!error) {
        toast({
          title: 'Email Enviado!',
          description: `Link enviado para ${email}`,
        });
        onOpenChange(false);
      } else {
        throw new Error(error.message || 'Falha ao enviar email');
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o email.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendByWhatsApp = async () => {
    if (!whatsapp) {
      toast({
        title: 'WhatsApp necessário',
        description: 'Digite um número de WhatsApp.',
        variant: 'destructive'
      });
      return;
    }

    if (!link) {
      await generateLink();
    }

    const cleanPhone = whatsapp.replace(/\D/g, '');
    const message = patientData?.id 
      ? `Olá${patientData?.name ? ` ${patientData.name}` : ''}! Para editar seus dados no Monitor Terapêutico, acesse este link: ${link}`
      : `Olá${patientData?.name ? ` ${patientData.name}` : ''}! Para completar seu cadastro no Monitor Terapêutico, acesse este link: ${link}`;
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    toast({
      title: 'WhatsApp Aberto!',
      description: 'Mensagem preparada no WhatsApp.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            {patientData?.id ? 'Editar Cadastro' : 'Enviar Link de Cadastro'}
          </DialogTitle>
          <DialogDescription>
            {patientData?.id 
              ? `Envie o link para ${patientData.name} editar seus dados cadastrais.`
              : 'Escolha como enviar o link de cadastro para o paciente.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* Aviso se o último token expirou */}
          {tokenExpired && !link && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Seu último link de cadastro expirou. Gere um novo link para enviar ao paciente.
              </p>
            </div>
          )}

          {link && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Link Gerado</Label>
                {existingToken && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => generateLink(true)}
                    disabled={loading}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Gerar Novo
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  value={link}
                  readOnly
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-2 pt-4">
            {!link && (
              <Button
                onClick={() => generateLink()}
                disabled={loading}
                className="w-full"
              >
                <Link className="w-4 h-4 mr-2" />
                {loading ? 'Gerando...' : 'Gerar Link'}
              </Button>
            )}

            {link && (
              <>
                <Button
                  onClick={sendByEmail}
                  disabled={loading || !email}
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar por Email
                </Button>

                <Button
                  onClick={sendByWhatsApp}
                  disabled={loading || !whatsapp}
                  variant="outline"
                  className="w-full"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar por WhatsApp
                </Button>

                <Button
                  onClick={copyLink}
                  disabled={loading}
                  variant="secondary"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};