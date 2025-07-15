import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface PDFReportsProps {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

interface UserProfile {
  full_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  logo_url?: string;
  website?: string;
}

export const PDFReports: React.FC<PDFReportsProps> = ({ dateRange }) => {
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, email, phone, job_title, logo_url, website')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setUserProfile(data);
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const addHeader = async (doc: jsPDF, title: string) => {
    // Background header - altura reduzida para 1cm (28 pontos)
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, doc.internal.pageSize.width, 28, 'F');
    
    // Company logo area (left side) - menor
    try {
      if (userProfile?.logo_url) {
        const logoBase64 = await loadImageAsBase64(userProfile.logo_url);
        doc.addImage(logoBase64, 'JPEG', 5, 4, 20, 20);
      } else {
        // Fallback placeholder menor
        doc.setFillColor(79, 70, 229);
        doc.rect(5, 4, 20, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('LOGO', 15, 16, { align: 'center' });
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
      // Fallback placeholder
      doc.setFillColor(79, 70, 229);
      doc.rect(5, 4, 20, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('LOGO', 15, 16, { align: 'center' });
    }
    
    // Company info (left center) - mais compacto
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.text(userProfile?.full_name || 'Sistema Financeiro', 30, 10);
    
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    let infoY = 16;
    if (userProfile?.email) {
      doc.text(userProfile.email, 30, infoY);
      infoY += 6;
    }
    if (userProfile?.phone && infoY <= 22) {
      doc.text(userProfile.phone, 30, infoY);
    }
    
    // Report title (right side) - compacto
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.text(title, doc.internal.pageSize.width - 5, 8, { align: 'right' });
    
    // Date info - uma linha só
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    let dateText = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
    if (dateRange.from && dateRange.to) {
      dateText += ` | Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    }
    doc.text(dateText, doc.internal.pageSize.width - 5, 18, { align: 'right' });
    
    // Separator line fina
    doc.setDrawColor(200, 200, 200);
    doc.line(5, 30, doc.internal.pageSize.width - 5, 30);
    
    return 35; // Return next Y position - espaço mínimo após header
  };

  const addFooter = (doc: jsPDF) => {
    const pageHeight = doc.internal.pageSize.height;
    
    // Footer background - altura reduzida para 0.6cm (17 pontos)
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 17, doc.internal.pageSize.width, 17, 'F');
    
    // Separator line fina
    doc.setDrawColor(200, 200, 200);
    doc.line(5, pageHeight - 17, doc.internal.pageSize.width - 5, pageHeight - 17);
    
    // Corphus logo placeholder (left) - muito menor
    doc.setFillColor(79, 70, 229);
    doc.rect(5, pageHeight - 15, 12, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.text('CORPHUS', 11, pageHeight - 7, { align: 'center' });
    
    // Footer text (center) - fonte menor
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.text('Powered by Corphus - Sistema de Gestão Integrada', doc.internal.pageSize.width / 2, pageHeight - 8, { align: 'center' });
    
    // Page number (right) - fonte menor
    const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.text(`Pág. ${pageNumber}`, doc.internal.pageSize.width - 5, pageHeight - 8, { align: 'right' });
  };

  const generateAccountPlanReport = async () => {
    const doc = new jsPDF();
    let yPos = await addHeader(doc, 'Relatório do Plano de Contas');

    try {
      const { data: accounts, error } = await supabase
        .from('account_plan')
        .select('*')
        .order('code');

      if (error) throw error;

      // Summary
      const totalAccounts = accounts?.length || 0;
      const activeAccounts = accounts?.filter(acc => acc.is_active).length || 0;
      const accountsByType = accounts?.reduce((acc, account) => {
        acc[account.account_type] = (acc[account.account_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Resumo Geral', 20, yPos);
      yPos += 15;

      doc.setFontSize(10);
      doc.text(`Total de Contas: ${totalAccounts}`, 25, yPos);
      yPos += 7;
      doc.text(`Contas Ativas: ${activeAccounts}`, 25, yPos);
      yPos += 7;
      doc.text(`Contas Inativas: ${totalAccounts - activeAccounts}`, 25, yPos);
      yPos += 15;

      // Accounts by type
      doc.setFontSize(12);
      doc.text('Distribuição por Tipo:', 25, yPos);
      yPos += 10;
      
      Object.entries(accountsByType).forEach(([type, count]) => {
        const typeLabel = type === 'receita' ? 'Receita' : 
                         type === 'despesa' ? 'Despesa' : 
                         type === 'ativo' ? 'Ativo' : 
                         type === 'passivo' ? 'Passivo' : 
                         type === 'patrimonio' ? 'Patrimônio' : type;
        doc.text(`${typeLabel}: ${count}`, 30, yPos);
        yPos += 7;
      });

      yPos += 10;

      // Accounts table
      const tableData = accounts?.map(account => [
        account.code,
        account.name,
        account.account_type === 'receita' ? 'Receita' : 
        account.account_type === 'despesa' ? 'Despesa' : 
        account.account_type === 'ativo' ? 'Ativo' : 
        account.account_type === 'passivo' ? 'Passivo' : 
        account.account_type === 'patrimonio' ? 'Patrimônio' : account.account_type,
        account.level.toString(),
        account.is_active ? 'Ativo' : 'Inativo'
      ]) || [];

      autoTable(doc, {
        startY: yPos,
        head: [['Código', 'Nome', 'Tipo', 'Nível', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: 20, right: 20 },
      });

      addFooter(doc);
      doc.save(`plano-de-contas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Relatório do Plano de Contas gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório do Plano de Contas');
    }
  };

  const generateRevenueReport = async () => {
    const doc = new jsPDF();
    let yPos = await addHeader(doc, 'Relatório de Receitas');

    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          patients!inner(name)
        `)
        .order('transaction_date', { ascending: false });

      if (dateRange.from && dateRange.to) {
        query = query
          .gte('transaction_date', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('transaction_date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Summary calculations
      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const paidRevenue = transactions?.filter(t => t.status === 'paid').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const pendingRevenue = transactions?.filter(t => t.status === 'pending').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const overdueRevenue = transactions?.filter(t => t.status === 'overdue').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Resumo Financeiro', 20, yPos);
      yPos += 15;

      doc.setFontSize(10);
      doc.text(`Receita Total: ${formatCurrency(totalRevenue)}`, 25, yPos);
      yPos += 7;
      doc.text(`Receita Recebida: ${formatCurrency(paidRevenue)}`, 25, yPos);
      yPos += 7;
      doc.text(`Receita Pendente: ${formatCurrency(pendingRevenue)}`, 25, yPos);
      yPos += 7;
      doc.text(`Receita em Atraso: ${formatCurrency(overdueRevenue)}`, 25, yPos);
      yPos += 15;

      // Transactions table
      const tableData = transactions?.map(transaction => [
        format(new Date(transaction.transaction_date), 'dd/MM/yyyy'),
        transaction.patients?.name || 'N/A',
        transaction.description,
        formatCurrency(Number(transaction.amount)),
        transaction.status === 'paid' ? 'Pago' : 
        transaction.status === 'pending' ? 'Pendente' : 
        transaction.status === 'overdue' ? 'Atrasado' : 
        transaction.status === 'cancelled' ? 'Cancelado' : transaction.status,
        transaction.payment_method || '-'
      ]) || [];

      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Paciente', 'Descrição', 'Valor', 'Status', 'Método Pagamento']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        margin: { left: 20, right: 20 },
        columnStyles: {
          3: { halign: 'right' }
        }
      });

      addFooter(doc);
      doc.save(`relatorio-receitas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Relatório de Receitas gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório de Receitas');
    }
  };

  const generateExpenseReport = async () => {
    const doc = new jsPDF();
    let yPos = await addHeader(doc, 'Relatório de Despesas');

    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          expense_categories(name, color)
        `)
        .order('expense_date', { ascending: false });

      if (dateRange.from && dateRange.to) {
        query = query
          .gte('expense_date', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('expense_date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data: expenses, error } = await query;

      if (error) throw error;

      // Summary calculations
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const paidExpenses = expenses?.filter(e => e.status === 'pago').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const pendingExpenses = expenses?.filter(e => e.status === 'pendente').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const recurringExpenses = expenses?.filter(e => e.is_recurring).reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Expenses by category
      const expensesByCategory = expenses?.reduce((acc, expense) => {
        const categoryName = expense.expense_categories?.name || 'Sem Categoria';
        acc[categoryName] = (acc[categoryName] || 0) + Number(expense.amount);
        return acc;
      }, {} as Record<string, number>) || {};

      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Resumo de Despesas', 20, yPos);
      yPos += 15;

      doc.setFontSize(10);
      doc.text(`Total de Despesas: ${formatCurrency(totalExpenses)}`, 25, yPos);
      yPos += 7;
      doc.text(`Despesas Pagas: ${formatCurrency(paidExpenses)}`, 25, yPos);
      yPos += 7;
      doc.text(`Despesas Pendentes: ${formatCurrency(pendingExpenses)}`, 25, yPos);
      yPos += 7;
      doc.text(`Despesas Recorrentes: ${formatCurrency(recurringExpenses)}`, 25, yPos);
      yPos += 15;

      // Category breakdown
      doc.setFontSize(12);
      doc.text('Despesas por Categoria:', 25, yPos);
      yPos += 10;
      
      Object.entries(expensesByCategory).forEach(([category, amount]) => {
        doc.text(`${category}: ${formatCurrency(amount)}`, 30, yPos);
        yPos += 7;
      });

      yPos += 10;

      // Expenses table
      const tableData = expenses?.map(expense => [
        format(new Date(expense.expense_date), 'dd/MM/yyyy'),
        expense.expense_categories?.name || 'Sem Categoria',
        expense.description,
        formatCurrency(Number(expense.amount)),
        expense.status === 'pago' ? 'Pago' : 'Pendente',
        expense.supplier_name || '-',
        expense.is_recurring ? 'Sim' : 'Não'
      ]) || [];

      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Categoria', 'Descrição', 'Valor', 'Status', 'Fornecedor', 'Recorrente']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        margin: { left: 20, right: 20 },
        columnStyles: {
          3: { halign: 'right' }
        }
      });

      addFooter(doc);
      doc.save(`relatorio-despesas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Relatório de Despesas gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório de Despesas');
    }
  };

  const generateCashFlowReport = async () => {
    const doc = new jsPDF();
    let yPos = await addHeader(doc, 'Relatório de Fluxo de Caixa Anual');

    try {
      const currentYear = new Date().getFullYear();
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      
      const monthlyData = await Promise.all(
        months.map(async (month) => {
          const startDate = new Date(currentYear, month - 1, 1);
          const endDate = new Date(currentYear, month, 0);
          
          const [revenueResult, expenseResult] = await Promise.all([
            supabase
              .from('transactions')
              .select('amount')
              .eq('status', 'paid')
              .gte('transaction_date', format(startDate, 'yyyy-MM-dd'))
              .lte('transaction_date', format(endDate, 'yyyy-MM-dd')),
            supabase
              .from('expenses')
              .select('amount')
              .eq('status', 'pago')
              .gte('expense_date', format(startDate, 'yyyy-MM-dd'))
              .lte('expense_date', format(endDate, 'yyyy-MM-dd'))
          ]);

          const revenue = revenueResult.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          const expenses = expenseResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
          
          return {
            month: format(startDate, 'MMMM', { locale: ptBR }),
            revenue,
            expenses,
            balance: revenue - expenses
          };
        })
      );

      // Summary
      const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
      const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
      const totalBalance = totalRevenue - totalExpenses;

      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(`Fluxo de Caixa - Ano ${currentYear}`, 20, yPos);
      yPos += 15;

      doc.setFontSize(10);
      doc.text(`Receita Total do Ano: ${formatCurrency(totalRevenue)}`, 25, yPos);
      yPos += 7;
      doc.text(`Despesas Total do Ano: ${formatCurrency(totalExpenses)}`, 25, yPos);
      yPos += 7;
      doc.text(`Resultado Líquido: ${formatCurrency(totalBalance)}`, 25, yPos);
      yPos += 15;

      // Monthly table
      const tableData = monthlyData.map(month => [
        month.month,
        formatCurrency(month.revenue),
        formatCurrency(month.expenses),
        formatCurrency(month.balance)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Mês', 'Receitas', 'Despesas', 'Saldo']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: 20, right: 20 },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' }
        }
      });

      addFooter(doc);
      doc.save(`fluxo-de-caixa-${currentYear}.pdf`);
      toast.success('Relatório de Fluxo de Caixa gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório de Fluxo de Caixa');
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast.error('Selecione um tipo de relatório');
      return;
    }

    setLoading(true);
    try {
      switch (selectedReport) {
        case 'plano-contas':
          await generateAccountPlanReport();
          break;
        case 'receitas':
          await generateRevenueReport();
          break;
        case 'despesas':
          await generateExpenseReport();
          break;
        case 'fluxo-caixa':
          await generateCashFlowReport();
          break;
        default:
          toast.error('Tipo de relatório não implementado');
      }
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    {
      value: 'plano-contas',
      label: 'Plano de Contas',
      description: 'Estrutura completa das contas contábeis',
      icon: FileText
    },
    {
      value: 'receitas',
      label: 'Relatório de Receitas',
      description: 'Detalhamento das receitas do período',
      icon: TrendingUp
    },
    {
      value: 'despesas',
      label: 'Relatório de Despesas',
      description: 'Análise completa das despesas',
      icon: TrendingDown
    },
    {
      value: 'fluxo-caixa',
      label: 'Fluxo de Caixa Anual',
      description: 'Fluxo mensal de receitas e despesas',
      icon: DollarSign
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Relatórios em PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Tipo de Relatório</label>
          <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de relatório" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedReport && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              {reportTypes.find(type => type.value === selectedReport)?.description}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  {dateRange.from && dateRange.to ? (
                    `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                  ) : (
                    'Todo o período'
                  )}
                </span>
              </div>
              <Badge variant="outline">PDF</Badge>
            </div>

            <Button 
              onClick={handleGenerateReport} 
              disabled={loading}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Gerando Relatório...' : 'Gerar Relatório PDF'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};