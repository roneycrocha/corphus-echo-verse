import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  patient_id: string;
  session_id?: string | null;
  amount: number;
  description: string;
  transaction_date: string;
  due_date?: string | null;
  payment_date?: string | null;
  status: string; // 'pending' | 'paid' | 'overdue' | 'cancelled'
  payment_method?: string | null; // 'pix' | 'card' | 'transfer' | 'cash' | 'other'
  receipt_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Dados do paciente (join)
  patient_name?: string;
  patient_email?: string;
  patients?: { name: string; email: string };
  sessions?: { session_type: string };
}

export interface Receipt {
  id: string;
  transaction_id: string;
  receipt_number: string;
  issue_date: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  monthlyRevenue: number;
  pendingRevenue: number;
  overallPercentage: number;
  paidTransactions: number;
  pendingTransactions: number;
  overdueTransactions: number;
  totalTransactions: number;
  receiptsIssued: number;
}

export const useFinancialData = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    monthlyRevenue: 0,
    pendingRevenue: 0,
    overallPercentage: 0,
    paidTransactions: 0,
    pendingTransactions: 0,
    overdueTransactions: 0,
    totalTransactions: 0,
    receiptsIssued: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async (filters?: {
    period?: string;
    status?: string;
  }) => {
    try {
      setLoading(true);
      
      // Query agora filtrada automaticamente via RLS por account_id
      let query = supabase
        .from('transactions')
        .select(`
          *,
          patients!inner(name, email),
          sessions(session_type)
        `)
        .order('transaction_date', { ascending: false });

      // Aplicar filtros de período
      if (filters?.period && filters.period !== 'todos') {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.period) {
          case 'mes-atual':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'mes-anterior':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            query = query.gte('transaction_date', startDate.toISOString().split('T')[0])
                        .lte('transaction_date', endDate.toISOString().split('T')[0]);
            break;
          case 'trimestre':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
          case 'ano':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        if (filters.period !== 'mes-anterior') {
          query = query.gte('transaction_date', startDate.toISOString().split('T')[0]);
        }
      }

      // Aplicar filtros de status
      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transformar dados para incluir nome do paciente
      const transformedData: Transaction[] = (data || []).map(item => ({
        ...item,
        patient_name: item.patients?.name || 'Paciente não encontrado',
        patient_email: item.patients?.email || '',
      }));

      setTransactions(transformedData);
      calculateSummary(transformedData);
      
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateSummary = (transactionData: Transaction[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filtrar transações do mês atual
    const currentMonthTransactions = transactionData.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const paid = currentMonthTransactions.filter(t => t.status === 'paid');
    const pending = currentMonthTransactions.filter(t => t.status === 'pending');
    const overdue = currentMonthTransactions.filter(t => t.status === 'overdue');

    const monthlyRevenue = paid.reduce((sum, t) => sum + Number(t.amount), 0);
    const pendingRevenue = pending.reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Calcular percentual de crescimento (simulado por enquanto)
    const lastMonthRevenue = monthlyRevenue * 0.8; // Simula mês anterior
    const overallPercentage = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    setSummary({
      monthlyRevenue,
      pendingRevenue,
      overallPercentage,
      paidTransactions: paid.length,
      pendingTransactions: pending.length,
      overdueTransactions: overdue.length,
      totalTransactions: currentMonthTransactions.length,
      receiptsIssued: paid.length, // Assumindo que cada transação paga tem recibo
    });
  };

  const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Transação criada com sucesso!');
      fetchTransactions(); // Recarregar dados
      return data;
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      toast.error('Erro ao criar transação');
      throw error;
    }
  };

  const updateTransactionStatus = async (transactionId: string, status: Transaction['status'], paymentMethod?: string) => {
    try {
      const updates: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'paid') {
        updates.payment_date = new Date().toISOString().split('T')[0];
        if (paymentMethod) {
          updates.payment_method = paymentMethod;
        }
      }

      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transactionId);

      if (error) throw error;

      toast.success('Status da transação atualizado!');
      fetchTransactions(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      toast.error('Erro ao atualizar transação');
      throw error;
    }
  };

  const generateReceipt = async (transactionId: string) => {
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) throw new Error('Transação não encontrada');

      // Gerar número do recibo
      const receiptNumber = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const { data, error } = await supabase
        .from('receipts')
        .insert([{
          transaction_id: transactionId,
          receipt_number: receiptNumber,
          issue_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;

      // Atualizar a transação com o ID do recibo
      await supabase
        .from('transactions')
        .update({ receipt_id: receiptNumber })
        .eq('id', transactionId);

      toast.success(`Recibo ${receiptNumber} gerado com sucesso!`);
      fetchTransactions(); // Recarregar dados
      return data;
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
      toast.error('Erro ao gerar recibo');
      throw error;
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    summary,
    loading,
    fetchTransactions,
    createTransaction,
    updateTransactionStatus,
    generateReceipt,
  };
};