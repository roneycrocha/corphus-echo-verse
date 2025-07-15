import React, { useState, useEffect } from 'react';
import { Copy, Link, Mail, User, Search, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  user_id?: string;
  is_active: boolean;
}

export const PatientPasswordLink: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Agora filtrado automaticamente via RLS por account_id
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, email, phone, user_id, is_active')
        .eq('is_active', true)
        .not('user_id', 'is', null) // Apenas pacientes com conta de usuário
        .order('name');

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

  const generatePasswordResetLink = async () => {
    if (!selectedPatient) {
      toast({
        title: 'Erro',
        description: 'Selecione um paciente primeiro.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Usar a funcionalidade nativa do Supabase para reset de senha
      const { error } = await supabase.auth.resetPasswordForEmail(selectedPatient.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: 'Link de reset enviado!',
        description: `Email com link de reset de senha enviado para ${selectedPatient.email}.`,
      });
      
      resetForm();
    } catch (error: any) {
      console.error('Erro ao enviar reset:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar o link de reset.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateResetLinkToCopy = async () => {
    if (!selectedPatient) {
      toast({
        title: 'Erro',
        description: 'Selecione um paciente primeiro.',
        variant: 'destructive'
      });
      return;
    }

    setIsGeneratingLink(true);
    setGeneratedLink(null);

    try {
      console.log('Chamando edge function para:', selectedPatient.email);
      
      const { data, error } = await supabase.functions.invoke('generate-password-reset-link', {
        body: { email: selectedPatient.email }
      });

      console.log('Resposta da edge function:', { data, error });

      if (error) {
        console.error('Erro da edge function:', error);
        throw error;
      }

      if (!data || !data.link) {
        throw new Error('Link não foi gerado corretamente');
      }

      setGeneratedLink(data.link);
      
      toast({
        title: 'Link gerado!',
        description: 'Link de reset de senha gerado. Você pode copiá-lo agora.',
      });
    } catch (error: any) {
      console.error('Erro ao gerar link:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível gerar o link de reset.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyLinkToClipboard = async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink);
      toast({
        title: 'Link copiado!',
        description: 'Link de reset copiado para a área de transferência.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o link.',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    setGeneratedLink(null);
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Key className="h-5 w-5" />
        Gerar Link de Reset de Senha
      </CardTitle>
      <CardDescription>
        Crie um link para que pacientes com acesso ao sistema possam redefinir suas senhas.
      </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar Paciente
            </Label>
            <Input
              id="search"
              placeholder="Digite o nome ou email do paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="patient" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Selecionar Paciente
            </Label>
            <Select 
              value={selectedPatient?.id || ''} 
              onValueChange={(value) => {
                const patient = patients.find(p => p.id === value);
                setSelectedPatient(patient || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha um paciente com acesso ao sistema" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : filteredPatients.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente com acesso encontrado'}
                  </SelectItem>
                ) : (
                  filteredPatients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{patient.name}</span>
                        <span className="text-sm text-muted-foreground">{patient.email}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPatient && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Paciente Selecionado:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Nome:</strong> {selectedPatient.name}</p>
                <p><strong>Email:</strong> {selectedPatient.email}</p>
                {selectedPatient.phone && (
                  <p><strong>Telefone:</strong> {selectedPatient.phone}</p>
                )}
                <Badge variant="secondary">Com acesso ao sistema</Badge>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex gap-3">
            <Button 
              onClick={generatePasswordResetLink} 
              disabled={isGenerating || !selectedPatient}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              {isGenerating ? 'Enviando por email...' : 'Enviar por Email'}
            </Button>
            <Button 
              onClick={generateResetLinkToCopy} 
              disabled={isGeneratingLink || !selectedPatient}
              variant="outline"
              className="flex-1"
            >
              <Link className="h-4 w-4 mr-2" />
              {isGeneratingLink ? 'Gerando link...' : 'Gerar Link para Copiar'}
            </Button>
          </div>

          {generatedLink && (
            <div className="p-3 bg-muted rounded-lg space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Link de Reset Gerado:</Label>
                <div className="flex gap-2">
                  <Input 
                    value={generatedLink} 
                    readOnly 
                    className="text-xs"
                  />
                  <Button 
                    onClick={copyLinkToClipboard}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Você pode enviar este link por WhatsApp, SMS ou qualquer outro canal.
              </p>
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Apenas pacientes com acesso ao sistema aparecem na lista</p>
          <p>• Envie por email ou gere um link para copiar e enviar por outros canais</p>
          <p>• O paciente poderá redefinir sua senha através do link</p>
          <p>• O link de reset expira automaticamente após o uso</p>
        </div>
      </CardContent>
    </Card>
  );
};