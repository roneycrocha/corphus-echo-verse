import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter,
  Download,
  Edit,
  Trash2,
  ArrowLeft,
  Save,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface AccountPlanItem {
  id: string;
  code: string;
  name: string;
  account_type: string;
  level: number;
  is_active: boolean;
  parent_id?: string;
  children?: AccountPlanItem[];
}

export const PlanoContasPage: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AccountPlanItem[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingAccount, setEditingAccount] = useState<AccountPlanItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: '',
    level: 1,
    parent_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchAccountPlan();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchTerm, filterType]);

  const fetchAccountPlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_plan')
        .select('*')
        .order('code');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Erro ao carregar plano de contas:', error);
      toast.error('Erro ao carregar plano de contas');
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    let filtered = accounts;

    if (searchTerm) {
      filtered = filtered.filter(account => 
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(account => account.account_type === filterType);
    }

    setFilteredAccounts(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.account_type) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      if (editingAccount) {
        // Atualizar conta existente
        const { error } = await supabase
          .from('account_plan')
          .update({
            code: formData.code,
            name: formData.name,
            account_type: formData.account_type,
            level: formData.level,
            parent_id: formData.parent_id || null,
            is_active: formData.is_active
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
        toast.success('Conta atualizada com sucesso');
      } else {
        // Criar nova conta
        const { error } = await supabase
          .from('account_plan')
          .insert([{
            code: formData.code,
            name: formData.name,
            account_type: formData.account_type,
            level: formData.level,
            parent_id: formData.parent_id || null,
            is_active: formData.is_active
          }]);

        if (error) throw error;
        toast.success('Conta criada com sucesso');
      }

      resetForm();
      fetchAccountPlan();
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      toast.error(error.message || 'Erro ao salvar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account: AccountPlanItem) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      account_type: account.account_type,
      level: account.level,
      parent_id: account.parent_id || '',
      is_active: account.is_active
    });
    setIsCreating(true);
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

    try {
      const { error } = await supabase
        .from('account_plan')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      toast.success('Conta excluída com sucesso');
      fetchAccountPlan();
    } catch (error: any) {
      console.error('Erro ao excluir conta:', error);
      toast.error(error.message || 'Erro ao excluir conta');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      account_type: '',
      level: 1,
      parent_id: '',
      is_active: true
    });
    setEditingAccount(null);
    setIsCreating(false);
  };

  const exportToExcel = () => {
    const exportData = accounts.map(account => ({
      'Código': account.code,
      'Nome': account.name,
      'Tipo': getAccountTypeLabel(account.account_type),
      'Nível': account.level,
      'Status': account.is_active ? 'Ativo' : 'Inativo'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plano de Contas');
    XLSX.writeFile(wb, `plano_de_contas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'receita': return 'Receita';
      case 'despesa': return 'Despesa';
      case 'ativo': return 'Ativo';
      case 'passivo': return 'Passivo';
      case 'patrimonio': return 'Patrimônio';
      default: return type;
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'receita': return 'bg-success/10 text-success border-success/20';
      case 'despesa': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'ativo': return 'bg-primary/10 text-primary border-primary/20';
      case 'passivo': return 'bg-warning/10 text-warning border-warning/20';
      case 'patrimonio': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getIndentation = (level: number) => {
    return { paddingLeft: `${(level - 1) * 20}px` };
  };

  const parentAccounts = accounts.filter(acc => acc.level < 4); // Máximo 4 níveis

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/financeiro')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                Plano de Contas
              </h1>
              <p className="text-muted-foreground">
                Estrutura hierárquica das contas contábeis
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportToExcel}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>
            <Button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Conta
            </Button>
          </div>
        </div>

        <div className={`grid gap-6 ${isCreating ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {/* Lista de Contas */}
          <div className={`space-y-4 ${isCreating ? 'lg:col-span-2' : 'col-span-full'}`}>
            {/* Filtros */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Código ou nome da conta"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="passivo">Passivo</SelectItem>
                        <SelectItem value="patrimonio">Patrimônio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterType('all');
                      }}
                      className="w-full flex items-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nome da Conta</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nível</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell className="h-12">
                              <div className="h-4 bg-muted rounded animate-pulse" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted rounded animate-pulse" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted rounded animate-pulse" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted rounded animate-pulse" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted rounded animate-pulse" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted rounded animate-pulse" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredAccounts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <BookOpen className="w-8 h-8" />
                              <p>Nenhuma conta encontrada</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAccounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-mono text-sm">
                              {account.code}
                            </TableCell>
                            <TableCell style={getIndentation(account.level)}>
                              <span className={`font-${account.level === 1 ? 'bold' : account.level === 2 ? 'semibold' : 'normal'}`}>
                                {account.name}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={getAccountTypeColor(account.account_type)}>
                                {getAccountTypeLabel(account.account_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>{account.level}</TableCell>
                            <TableCell>
                              <Badge variant={account.is_active ? 'default' : 'secondary'}>
                                {account.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(account)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(account.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {isCreating && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetForm}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Código *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="Ex: 1.1.001"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nome da conta"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account_type">Tipo *</Label>
                      <Select
                        value={formData.account_type}
                        onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="receita">Receita</SelectItem>
                          <SelectItem value="despesa">Despesa</SelectItem>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="passivo">Passivo</SelectItem>
                          <SelectItem value="patrimonio">Patrimônio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="level">Nível</Label>
                      <Select
                        value={formData.level.toString()}
                        onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Principal</SelectItem>
                          <SelectItem value="2">2 - Subgrupo</SelectItem>
                          <SelectItem value="3">3 - Conta</SelectItem>
                          <SelectItem value="4">4 - Subconta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="parent_id">Conta Superior</Label>
                      <Select
                        value={formData.parent_id || "none"}
                        onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {parentAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-input"
                      />
                      <Label htmlFor="is_active">Conta ativa</Label>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {editingAccount ? 'Atualizar' : 'Criar'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};