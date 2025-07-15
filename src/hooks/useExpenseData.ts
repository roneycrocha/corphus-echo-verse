import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  supplier_name: string | null;
  reference_document: string | null;
  is_recurring: boolean;
  recurrence_type: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  category: {
    id: string;
    name: string;
    color: string;
  };
}

interface ExpenseSummary {
  totalExpenses: number;
  monthlyExpenses: number;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    color: string;
    percentage: number;
  }>;
  recurringExpenses: number;
  pendingExpenses: number;
}

export const useExpenseData = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalExpenses: 0,
    monthlyExpenses: 0,
    expensesByCategory: [],
    recurringExpenses: 0,
    pendingExpenses: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchExpenses = useCallback(async (filters?: {
    period?: string;
    category?: string;
    status?: string;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          expense_date,
          payment_method,
          supplier_name,
          reference_document,
          is_recurring,
          recurrence_type,
          notes,
          status,
          created_at,
          expense_categories!inner (
            id,
            name,
            color
          )
        `)
        .order('expense_date', { ascending: false });

      // Aplicar filtros de período
      if (filters?.period) {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.period) {
          case 'mes-atual':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'mes-anterior':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            query = query.gte('expense_date', startDate.toISOString().split('T')[0]);
            query = query.lte('expense_date', endDate.toISOString().split('T')[0]);
            break;
          case 'trimestre':
            startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            break;
          case 'ano':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        if (filters.period !== 'mes-anterior') {
          query = query.gte('expense_date', startDate.toISOString().split('T')[0]);
        }
      }

      // Aplicar filtro de categoria
      if (filters?.category && filters.category !== 'todas') {
        query = query.eq('category_id', filters.category);
      }

      // Aplicar filtro de status
      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformedExpenses: Expense[] = (data || []).map(expense => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        expense_date: expense.expense_date,
        payment_method: expense.payment_method,
        supplier_name: expense.supplier_name,
        reference_document: expense.reference_document,
        is_recurring: expense.is_recurring,
        recurrence_type: expense.recurrence_type,
        notes: expense.notes,
        status: expense.status,
        created_at: expense.created_at,
        category: {
          id: expense.expense_categories.id,
          name: expense.expense_categories.name,
          color: expense.expense_categories.color
        }
      }));

      setExpenses(transformedExpenses);
      calculateSummary(transformedExpenses);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateSummary = (expenses: Expense[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    const recurringExpenses = expenses
      .filter(expense => expense.is_recurring)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const pendingExpenses = expenses
      .filter(expense => expense.status === 'pendente')
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Calcular despesas por categoria
    const categoryMap = new Map();
    expenses.forEach(expense => {
      const categoryName = expense.category.name;
      const existing = categoryMap.get(categoryName) || { 
        amount: 0, 
        color: expense.category.color 
      };
      categoryMap.set(categoryName, {
        amount: existing.amount + expense.amount,
        color: expense.category.color
      });
    });

    const expensesByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      color: data.color,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0
    }));

    setSummary({
      totalExpenses,
      monthlyExpenses,
      expensesByCategory,
      recurringExpenses,
      pendingExpenses
    });
  };

  const deleteExpense = useCallback(async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('Despesa excluída com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir despesa:', error);
      toast.error(error.message || 'Erro ao excluir despesa');
      return false;
    }
  }, []);

  const updateExpenseStatus = useCallback(async (expenseId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status })
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('Status da despesa atualizado!');
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error(error.message || 'Erro ao atualizar status');
      return false;
    }
  }, []);

  return {
    expenses,
    summary,
    loading,
    fetchExpenses,
    deleteExpense,
    updateExpenseStatus
  };
};