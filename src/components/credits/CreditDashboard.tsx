import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, CreditCard, TrendingUp, History, RefreshCw, Info, Package } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { PurchaseCreditsModal } from "./PurchaseCreditsModal";
import { ResourceCostInfo } from "./ResourceCostInfo";
import { useState } from "react";

export const CreditDashboard = () => {
  const { creditInfo, transactions, loading, refreshData } = useCredits();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Dashboard de Créditos</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center space-x-2">
            <Info className="w-4 h-4" />
            <span>Custos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{creditInfo?.balance || 0}</div>
                <p className="text-xs text-muted-foreground">
                  créditos disponíveis
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Consumido</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{creditInfo?.total_consumed || 0}</div>
                <p className="text-xs text-muted-foreground">
                  créditos utilizados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
                <Badge variant="secondary">
                  {creditInfo?.plan_type?.toUpperCase() || "BRONZE"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  Desconto: {Math.round((1 - (creditInfo?.credit_multiplier || 1)) * 100)}%
                </div>
                <Button 
                  className="mt-2 w-full"
                  onClick={() => setShowPurchaseModal(true)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Comprar Créditos
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Resumo da Conta
              </CardTitle>
              <CardDescription>
                Informações gerais sobre seus créditos
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Comprado:</span>
                  <span className="font-medium">{creditInfo?.total_purchased || 0} créditos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Utilizado:</span>
                  <span className="font-medium">{creditInfo?.total_consumed || 0} créditos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Saldo Atual:</span>
                  <span className="font-bold text-primary">{creditInfo?.balance || 0} créditos</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Plano:</span>
                  <Badge variant="outline">{creditInfo?.plan_type?.toUpperCase() || "BRONZE"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Multiplicador:</span>
                  <span className="font-medium">{creditInfo?.credit_multiplier || 1}x</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Transações
              </CardTitle>
              <CardDescription>
                Últimas movimentações de créditos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions.length > 0 ? (
                  transactions.slice(0, 20).map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {transaction.related_action && (
                          <div className="text-xs text-blue-600 font-mono mt-1">
                            {transaction.related_action}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Saldo: {transaction.balance_after}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma transação encontrada
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <ResourceCostInfo />
        </TabsContent>
      </Tabs>

      <PurchaseCreditsModal 
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
      />
    </div>
  );
};