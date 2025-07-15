import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle2, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Papa from 'papaparse';

interface PatientCSVData {
  nome: string;
  cpf?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  endereco?: string;
  telefone?: string;
  profissao?: string;
  observacao?: string;
  genero?: string;
  dataNascimento?: string;
  status?: string;
}

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string; data: PatientCSVData }>;
}

interface PatientImportCSVProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const PatientImportCSV: React.FC<PatientImportCSVProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<PatientCSVData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      parseCSV(selectedFile);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV válido.",
        variant: "destructive"
      });
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data: PatientCSVData[] = results.data.map((row: any) => ({
          nome: row.nome || row.name || '',
          cpf: row.cpf || undefined,
          email: row.email || undefined,
          cidade: row.cidade || undefined,
          estado: row.estado || undefined,
          endereco: row.endereco || undefined,
          telefone: row.telefone || undefined,
          profissao: row.profissao || undefined,
          observacao: row.observacao || undefined,
          genero: row.genero || undefined,
          dataNascimento: row.dataNascimento || undefined,
          status: row.status || undefined
        }));
        
        setCsvData(data.filter(item => item.nome.trim() !== ''));
      },
      error: (error) => {
        toast({
          title: "Erro ao processar CSV",
          description: `Erro: ${error.message}`,
          variant: "destructive"
        });
      }
    });
  };

  const formatDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Assumindo formato DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // Retorna no formato YYYY-MM-DD para o banco
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null;
  };

  const validatePatientData = (data: PatientCSVData): string | null => {
    if (!data.nome || data.nome.trim() === '') {
      return 'Nome é obrigatório';
    }
    
    if (data.email && !data.email.includes('@')) {
      return 'Email inválido';
    }
    
    if (data.cpf && data.cpf.length > 0 && data.cpf.length !== 11) {
      return 'CPF deve ter 11 dígitos';
    }
    
    return null;
  };

  const importPatients = async () => {
    if (!user || csvData.length === 0) return;
    
    setIsProcessing(true);
    setImportProgress(0);
    
    const result: ImportResult = {
      success: 0,
      errors: []
    };
    
    for (let i = 0; i < csvData.length; i++) {
      const patientData = csvData[i];
      
      // Validar dados
      const validationError = validatePatientData(patientData);
      if (validationError) {
        result.errors.push({
          row: i + 2, // +2 porque começamos da linha 1 e temos o header
          error: validationError,
          data: patientData
        });
        setImportProgress(((i + 1) / csvData.length) * 100);
        continue;
      }
      
      try {
        // Preparar dados para inserção
        const insertData: any = {
          name: patientData.nome,
          created_by: user.id,
          is_active: patientData.status === 'ATIVO'
        };
        
        if (patientData.email) insertData.email = patientData.email;
        if (patientData.telefone) insertData.phone = patientData.telefone;
        if (patientData.profissao) insertData.occupation = patientData.profissao;
        if (patientData.genero) {
          // Converter para lowercase para atender à constraint do banco
          const genderMap: { [key: string]: string } = {
            'MASCULINO': 'masculino',
            'FEMININO': 'feminino',
            'OUTRO': 'outro',
            'masculino': 'masculino',
            'feminino': 'feminino',
            'outro': 'outro'
          };
          insertData.gender = genderMap[patientData.genero.toUpperCase()] || 'outro';
        }
        if (patientData.cpf) insertData.document = patientData.cpf;
        if (patientData.cpf) insertData.document_type = 'cpf'; // minúsculo para atender à constraint
        
        // Formatear data de nascimento
        if (patientData.dataNascimento) {
          const formattedDate = formatDate(patientData.dataNascimento);
          if (formattedDate) {
            insertData.birth_date = formattedDate;
          }
        }
        
        // Montar endereço se disponível
        if (patientData.endereco || patientData.cidade || patientData.estado) {
          insertData.address = {
            street: patientData.endereco || '',
            city: patientData.cidade || '',
            state: patientData.estado || ''
          };
        }
        
        // Inserir no banco
        const { error } = await supabase
          .from('patients')
          .insert(insertData);
        
        if (error) {
          result.errors.push({
            row: i + 2,
            error: error.message,
            data: patientData
          });
        } else {
          result.success++;
        }
        
      } catch (error) {
        result.errors.push({
          row: i + 2,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          data: patientData
        });
      }
      
      setImportProgress(((i + 1) / csvData.length) * 100);
    }
    
    setImportResult(result);
    setIsProcessing(false);
    
    if (result.success > 0) {
      toast({
        title: "Importação concluída",
        description: `${result.success} pacientes importados com sucesso.`,
      });
      onImportComplete();
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'nome', 'cpf', 'email', 'cidade', 'estado', 'endereco', 
      'telefone', 'profissao', 'observacao', 'genero', 'dataNascimento', 'status'
    ];
    
    const csvContent = headers.join(',') + '\n' +
      'João Silva,12345678901,joao@email.com,São Paulo,SP,Rua A 123,11999999999,Engenheiro,,MASCULINO,15/08/1990,ATIVO\n' +
      'Maria Santos,98765432100,maria@email.com,Rio de Janeiro,RJ,Rua B 456,21988888888,Médica,,FEMININO,22/03/1985,ATIVO';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'template_pacientes.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const removePatientFromList = (index: number) => {
    setCsvData(prevData => prevData.filter((_, i) => i !== index));
    toast({
      title: "Paciente removido",
      description: "Paciente removido da lista de importação.",
    });
  };

  const handleClose = () => {
    setFile(null);
    setCsvData([]);
    setImportResult(null);
    setImportProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Pacientes via CSV</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV para importar múltiplos pacientes de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Baixar Template</CardTitle>
              <CardDescription>
                Baixe um arquivo de exemplo com o formato correto para importação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Baixar Template CSV
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selecionar Arquivo</CardTitle>
              <CardDescription>
                Selecione o arquivo CSV com os dados dos pacientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar um arquivo CSV ou arraste aqui
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
              </div>
              
              {file && (
                <div className="mt-4 p-3 bg-secondary rounded-lg">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {csvData.length} registros encontrados
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editable Patient List */}
          {csvData.length > 0 && !importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revisar Lista de Pacientes</CardTitle>
                <CardDescription>
                  Revise os dados e remova pacientes que não deseja importar. {csvData.length} pacientes na lista.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                  {csvData.map((patient, index) => (
                    <div key={index} className="flex items-start justify-between p-4 border rounded-lg bg-secondary/20">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-4">
                          <p className="font-medium text-sm">{patient.nome}</p>
                          {patient.status && (
                            <Badge variant={patient.status === 'ATIVO' ? 'default' : 'secondary'} className="text-xs">
                              {patient.status}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                          {patient.email && (
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">Email:</span>
                              <span>{patient.email}</span>
                            </div>
                          )}
                          {patient.telefone && (
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">Telefone:</span>
                              <span>{patient.telefone}</span>
                            </div>
                          )}
                          {patient.cpf && (
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">CPF:</span>
                              <span>{patient.cpf}</span>
                            </div>
                          )}
                          {patient.genero && (
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">Gênero:</span>
                              <span>{patient.genero}</span>
                            </div>
                          )}
                          {patient.dataNascimento && (
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">Nascimento:</span>
                              <span>{patient.dataNascimento}</span>
                            </div>
                          )}
                          {patient.profissao && (
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">Profissão:</span>
                              <span>{patient.profissao}</span>
                            </div>
                          )}
                        </div>
                        
                        {(patient.endereco || patient.cidade || patient.estado) && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Endereço:</span>
                            <span> {[patient.endereco, patient.cidade, patient.estado].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePatientFromList(index)}
                        className="ml-4 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {csvData.length} {csvData.length === 1 ? 'paciente selecionado' : 'pacientes selecionados'} para importação
                  </div>
                  <Button 
                    onClick={importPatients} 
                    disabled={isProcessing || csvData.length === 0}
                    className="min-w-[200px]"
                  >
                    {isProcessing ? 'Importando...' : `Importar ${csvData.length} ${csvData.length === 1 ? 'Paciente' : 'Pacientes'}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importando pacientes...</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Resultado da Importação</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Sucessos</p>
                    <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-800">Erros</p>
                    <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
                  </div>
                </div>
                
                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Erros encontrados:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {importResult.errors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Linha {error.row}:</strong> {error.error}
                            <br />
                            <span className="text-muted-foreground">
                              Nome: {error.data.nome}
                            </span>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button onClick={handleClose} className="w-full">
                  Fechar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};