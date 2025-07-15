import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  user_id?: string;
  is_active: boolean;
}

const PatientPasswordManager: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Agora filtrado automaticamente via RLS por account_id
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, email, phone, user_id, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de pacientes",
        variant: "destructive",
      });
    } finally {
      setLoadingPatients(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSearchTerm('');
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setConfirmPassword(result);
  };

  const setPatientPassword = async () => {
    if (!selectedPatient) {
      toast({
        title: "Erro",
        description: "Selecione um paciente",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Erro",
        description: "Digite uma senha",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('set-patient-password', {
        body: {
          patientId: selectedPatient.id,
          password: password,
          email: selectedPatient.email
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: data.message || "Senha definida com sucesso",
      });

      // Atualizar a lista de pacientes para refletir mudanças
      await loadPatients();
      resetForm();

    } catch (error: any) {
      console.error('Erro ao definir senha:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao definir senha do paciente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loadingPatients) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando pacientes...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Gerenciar Senha de Pacientes
        </CardTitle>
        <CardDescription>
          Defina ou altere senhas de acesso para pacientes do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="patient-search">Buscar Paciente</Label>
          <Input
            id="patient-search"
            placeholder="Digite o nome ou email do paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="patient-select">Selecionar Paciente</Label>
          <Select
            value={selectedPatient?.id || ""}
            onValueChange={(value) => {
              const patient = patients.find(p => p.id === value);
              setSelectedPatient(patient || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha um paciente" />
            </SelectTrigger>
            <SelectContent>
              {filteredPatients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{patient.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {patient.email} {patient.user_id && "• Tem acesso"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPatient && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Paciente Selecionado</h4>
            <p><strong>Nome:</strong> {selectedPatient.name}</p>
            <p><strong>Email:</strong> {selectedPatient.email}</p>
            <p><strong>Status:</strong> {selectedPatient.user_id ? "Já possui acesso ao sistema" : "Sem acesso ao sistema"}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Nova Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a nova senha"
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
          <Label htmlFor="confirm-password">Confirmar Senha</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={generateRandomPassword}
            disabled={loading}
          >
            Gerar Senha Aleatória
          </Button>
          <Button
            onClick={setPatientPassword}
            disabled={loading || !selectedPatient || !password}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedPatient?.user_id ? "Alterar Senha" : "Criar Acesso"}
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={resetForm}
          disabled={loading}
        >
          Limpar Formulário
        </Button>
      </CardContent>
    </Card>
  );
};

export default PatientPasswordManager;