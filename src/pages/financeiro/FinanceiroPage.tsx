import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Receipt, 
  TrendingUp, 
  AlertTriangle,
  Download,
  Filter,
  Plus,
  Eye,
  Calendar,
  RefreshCw,
  TrendingDown,
  Repeat,
  CreditCard,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialData } from '@/hooks/useFinancialData';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useFinancialChartData } from '@/hooks/useFinancialChartData';
import { CreateTransactionDialog } from '@/components/financeiro/CreateTransactionDialog';
import { UpdateTransactionStatusDialog } from '@/components/financeiro/UpdateTransactionStatusDialog';
import { EditTransactionDialog } from '@/components/financeiro/EditTransactionDialog';
import { DeleteTransactionDialog } from '@/components/financeiro/DeleteTransactionDialog';
import { CreateExpenseDialog } from '@/components/financeiro/CreateExpenseDialog';
import { FinancialReports } from '@/components/financeiro/FinancialReports';
import { SimpleDateFilter } from '@/components/financeiro/SimpleDateFilter';
import { DateRangeFilter } from '@/components/financeiro/DateRangeFilter';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';

/**
 * Página Financeira - Controle de receitas e emissão de recibos
 */
export const FinanceiroPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('mes-atual');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [selectedExpensePeriod, setSelectedExpensePeriod] = useState('mes-atual');
  const [filterExpenseStatus, setFilterExpenseStatus] = useState('todos');
  const [chartDateRange, setChartDateRange] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [categories, setCategories] = useState<any[]>([]);
  const { canEditTransactions, canDeleteTransactions } = usePermissions();

  const {
    transactions,
    summary,
    loading,
    fetchTransactions,
    updateTransactionStatus,
    generateReceipt,
  } = useFinancialData();

  const {
    expenses,
    summary: expenseSummary,
    loading: loadingExpenses,
    fetchExpenses,
    deleteExpense,
    updateExpenseStatus
  } = useExpenseData();

  const {
    chartData,
    loading: loadingCharts,
    refetch: refetchCharts
  } = useFinancialChartData(chartDateRange ? { start: chartDateRange.from!, end: chartDateRange.to! } : undefined);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Aplicar filtros quando alterados
  useEffect(() => {
    fetchTransactions({ period: selectedPeriod, status: filterStatus });
  }, [selectedPeriod, filterStatus, fetchTransactions]);

  useEffect(() => {
    fetchExpenses({ period: selectedExpensePeriod, status: filterExpenseStatus });
  }, [selectedExpensePeriod, filterExpenseStatus, fetchExpenses]);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('expense_categories')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name');
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleRefresh = () => {
    fetchTransactions({ period: selectedPeriod, status: filterStatus });
    fetchExpenses({ period: selectedExpensePeriod, status: filterExpenseStatus });
  };

  const handleTransactionCreated = () => {
    fetchTransactions({ period: selectedPeriod, status: filterStatus });
  };

  const handleExpenseCreated = () => {
    fetchExpenses({ period: selectedExpensePeriod, status: filterExpenseStatus });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Atrasado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getPaymentMethodLabel = (method?: string | null) => {
    if (!method) return '-';
    switch (method) {
      case 'pix': return 'PIX';
      case 'card': return 'Cartão';
      case 'transfer': return 'Transferência';
      case 'cash': return 'Dinheiro';
      case 'other': return 'Outro';
      default: return method;
    }
  };

  const overdueTransactions = transactions.filter(t => t.status === 'overdue');
  const overduePercentage = transactions.length > 0 
    ? ((overdueTransactions.length / transactions.length) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão Financeira</h1>
          <p className="text-muted-foreground">
            Sistema financeiro completo com plano de contas, receitas e despesas
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/financeiro/plano-contas')}
            className="flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Plano de Contas
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={loading || loadingExpenses}>
            <RefreshCw className={`w-4 h-4 mr-2 ${(loading || loadingExpenses) ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <CreateTransactionDialog onTransactionCreated={handleTransactionCreated} />
          <CreateExpenseDialog onExpenseCreated={handleExpenseCreated} />
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita do Mês
            </CardTitle>
            <DollarSign className="w-5 h-5 text-success" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-success">
                R$ {summary.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-success">
                +{summary.overallPercentage.toFixed(1)}% vs mês anterior
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Pendente
            </CardTitle>
            <Calendar className="w-5 h-5 text-warning" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-warning">
                R$ {summary.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {summary.pendingTransactions} pendências
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Inadimplência
            </CardTitle>
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {overduePercentage}%
              </div>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="destructive" className="text-xs">
                {summary.overdueTransactions} clientes
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recibos Emitidos
            </CardTitle>
            <Receipt className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-primary">{summary.receiptsIssued}</div>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-muted-foreground">Este mês</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* Dashboard Financeiro */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Filtro de Data para Gráficos */}
          <DateRangeFilter 
            onRangeChange={(range) => {
              if (range.from && range.to) {
                setChartDateRange(range);
              }
            }}
            defaultRange={chartDateRange}
            title="Filtro de Período para Gráficos"
          />

          {/* Resumo de Despesas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="metric-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Despesas do Mês
                </CardTitle>
                <TrendingDown className="w-5 h-5 text-destructive" />
              </CardHeader>
              <CardContent>
                {loadingExpenses ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold text-destructive">
                    R$ {expenseSummary.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    Total em despesas
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Despesas Recorrentes
                </CardTitle>
                <Repeat className="w-5 h-5 text-warning" />
              </CardHeader>
              <CardContent>
                {loadingExpenses ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold text-warning">
                    R$ {expenseSummary.recurringExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    Mensais programadas
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Despesas Pendentes
                </CardTitle>
                <CreditCard className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent>
                {loadingExpenses ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold text-primary">
                    R$ {expenseSummary.pendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    A pagar
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Resultado Líquido
                </CardTitle>
                <BarChart3 className="w-5 h-5 text-foreground" />
              </CardHeader>
              <CardContent>
                {loading || loadingExpenses ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className={`text-2xl font-bold ${
                    (summary.monthlyRevenue - expenseSummary.monthlyExpenses) >= 0 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    R$ {(summary.monthlyRevenue - expenseSummary.monthlyExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    Receitas - Despesas
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos Financeiros */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução de Receitas e Despesas */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução Financeira</CardTitle>
                <CardDescription>Receitas vs Despesas ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCharts ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
                    </div>
                  </div>
                ) : (
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "Receitas",
                        color: "hsl(var(--success))",
                      },
                      expenses: {
                        label: "Despesas", 
                        color: "hsl(var(--destructive))",
                      },
                      profit: {
                        label: "Lucro",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-80"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.revenueEvolution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `R$ ${value.toLocaleString()}`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stackId="1"
                          stroke="hsl(var(--success))" 
                          fill="hsl(var(--success))" 
                          fillOpacity={0.6}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="expenses" 
                          stackId="2"
                          stroke="hsl(var(--destructive))" 
                          fill="hsl(var(--destructive))" 
                          fillOpacity={0.6}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Métodos de Pagamento */}
            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pagamento</CardTitle>
                <CardDescription>Distribuição dos pagamentos recebidos</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCharts ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
                    </div>
                  </div>
                ) : chartData.paymentMethods.length > 0 ? (
                  <ChartContainer
                    config={{
                      amount: {
                        label: "Valor",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-80"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.paymentMethods}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ method, percentage }) => `${method} (${percentage}%)`}
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="amount"
                        >
                          {chartData.paymentMethods.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(${200 + index * 50}, 70%, 50%)`} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium">{data.method}</p>
                                  <p className="text-sm text-muted-foreground">
                                    R$ {data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({data.percentage}%)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado de pagamento encontrado</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fluxo de Caixa Detalhado */}
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa Detalhado</CardTitle>
              <CardDescription>Entradas, saídas e saldo acumulado</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCharts ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
                  </div>
                </div>
              ) : (
                <ChartContainer
                  config={{
                    inflow: {
                      label: "Entradas",
                      color: "hsl(var(--success))",
                    },
                    outflow: {
                      label: "Saídas",
                      color: "hsl(var(--destructive))",
                    },
                    balance: {
                      label: "Saldo",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-80"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.cashFlow}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => `R$ ${value.toLocaleString()}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="inflow" fill="hsl(var(--success))" name="Entradas" />
                      <Bar dataKey="outflow" fill="hsl(var(--destructive))" name="Saídas" />
                      <Line 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2} 
                        name="Saldo"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Despesas por Categoria (Gráfico) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
                <CardDescription>Distribuição percentual das despesas</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCharts ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
                    </div>
                  </div>
                ) : chartData.expensesByCategory.length > 0 ? (
                  <ChartContainer
                    config={{
                      amount: {
                        label: "Valor",
                        color: "hsl(var(--destructive))",
                      },
                    }}
                    className="h-80"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.expensesByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ category, percentage }) => `${category} (${percentage}%)`}
                          outerRadius={80}
                          fill="hsl(var(--destructive))"
                          dataKey="amount"
                        >
                          {chartData.expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium">{data.category}</p>
                                  <p className="text-sm text-muted-foreground">
                                    R$ {data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({data.percentage}%)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma despesa encontrada</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo Visual */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
                <CardDescription>Indicadores principais do período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-success" />
                      <span className="text-sm font-medium">Receitas</span>
                    </div>
                    <span className="text-lg font-bold text-success">
                      R$ {summary.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="w-4 h-4 text-destructive" />
                      <span className="text-sm font-medium">Despesas</span>
                    </div>
                    <span className="text-lg font-bold text-destructive">
                      R$ {expenseSummary.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    (summary.monthlyRevenue - expenseSummary.monthlyExpenses) >= 0 
                      ? 'bg-primary/10' 
                      : 'bg-warning/10'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <BarChart3 className={`w-4 h-4 ${
                        (summary.monthlyRevenue - expenseSummary.monthlyExpenses) >= 0 
                          ? 'text-primary' 
                          : 'text-warning'
                      }`} />
                      <span className="text-sm font-medium">
                        Resultado Líquido
                      </span>
                    </div>
                    <span className={`text-lg font-bold ${
                      (summary.monthlyRevenue - expenseSummary.monthlyExpenses) >= 0 
                        ? 'text-primary' 
                        : 'text-warning'
                    }`}>
                      R$ {(summary.monthlyRevenue - expenseSummary.monthlyExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Pendentes</span>
                    </div>
                    <span className="text-lg font-bold text-warning">
                      R$ {summary.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Receitas (antiga aba Transações) */}
        <TabsContent value="receitas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transações</CardTitle>
              <CardDescription>
                Controle de pagamentos e emissão de recibos
              </CardDescription>
              
              {/* Filtros */}
              <SimpleDateFilter
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                filterStatus={filterStatus}
                onStatusChange={setFilterStatus}
                title="Filtros de Receitas"
              />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhuma transação encontrada para os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {transaction.patient_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {transaction.description}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            R$ {Number(transaction.amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(transaction.status)}>
                              {getStatusLabel(transaction.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getPaymentMethodLabel(transaction.payment_method)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Detalhes da Transação</DialogTitle>
                                    <DialogDescription>
                                      {transaction.receipt_id || 'Sem recibo gerado'}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Paciente</Label>
                                        <p className="text-sm font-medium">{transaction.patient_name}</p>
                                      </div>
                                      <div>
                                        <Label>Valor</Label>
                                        <p className="text-sm font-medium">R$ {Number(transaction.amount).toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <Label>Data</Label>
                                        <p className="text-sm">{new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}</p>
                                      </div>
                                      <div>
                                        <Label>Status</Label>
                                        <Badge variant={getStatusBadgeVariant(transaction.status)}>
                                          {getStatusLabel(transaction.status)}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Descrição</Label>
                                      <p className="text-sm">{transaction.description}</p>
                                    </div>
                                    {transaction.notes && (
                                      <div>
                                        <Label>Observações</Label>
                                        <p className="text-sm">{transaction.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              {canEditTransactions && (
                                <EditTransactionDialog
                                  transaction={transaction}
                                  onTransactionUpdated={handleTransactionCreated}
                                />
                              )}
                              
                              <UpdateTransactionStatusDialog
                                transaction={transaction}
                                onStatusUpdated={updateTransactionStatus}
                              />
                              
                              {canDeleteTransactions && (
                                <DeleteTransactionDialog
                                  transaction={transaction}
                                  onTransactionDeleted={handleTransactionCreated}
                                />
                              )}
                              
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => generateReceipt(transaction.id)}
                                disabled={!transaction.receipt_id && transaction.status !== 'paid'}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Despesas */}
        <TabsContent value="despesas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Controle de Despesas</CardTitle>
              <CardDescription>
                Gestão de gastos e custos operacionais
              </CardDescription>
              
              {/* Filtros para Despesas */}
              <SimpleDateFilter
                selectedPeriod={selectedExpensePeriod}
                onPeriodChange={setSelectedExpensePeriod}
                filterStatus={filterExpenseStatus}
                onStatusChange={setFilterExpenseStatus}
                statusOptions={[
                  { value: 'todos', label: 'Todos' },
                  { value: 'pago', label: 'Pago' },
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'cancelado', label: 'Cancelado' }
                ]}
                title="Filtros de Despesas"
              />
            </CardHeader>
            <CardContent>
              {loadingExpenses ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhuma despesa encontrada para os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: expense.category.color }}
                              />
                              <span className="font-medium">{expense.category.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.description}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {expense.supplier_name || '-'}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-destructive">
                            R$ {Number(expense.amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {new Date(expense.expense_date).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              expense.status === 'pago' ? 'default' :
                              expense.status === 'pendente' ? 'secondary' : 'outline'
                            }>
                              {expense.status === 'pago' ? 'Pago' :
                               expense.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                            </Badge>
                            {expense.is_recurring && (
                              <Badge variant="outline" className="ml-1">
                                <Repeat className="w-3 h-3 mr-1" />
                                Recorrente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getPaymentMethodLabel(expense.payment_method)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Detalhes da Despesa</DialogTitle>
                                    <DialogDescription>
                                      {expense.reference_document || 'Sem documento de referência'}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Categoria</Label>
                                        <div className="flex items-center space-x-2">
                                          <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: expense.category.color }}
                                          />
                                          <p className="text-sm font-medium">{expense.category.name}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <Label>Valor</Label>
                                        <p className="text-sm font-medium text-destructive">R$ {Number(expense.amount).toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <Label>Data</Label>
                                        <p className="text-sm">{new Date(expense.expense_date).toLocaleDateString('pt-BR')}</p>
                                      </div>
                                      <div>
                                        <Label>Status</Label>
                                        <Badge variant={
                                          expense.status === 'pago' ? 'default' :
                                          expense.status === 'pendente' ? 'secondary' : 'outline'
                                        }>
                                          {expense.status === 'pago' ? 'Pago' :
                                           expense.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                                        </Badge>
                                      </div>
                                      {expense.supplier_name && (
                                        <div>
                                          <Label>Fornecedor</Label>
                                          <p className="text-sm">{expense.supplier_name}</p>
                                        </div>
                                      )}
                                      {expense.payment_method && (
                                        <div>
                                          <Label>Método de Pagamento</Label>
                                          <p className="text-sm">{getPaymentMethodLabel(expense.payment_method)}</p>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <Label>Descrição</Label>
                                      <p className="text-sm">{expense.description}</p>
                                    </div>
                                    {expense.notes && (
                                      <div>
                                        <Label>Observações</Label>
                                        <p className="text-sm">{expense.notes}</p>
                                      </div>
                                    )}
                                    {expense.is_recurring && (
                                      <div>
                                        <Label>Recorrência</Label>
                                        <p className="text-sm">
                                          {expense.recurrence_type === 'mensal' ? 'Mensal' :
                                           expense.recurrence_type === 'trimestral' ? 'Trimestral' :
                                           expense.recurrence_type === 'semestral' ? 'Semestral' :
                                           expense.recurrence_type === 'anual' ? 'Anual' : 'Não especificado'}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inadimplência */}
        <TabsContent value="inadimplencia" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span>Controle de Inadimplência</span>
              </CardTitle>
              <CardDescription>
                Pacientes com pagamentos em atraso
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {overdueTransactions.map((defaulter) => (
                    <div key={defaulter.id} className="flex items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium text-foreground">{defaulter.patient_name}</h4>
                        <p className="text-sm text-muted-foreground">{defaulter.description}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>Data: {new Date(defaulter.transaction_date).toLocaleDateString('pt-BR')}</span>
                          {defaulter.due_date && (
                            <>
                              <span>•</span>
                              <span className="text-destructive">
                                Vencimento: {new Date(defaulter.due_date).toLocaleDateString('pt-BR')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-lg font-bold text-destructive">R$ {Number(defaulter.amount).toFixed(2)}</p>
                        <div className="flex space-x-2">
                          <UpdateTransactionStatusDialog
                            transaction={defaulter}
                            onStatusUpdated={updateTransactionStatus}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {overdueTransactions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma inadimplência encontrada</p>
                      <p className="text-sm">Todos os pagamentos estão em dia!</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatórios */}
        <TabsContent value="relatorios" className="space-y-6">
          <FinancialReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};