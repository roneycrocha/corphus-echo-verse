import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Plus, Minus, CreditCard, TrendingUp, TrendingDown, Users, Building2 } from 'lucide-react';
import { usePlatformCreditManagement } from '@/hooks/usePlatformCreditManagement';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PlatformCreditManagement = () => {
  const {
    accounts,
    loading,
    loadAllAccounts,
    loadPlatformTransactions,
    addCreditsToAccount,
    consumeCreditsFromAccount
  } = usePlatformCreditManagement();
  
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [creditForm, setCreditForm] = useState({
    operation: 'add' as 'add' | 'remove',
    amount: '',
    description: ''
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);

  const loadTransactions = async () => {
    const data = await loadPlatformTransactions();
    setTransactions(data);
  };

  const handleCreditOperation = async () => {
    if (!selectedAccount || !creditForm.amount || !creditForm.description) {
      alert('Por favor, preencha todos os campos e selecione uma conta');
      return;
    }

    const amount = parseInt(creditForm.amount);
    if (amount <= 0) {
      alert('O valor deve ser maior que zero');
      return;
    }

    let success = false;
    if (creditForm.operation === 'add') {
      success = await addCreditsToAccount(selectedAccount.id, amount, creditForm.description);
    } else {
      success = await consumeCreditsFromAccount(selectedAccount.id, amount, creditForm.description);
    }

    if (success) {
      setCreditForm({ operation: 'add', amount: '', description: '' });
      setSelectedAccount(null);
      setIsFormOpen(false);
    }
  };

  const openTransactions = async () => {
    await loadTransactions();
    setTransactionsOpen(true);
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'consumption':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'admin_adjustment':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'plan_bonus':
        return <Plus className="w-4 h-4 text-purple-500" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-100 text-green-800';
      case 'consumption':
        return 'bg-red-100 text-red-800';
      case 'admin_adjustment':
        return 'bg-blue-100 text-blue-800';
      case 'plan_bonus':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Carregando dados da plataforma...</p>
        </div>
      </div>
    );
  }

  // Calcular totais da plataforma
  const platformTotals = accounts.reduce((acc, account) => ({
    totalBalance: acc.totalBalance + account.credits.balance,
    totalPurchased: acc.totalPurchased + account.credits.total_purchased,
    totalConsumed: acc.totalConsumed + account.credits.total_consumed,
    totalUsers: acc.totalUsers + account.user_count
  }), { totalBalance: 0, totalPurchased: 0, totalConsumed: 0, totalUsers: 0 });

  return (
    <div className="space-y-6">
      {/* Resumo da Plataforma */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Créditos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformTotals.totalBalance}</div>
            <p className="text-xs text-muted-foreground">
              em todas as contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comprado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformTotals.totalPurchased}</div>
            <p className="text-xs text-muted-foreground">
              créditos adquiridos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consumido</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformTotals.totalConsumed}</div>
            <p className="text-xs text-muted-foreground">
              créditos utilizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">
              {platformTotals.totalUsers} usuários totais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestão de Créditos da Plataforma</CardTitle>
          <div className="space-x-2">
            <Button onClick={openTransactions} variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Ver Histórico Global
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Gerenciar Créditos
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerenciar Créditos de Conta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="account">Conta</Label>
                    <Select 
                      value={selectedAccount?.id || ''} 
                      onValueChange={(value) => {
                        const account = accounts.find(a => a.id === value);
                        setSelectedAccount(account);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.credits.balance} créditos)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="operation">Operação</Label>
                    <Select value={creditForm.operation} onValueChange={(value) => setCreditForm(prev => ({ ...prev, operation: value as 'add' | 'remove' }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Adicionar Créditos</SelectItem>
                        <SelectItem value="remove">Remover Créditos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Quantidade</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Digite a quantidade"
                      value={creditForm.amount}
                      onChange={(e) => setCreditForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Motivo da operação"
                      value={creditForm.description}
                      onChange={(e) => setCreditForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreditOperation}>
                      {creditForm.operation === 'add' ? 'Adicionar' : 'Remover'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Contas */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Contas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Conta</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Comprado</TableHead>
                <TableHead>Consumido</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {account.credits.balance} créditos
                    </Badge>
                  </TableCell>
                  <TableCell>{account.credits.total_purchased}</TableCell>
                  <TableCell>{account.credits.total_consumed}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{account.user_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase">
                      {account.credits.plan_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.is_active ? "default" : "secondary"}>
                      {account.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para Histórico de Transações Global */}
      <Dialog open={transactionsOpen} onOpenChange={setTransactionsOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Histórico Global de Transações</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.account_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getOperationIcon(transaction.transaction_type)}
                        <Badge className={getOperationColor(transaction.transaction_type)}>
                          {transaction.transaction_type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </TableCell>
                    <TableCell>{transaction.balance_after}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};