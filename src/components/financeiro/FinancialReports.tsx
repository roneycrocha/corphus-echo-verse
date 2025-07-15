import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Calendar, 
  FileText, 
  TrendingUp, 
  DollarSign,
  BarChart3,
  PieChart,
  TrendingDown,
  FileSpreadsheet
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { DateRangeFilter } from './DateRangeFilter';
import { PDFReports } from './PDFReports';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface ReportData {
  transactions: any[];
  expenses: any[];
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    transactionCount: number;
    expenseCount: number;
  };
}

export const FinancialReports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const fetchReportData = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    setLoading(true);
    try {
      const startDateStr = format(dateRange.from, 'yyyy-MM-dd');
      const endDateStr = format(dateRange.to, 'yyyy-MM-dd');

      // Buscar transações
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          patients(name)
        `)
        .gte('transaction_date', startDateStr)
        .lte('transaction_date', endDateStr)
        .order('transaction_date', { ascending: false });

      // Buscar despesas
      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories(name, color)
        `)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr)
        .order('expense_date', { ascending: false });

      // Calcular resumo
      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setReportData({
        transactions: transactions || [],
        expenses: expenses || [],
        summary: {
          totalRevenue,
          totalExpenses,
          netIncome: totalRevenue - totalExpenses,
          transactionCount: transactions?.length || 0,
          expenseCount: expenses?.length || 0,
        }
      });
    } catch (error) {
      console.error('Erro ao buscar dados do relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  const exportToExcel = (type: 'complete' | 'revenue' | 'expenses' | 'summary') => {
    if (!reportData || !dateRange.from || !dateRange.to) return;

    const wb = XLSX.utils.book_new();
    const fileName = `relatorio_financeiro_${format(dateRange.from, 'dd-MM-yyyy')}_${format(dateRange.to, 'dd-MM-yyyy')}.xlsx`;

    if (type === 'complete' || type === 'revenue') {
      // Planilha de Receitas
      const revenueData = reportData.transactions.map(t => ({
        'Data': format(new Date(t.transaction_date), 'dd/MM/yyyy'),
        'Paciente': t.patients?.name || 'N/A',
        'Descrição': t.description,
        'Valor': Number(t.amount),
        'Status': getStatusLabel(t.status),
        'Método Pagamento': getPaymentMethodLabel(t.payment_method),
        'Data Vencimento': t.due_date ? format(new Date(t.due_date), 'dd/MM/yyyy') : '',
        'Data Pagamento': t.payment_date ? format(new Date(t.payment_date), 'dd/MM/yyyy') : '',
        'Observações': t.notes || ''
      }));

      const ws_revenue = XLSX.utils.json_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(wb, ws_revenue, 'Receitas');
    }

    if (type === 'complete' || type === 'expenses') {
      // Planilha de Despesas
      const expenseData = reportData.expenses.map(e => ({
        'Data': format(new Date(e.expense_date), 'dd/MM/yyyy'),
        'Categoria': e.expense_categories?.name || 'N/A',
        'Descrição': e.description,
        'Valor': Number(e.amount),
        'Status': getStatusLabel(e.status),
        'Fornecedor': e.supplier_name || '',
        'Método Pagamento': getPaymentMethodLabel(e.payment_method),
        'Recorrente': e.is_recurring ? 'Sim' : 'Não',
        'Documento': e.reference_document || '',
        'Observações': e.notes || ''
      }));

      const ws_expenses = XLSX.utils.json_to_sheet(expenseData);
      XLSX.utils.book_append_sheet(wb, ws_expenses, 'Despesas');
    }

    if (type === 'complete' || type === 'summary') {
      // Planilha de Resumo
      const summaryData = [
        { 'Métrica': 'Total de Receitas', 'Valor': reportData.summary.totalRevenue },
        { 'Métrica': 'Total de Despesas', 'Valor': reportData.summary.totalExpenses },
        { 'Métrica': 'Resultado Líquido', 'Valor': reportData.summary.netIncome },
        { 'Métrica': 'Número de Transações', 'Valor': reportData.summary.transactionCount },
        { 'Métrica': 'Número de Despesas', 'Valor': reportData.summary.expenseCount },
        { 'Métrica': 'Período', 'Valor': `${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}` }
      ];

      const ws_summary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws_summary, 'Resumo');
    }

    XLSX.writeFile(wb, fileName);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': case 'pago': return 'Pago';
      case 'pending': case 'pendente': return 'Pendente';
      case 'overdue': case 'atrasado': return 'Atrasado';
      case 'cancelled': case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getPaymentMethodLabel = (method?: string | null) => {
    if (!method) return '';
    switch (method) {
      case 'pix': return 'PIX';
      case 'card': return 'Cartão';
      case 'transfer': return 'Transferência';
      case 'cash': return 'Dinheiro';
      case 'other': return 'Outro';
      default: return method;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="advanced-reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="advanced-reports">Relatórios Avançados</TabsTrigger>
          <TabsTrigger value="pdf-reports">Relatórios em PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="advanced-reports" className="space-y-6">
          {/* Filtro de Datas Avançado */}
          <DateRangeFilter 
            onRangeChange={handleDateRangeChange}
            defaultRange={dateRange}
            title="Filtro de Período para Relatórios"
          />

          {/* Resumo do Relatório */}
          {reportData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
                    <TrendingUp className="w-4 h-4 text-success" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">
                      R$ {reportData.summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <Badge variant="secondary" className="mt-1">
                      {reportData.summary.transactionCount} transações
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      R$ {reportData.summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <Badge variant="secondary" className="mt-1">
                      {reportData.summary.expenseCount} despesas
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Resultado Líquido</CardTitle>
                    <DollarSign className={`w-4 h-4 ${reportData.summary.netIncome >= 0 ? 'text-success' : 'text-destructive'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${reportData.summary.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                      R$ {reportData.summary.netIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <Badge variant={reportData.summary.netIncome >= 0 ? "default" : "destructive"} className="mt-1">
                      {reportData.summary.netIncome >= 0 ? 'Lucro' : 'Prejuízo'}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Período</CardTitle>
                    <Calendar className="w-4 h-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">
                      {dateRange.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      até {dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Opções de Export Excel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Exportar para Excel
                  </CardTitle>
                  <CardDescription>
                    Baixe os dados em formato Excel para análise detalhada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button
                      onClick={() => exportToExcel('complete')}
                      className="flex items-center gap-2"
                      variant="outline"
                    >
                      <Download className="w-4 h-4" />
                      Relatório Completo
                    </Button>

                    <Button
                      onClick={() => exportToExcel('revenue')}
                      className="flex items-center gap-2"
                      variant="outline"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Apenas Receitas
                    </Button>

                    <Button
                      onClick={() => exportToExcel('expenses')}
                      className="flex items-center gap-2"
                      variant="outline"
                    >
                      <TrendingDown className="w-4 h-4" />
                      Apenas Despesas
                    </Button>

                    <Button
                      onClick={() => exportToExcel('summary')}
                      className="flex items-center gap-2"
                      variant="outline"
                    >
                      <PieChart className="w-4 h-4" />
                      Resumo Executivo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {loading && (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Carregando dados do relatório...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pdf-reports" className="space-y-6">
          {/* Filtro de Datas para PDF */}
          <DateRangeFilter 
            onRangeChange={handleDateRangeChange}
            defaultRange={dateRange}
            title="Período para Relatórios PDF"
          />

          {/* Componente de Relatórios em PDF */}
          <PDFReports dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
};