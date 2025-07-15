import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AccountPlanItem {
  id: string;
  code: string;
  name: string;
  account_type: string;
  level: number;
  is_active: boolean;
}

export const AccountPlanDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountPlanItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAccountPlan();
    }
  }, [open]);

  const fetchAccountPlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_plan')
        .select('id, code, name, account_type, level, is_active')
        .order('code');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Erro ao carregar plano de contas:', error);
    } finally {
      setLoading(false);
    }
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
      case 'receita': return 'bg-green-100 text-green-800';
      case 'despesa': return 'bg-red-100 text-red-800';
      case 'ativo': return 'bg-blue-100 text-blue-800';
      case 'passivo': return 'bg-yellow-100 text-yellow-800';
      case 'patrimonio': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIndentation = (level: number) => {
    return {
      paddingLeft: `${(level - 1) * 20}px`
    };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BookOpen className="w-4 h-4 mr-2" />
          Plano de Contas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Plano de Contas</DialogTitle>
          <DialogDescription>
            Estrutura hierárquica das contas contábeis
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome da Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};