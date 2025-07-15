import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, History, User, Coins, CreditCard, Edit2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface CreditInfo {
  user_id: string;
  balance: number;
  total_purchased: number;
  total_consumed: number;
  plan_type: 'bronze' | 'silver' | 'gold';
  credit_multiplier: number;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface UserWithCredits extends UserProfile {
  credits?: CreditInfo;
}

export const UserCreditManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithCredits[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [userTransactions, setUserTransactions] = useState<CreditTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const { toast } = useToast();

  const [creditForm, setCreditForm] = useState({
    amount: '',
    description: '',
    operation: 'add' as 'add' | 'remove'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      // Carregar usuários com seus perfis
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Para cada usuário, carregar informações de crédito
      const usersWithCredits = await Promise.all(
        (profiles || []).map(async (profile) => {
          try {
            const { data: creditInfo } = await supabase.rpc('get_user_credit_info', {
              p_user_id: profile.user_id
            });

            return {
              ...profile,
               credits: creditInfo?.[0] ? {
                user_id: profile.user_id,
                balance: creditInfo[0].balance,
                total_purchased: creditInfo[0].total_purchased,
                total_consumed: creditInfo[0].total_consumed,
                plan_type: creditInfo[0].plan_type as 'bronze' | 'silver' | 'gold',
                credit_multiplier: creditInfo[0].credit_multiplier
              } : {
                user_id: profile.user_id,
                balance: 0,
                total_purchased: 0,
                total_consumed: 0,
                plan_type: 'bronze' as const,
                credit_multiplier: 1.0
              }
            };
          } catch (error) {
            console.error('Erro ao carregar créditos para usuário:', profile.user_id, error);
            return {
              ...profile,
              credits: {
                user_id: profile.user_id,
                balance: 0,
                total_purchased: 0,
                total_consumed: 0,
                plan_type: 'bronze' as const,
                credit_multiplier: 1.0
              }
            };
          }
        })
      );

      setUsers(usersWithCredits);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUserTransactions(data || []);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico de transações.',
        variant: 'destructive'
      });
    }
  };

  const handleCreditOperation = async () => {
    if (!selectedUser || !creditForm.amount || !creditForm.description) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const amount = parseInt(creditForm.amount);
      if (amount <= 0) {
        toast({
          title: 'Erro',
          description: 'O valor deve ser maior que zero.',
          variant: 'destructive'
        });
        return;
      }

      if (creditForm.operation === 'add') {
        // Adicionar créditos
        const { data, error } = await supabase.rpc('add_credits', {
          p_user_id: selectedUser.user_id,
          p_amount: amount,
          p_description: `[ADMIN] ${creditForm.description}`,
          p_transaction_type: 'admin_adjustment'
        });

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: `${amount} créditos adicionados com sucesso!`,
        });
      } else {
        // Remover créditos (consumir)
        const { data, error } = await supabase.rpc('consume_credits', {
          p_user_id: selectedUser.user_id,
          p_amount: amount,
          p_description: `[ADMIN] ${creditForm.description}`
        });

        if (error) throw error;

        if (!data) {
          toast({
            title: 'Erro',
            description: 'Usuário não possui créditos suficientes.',
            variant: 'destructive'
          });
          return;
        }

        toast({
          title: 'Sucesso',
          description: `${amount} créditos removidos com sucesso!`,
        });
      }

      // Recarregar dados
      await loadUsers();
      if (selectedUser) {
        await loadUserTransactions(selectedUser.user_id);
      }

      // Fechar dialog e resetar form
      setIsCreditDialogOpen(false);
      setCreditForm({
        amount: '',
        description: '',
        operation: 'add'
      });

    } catch (error) {
      console.error('Erro na operação de crédito:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível realizar a operação.',
        variant: 'destructive'
      });
    }
  };

  const handleViewHistory = async (user: UserWithCredits) => {
    setSelectedUser(user);
    await loadUserTransactions(user.user_id);
    setIsHistoryDialogOpen(true);
  };

  const handleEditCredits = (user: UserWithCredits) => {
    setSelectedUser(user);
    setCreditForm({
      amount: '',
      description: '',
      operation: 'add'
    });
    setIsCreditDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'consumption':
        return <Minus className="w-4 h-4 text-red-500" />;
      case 'admin_adjustment':
        return <Edit2 className="w-4 h-4 text-blue-500" />;
      default:
        return <Coins className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'Compra';
      case 'consumption':
        return 'Consumo';
      case 'admin_adjustment':
        return 'Ajuste Admin';
      case 'plan_bonus':
        return 'Bônus Plano';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <Coins className="w-5 h-5 text-primary" />
              <span>Gestão de Créditos dos Usuários</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Visualize e gerencie os créditos de todos os usuários da plataforma
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Barra de busca */}
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-sm"
          />
        </div>

        {/* Lista de usuários */}
        <div className="space-y-3 sm:space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="border rounded-lg p-3 sm:p-4 hover-scale transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate text-sm sm:text-base">{user.full_name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Plano {user.credits?.plan_type || 'bronze'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <div className="text-center sm:text-right">
                    <div className="font-semibold text-lg flex items-center justify-center sm:justify-end space-x-1">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span>{user.credits?.balance || 0}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total: {user.credits?.total_purchased || 0} | Usado: {user.credits?.total_consumed || 0}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 justify-center sm:justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCredits(user)}
                      className="flex-1 sm:flex-none"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Editar</span>
                      <span className="sm:hidden">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewHistory(user)}
                      className="flex-1 sm:flex-none"
                    >
                      <History className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Histórico</span>
                      <span className="sm:hidden">Hist</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado.</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Dialog para editar créditos */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Editar Créditos</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-semibold truncate">{selectedUser.full_name}</h3>
                <p className="text-sm text-muted-foreground truncate">{selectedUser.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary">
                    Saldo atual: {selectedUser.credits?.balance || 0} créditos
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Operação</Label>
                  <Select
                    value={creditForm.operation}
                    onValueChange={(value: 'add' | 'remove') => 
                      setCreditForm({...creditForm, operation: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">
                        <div className="flex items-center space-x-2">
                          <Plus className="w-4 h-4 text-green-500" />
                          <span>Adicionar créditos</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="remove">
                        <div className="flex items-center space-x-2">
                          <Minus className="w-4 h-4 text-red-500" />
                          <span>Remover créditos</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Quantidade de créditos</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={creditForm.amount}
                    onChange={(e) => setCreditForm({...creditForm, amount: e.target.value})}
                    placeholder="Digite a quantidade"
                    min="1"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição/Motivo</Label>
                  <Textarea
                    id="description"
                    value={creditForm.description}
                    onChange={(e) => setCreditForm({...creditForm, description: e.target.value})}
                    placeholder="Descreva o motivo da alteração..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreditDialogOpen(false)}
                  className="order-2 sm:order-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreditOperation} className="order-1 sm:order-2">
                  {creditForm.operation === 'add' ? 'Adicionar' : 'Remover'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para histórico de transações */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Histórico de Transações</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 flex flex-col overflow-hidden">
              <div className="border-b pb-4 flex-shrink-0">
                <h3 className="font-semibold truncate">{selectedUser.full_name}</h3>
                <p className="text-sm text-muted-foreground truncate">{selectedUser.email}</p>
                <Badge variant="secondary" className="mt-2">
                  Saldo atual: {selectedUser.credits?.balance || 0} créditos
                </Badge>
              </div>
              
              <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-2 flex-1">
                {userTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma transação encontrada.</p>
                  </div>
                ) : (
                  userTransactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-3 hover-scale transition-all duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {getTransactionIcon(transaction.transaction_type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                              <Badge variant="outline" className="text-xs w-fit">
                                {getTransactionTypeLabel(transaction.transaction_type)}
                              </Badge>
                              <span className={`font-semibold text-sm sm:text-base ${
                                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground break-words">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(transaction.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-center sm:text-right flex-shrink-0">
                          <div className="text-sm font-medium">
                            Saldo: {transaction.balance_after}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};