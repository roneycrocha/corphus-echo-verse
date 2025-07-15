import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, AlertTriangle, CheckCircle, Trash2, Mail } from 'lucide-react';

interface EmailConflictAnalysis {
  email: string;
  authUser: any;
  profiles: any[];
  patients: any[];
  conflicts: {
    hasAuthUser: boolean;
    hasProfiles: boolean;
    hasPatients: boolean;
    multipleProfiles: boolean;
    multiplePatients: boolean;
  };
}

export const EmailConflictManager = () => {
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [analysis, setAnalysis] = useState<EmailConflictAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const { toast } = useToast();

  const analyzeEmail = async () => {
    if (!email.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um email para analisar',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('resolve-email-conflict', {
        body: {
          email: email.trim(),
          action: 'analyze'
        }
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      
      const conflictCount = Object.values(data.analysis.conflicts).filter(Boolean).length;
      if (conflictCount === 0) {
        toast({
          title: 'Sem conflitos',
          description: 'Este email não possui conflitos no sistema',
        });
      }
    } catch (error: any) {
      console.error('Erro ao analisar email:', error);
      toast({
        title: 'Erro',
        description: `Erro ao analisar email: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveConflicts = async () => {
    if (!analysis) return;

    setResolving(true);
    try {
      const { data, error } = await supabase.functions.invoke('resolve-email-conflict', {
        body: {
          email: analysis.email,
          action: 'resolve',
          newEmail: newEmail.trim() || undefined
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Conflitos resolvidos!',
          description: `${data.steps.length} ações executadas com sucesso`,
        });
        
        // Reanalizar após resolver
        await analyzeEmail();
        setNewEmail('');
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Erro ao resolver conflitos:', error);
      toast({
        title: 'Erro',
        description: `Erro ao resolver conflitos: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setResolving(false);
    }
  };

  const hasConflicts = analysis && Object.values(analysis.conflicts).some(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Gerenciador de Conflitos de Email
        </CardTitle>
        <CardDescription>
          Identifique e resolva conflitos de email duplicado no sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Digite o email para analisar"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="flex-1"
          />
          <Button 
            onClick={analyzeEmail} 
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              "Analisando..."
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Analisar
              </>
            )}
          </Button>
        </div>

        {analysis && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">Análise para: {analysis.email}</h4>
              {hasConflicts ? (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Conflitos encontrados
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Sem conflitos
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Usuário Auth */}
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Sistema de Autenticação</h5>
                {analysis.authUser ? (
                  <Alert>
                    <AlertDescription>
                      <div className="text-xs">
                        <div>ID: {analysis.authUser.id}</div>
                        <div>Criado: {new Date(analysis.authUser.created_at).toLocaleDateString()}</div>
                        <div>Email confirmado: {analysis.authUser.email_confirmed_at ? 'Sim' : 'Não'}</div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-sm text-gray-500">Nenhum usuário encontrado</div>
                )}
              </div>

              {/* Perfis */}
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Perfis ({analysis.profiles.length})</h5>
                {analysis.profiles.length > 0 ? (
                  <div className="space-y-1">
                    {analysis.profiles.map((profile, index) => (
                      <Alert key={profile.id} variant={index > 0 ? "destructive" : "default"}>
                        <AlertDescription>
                          <div className="text-xs">
                            <div className="font-medium">{profile.full_name}</div>
                            <div>Tipo: {profile.user_type}</div>
                            <div>Papel: {profile.role}</div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Nenhum perfil encontrado</div>
                )}
              </div>

              {/* Pacientes */}
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Pacientes ({analysis.patients.length})</h5>
                {analysis.patients.length > 0 ? (
                  <div className="space-y-1">
                    {analysis.patients.map((patient, index) => (
                      <Alert key={patient.id} variant={index > 0 ? "destructive" : "default"}>
                        <AlertDescription>
                          <div className="text-xs">
                            <div className="font-medium">{patient.name}</div>
                            <div>Email: {patient.email}</div>
                            <div>User ID: {patient.user_id ? 'Vinculado' : 'Não vinculado'}</div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Nenhum paciente encontrado</div>
                )}
              </div>
            </div>

            {hasConflicts && (
              <div className="space-y-3 border-t pt-4">
                <h5 className="font-medium text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Ações de Resolução
                </h5>
                
                {analysis.conflicts.multiplePatients && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Múltiplos pacientes com o mesmo email encontrados. 
                      Digite um novo email para os pacientes duplicados:
                    </p>
                    <Input
                      placeholder="Novo email para pacientes duplicados"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      type="email"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={resolveConflicts}
                    disabled={resolving || (analysis.conflicts.multiplePatients && !newEmail.trim())}
                    variant="destructive"
                  >
                    {resolving ? (
                      "Resolvendo..."
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Resolver Conflitos
                      </>
                    )}
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Atenção:</strong> Esta ação irá remover registros duplicados e 
                    limpar vinculações incorretas. Esta operação não pode ser desfeita.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};