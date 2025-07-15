import React, { useState, useEffect } from 'react';
import { Link, Copy, Mail, MessageCircle, Calendar, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SendBookingLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
  };
}

export const SendBookingLinkDialog: React.FC<SendBookingLinkDialogProps> = ({
  open,
  onOpenChange,
  patient
}) => {
  const [email, setEmail] = useState(patient.email || '');
  const [whatsapp, setWhatsapp] = useState(patient.whatsapp || patient.phone || '');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingToken, setExistingToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Verificar se existe um token válido quando o dialog abrir
  useEffect(() => {
    if (open && patient.id) {
      checkExistingToken();
    } else {
      // Limpar estado quando fechar
      setLink('');
      setExistingToken(null);
    }
  }, [open, patient.id]);

  // Atualizar email e whatsapp quando patient mudar
  useEffect(() => {
    setEmail(patient.email || '');
    setWhatsapp(patient.whatsapp || patient.phone || '');
  }, [patient]);

  const checkExistingToken = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Agora filtrado automaticamente via RLS por account_id
      const { data: tokens, error } = await supabase
        .from('patient_booking_tokens')
        .select('token, expires_at, used')
        .eq('patient_id', patient.id)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (tokens && tokens.length > 0) {
        const validToken = tokens[0];
        setExistingToken(validToken.token);
        setLink(`${window.location.origin}/patient-booking/${validToken.token}`);
      } else {
        setExistingToken(null);
        setLink('');
      }
    } catch (error) {
      console.error('Erro ao verificar token existente:', error);
    }
  };

  const generateLink = async (forceNew = false) => {
    try {
      setLoading(true);

      // Se existe um token válido e não estamos forçando um novo, usar o existente
      if (existingToken && !forceNew) {
        setLink(`${window.location.origin}/patient-booking/${existingToken}`);
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

      const { error } = await supabase
        .from('patient_booking_tokens')
        .insert({
          token,
          patient_id: patient.id,
          expires_at: expiresAt.toISOString(),
          created_by: currentUser.id
        });

      if (error) throw error;

      const generatedLink = `${window.location.origin}/patient-booking/${token}`;
      setLink(generatedLink);
      setExistingToken(token);
      
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

    // Garantir que o link foi gerado
    const currentLink = link || `${window.location.origin}/patient-booking/${existingToken}`;
    if (!currentLink) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o link de agendamento.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Buscar nome do terapeuta atual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let therapistName = '';
      
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', currentUser.id)
          .single();
        
        therapistName = profile?.full_name || '';
      }

      const { data, error } = await supabase.functions.invoke('send-booking-link', {
        body: {
          patientEmail: email,
          patientName: patient.name,
          bookingLink: currentLink,
          therapistName
        }
      });

      if (error) throw error;

      toast({
        title: 'Email Enviado!',
        description: `Link de agendamento enviado para ${email}`,
      });
      
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
    const message = `Olá ${patient.name}! Para agendar sua consulta de forma rápida e fácil, acesse este link: ${link}`;
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
            <Calendar className="w-5 h-5" />
            Enviar Link de Agendamento
          </DialogTitle>
          <DialogDescription>
            Envie o link para {patient.name} agendar sua própria consulta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do Paciente</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp do Paciente</Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

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
                {loading ? 'Gerando...' : 'Gerar Link de Agendamento'}
              </Button>
            )}

            {link && (
              <>
                <Button
                  onClick={sendByWhatsApp}
                  disabled={loading || !whatsapp}
                  className="w-full"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar por WhatsApp
                </Button>

                <Button
                  onClick={sendByEmail}
                  disabled={loading || !email}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar por Email
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