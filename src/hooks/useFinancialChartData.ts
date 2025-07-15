import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface FinancialChartData {
  revenueEvolution: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  paymentMethods: {
    method: string;
    amount: number;
    percentage: number;
  }[];
  cashFlow: {
    date: string;
    inflow: number;
    outflow: number;
    balance: number;
  }[];
  expensesByCategory: {
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }[];
}

export const useFinancialChartData = (dateRange?: { start: Date; end: Date }) => {
  const [chartData, setChartData] = useState<FinancialChartData>({
    revenueEvolution: [],
    paymentMethods: [],
    cashFlow: [],
    expensesByCategory: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialChartData();
  }, [dateRange]);

  const fetchFinancialChartData = async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        fetchRevenueEvolution(),
        fetchPaymentMethods(),
        fetchCashFlow(),
        fetchExpensesByCategory()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados dos gráficos financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueEvolution = async () => {
    try {
      // Buscar dados dos últimos 12 meses
      const startDate = dateRange?.start || subMonths(new Date(), 11);
      const endDate = dateRange?.end || new Date();

      // Buscar transações (receitas)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, payment_date, status')
        .eq('status', 'paid')
        .gte('payment_date', startDate.toISOString())
        .lte('payment_date', endDate.toISOString());

      // Buscar despesas
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .gte('expense_date', startDate.toISOString())
        .lte('expense_date', endDate.toISOString());

      // Agrupar por mês
      const monthlyData = new Map();

      // Processar receitas
      transactions?.forEach(transaction => {
        const date = new Date(transaction.payment_date!);
        const monthKey = format(startOfMonth(date), 'yyyy-MM');
        const monthName = format(date, 'MMM yyyy');
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthName,
            revenue: 0,
            expenses: 0,
            profit: 0
          });
        }
        
        monthlyData.get(monthKey).revenue += Number(transaction.amount);
      });

      // Processar despesas
      expenses?.forEach(expense => {
        const date = new Date(expense.expense_date);
        const monthKey = format(startOfMonth(date), 'yyyy-MM');
        const monthName = format(date, 'MMM yyyy');
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthName,
            revenue: 0,
            expenses: 0,
            profit: 0
          });
        }
        
        monthlyData.get(monthKey).expenses += Number(expense.amount);
      });

      // Calcular lucro
      const evolutionData = Array.from(monthlyData.values()).map(data => ({
        ...data,
        profit: data.revenue - data.expenses
      }));

      setChartData(prev => ({ ...prev, revenueEvolution: evolutionData }));
    } catch (error) {
      console.error('Erro ao buscar evolução de receitas:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const startDate = dateRange?.start || startOfMonth(new Date());
      const endDate = dateRange?.end || endOfMonth(new Date());

      const { data: transactions } = await supabase
        .from('transactions')
        .select('payment_method, amount')
        .eq('status', 'paid')
        .gte('payment_date', startDate.toISOString())
        .lte('payment_date', endDate.toISOString());

      if (!transactions) return;

      // Agrupar por método de pagamento
      const methodData = new Map();
      let totalAmount = 0;

      transactions.forEach(transaction => {
        const method = transaction.payment_method || 'outros';
        totalAmount += Number(transaction.amount);
        
        if (!methodData.has(method)) {
          methodData.set(method, 0);
        }
        
        methodData.set(method, methodData.get(method) + Number(transaction.amount));
      });

      // Converter para array com percentuais
      const paymentMethodsData = Array.from(methodData.entries()).map(([method, amount]) => ({
        method: getMethodLabel(method),
        amount: Number(amount),
        percentage: totalAmount > 0 ? Math.round((Number(amount) / totalAmount) * 100) : 0
      }));

      setChartData(prev => ({ ...prev, paymentMethods: paymentMethodsData }));
    } catch (error) {
      console.error('Erro ao buscar métodos de pagamento:', error);
    }
  };

  const fetchCashFlow = async () => {
    try {
      const startDate = dateRange?.start || subMonths(new Date(), 2);
      const endDate = dateRange?.end || new Date();

      // Buscar receitas por dia
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, payment_date')
        .eq('status', 'paid')
        .gte('payment_date', startDate.toISOString())
        .lte('payment_date', endDate.toISOString());

      // Buscar despesas por dia
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .gte('expense_date', startDate.toISOString())
        .lte('expense_date', endDate.toISOString());

      // Agrupar por dia
      const dailyData = new Map();

      // Processar receitas
      transactions?.forEach(transaction => {
        const date = format(new Date(transaction.payment_date!), 'yyyy-MM-dd');
        
        if (!dailyData.has(date)) {
          dailyData.set(date, { date, inflow: 0, outflow: 0, balance: 0 });
        }
        
        dailyData.get(date).inflow += Number(transaction.amount);
      });

      // Processar despesas
      expenses?.forEach(expense => {
        const date = format(new Date(expense.expense_date), 'yyyy-MM-dd');
        
        if (!dailyData.has(date)) {
          dailyData.set(date, { date, inflow: 0, outflow: 0, balance: 0 });
        }
        
        dailyData.get(date).outflow += Number(expense.amount);
      });

      // Calcular saldo acumulado
      const cashFlowData = Array.from(dailyData.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .reduce((acc, current, index) => {
          const balance = index === 0 
            ? current.inflow - current.outflow
            : acc[index - 1].balance + current.inflow - current.outflow;
          
          acc.push({
            ...current,
            balance,
            date: format(new Date(current.date), 'dd/MM')
          });
          
          return acc;
        }, [] as any[]);

      setChartData(prev => ({ ...prev, cashFlow: cashFlowData }));
    } catch (error) {
      console.error('Erro ao buscar fluxo de caixa:', error);
    }
  };

  const fetchExpensesByCategory = async () => {
    try {
      const startDate = dateRange?.start || startOfMonth(new Date());
      const endDate = dateRange?.end || endOfMonth(new Date());

      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          amount,
          expense_categories!inner(name, color)
        `)
        .gte('expense_date', startDate.toISOString())
        .lte('expense_date', endDate.toISOString());

      if (!expenses) return;

      // Agrupar por categoria
      const categoryData = new Map();
      let totalAmount = 0;

      expenses.forEach((expense: any) => {
        const category = expense.expense_categories.name;
        const color = expense.expense_categories.color;
        const amount = Number(expense.amount);
        totalAmount += amount;
        
        if (!categoryData.has(category)) {
          categoryData.set(category, { amount: 0, color });
        }
        
        categoryData.get(category).amount += amount;
      });

      // Converter para array com percentuais
      const expensesData = Array.from(categoryData.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
        color: data.color
      }));

      setChartData(prev => ({ ...prev, expensesByCategory: expensesData }));
    } catch (error) {
      console.error('Erro ao buscar despesas por categoria:', error);
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'pix': return 'PIX';
      case 'card': return 'Cartão';
      case 'transfer': return 'Transferência';
      case 'cash': return 'Dinheiro';
      case 'outros': return 'Outros';
      default: return method;
    }
  };

  return {
    chartData,
    loading,
    refetch: fetchFinancialChartData
  };
};