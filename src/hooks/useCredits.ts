import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAccountId } from "./useAccountId";
import { toast } from "./use-toast";

export interface CreditInfo {
  balance: number;
  total_purchased: number;
  total_consumed: number;
  plan_type: "bronze" | "silver" | "gold";
  credit_multiplier: number;
}

export interface CreditTransaction {
  id: string;
  transaction_type: "purchase" | "consumption" | "admin_adjustment" | "plan_bonus";
  amount: number;
  balance_after: number;
  description: string;
  related_action?: string;
  created_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus_credits: number;
  total_bonus?: number; // Bônus calculado com multiplicador do plano
  total_credits?: number; // Total de créditos (base + bônus)
  is_featured?: boolean; // Se é destaque no plano
  plan_bonus_multiplier?: number; // Multiplicador de bônus do plano
}

export const useCredits = () => {
  const { user } = useAuth();
  const { accountId, loading: accountLoading } = useAccountId();
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const fetchCreditInfo = useCallback(async () => {
    if (!accountId) return;

    try {
      const { data, error } = await supabase.rpc("get_account_credit_info", {
        p_account_id: accountId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setCreditInfo({
          balance: data[0].balance || 0,
          total_purchased: data[0].total_purchased || 0,
          total_consumed: data[0].total_consumed || 0,
          plan_type: data[0].plan_type || "bronze",
          credit_multiplier: parseFloat(data[0].credit_multiplier?.toString() || "1.0")
        });
      } else {
        setCreditInfo({
          balance: 0,
          total_purchased: 0,
          total_consumed: 0,
          plan_type: "bronze",
          credit_multiplier: 1.0
        });
      }
    } catch (error) {
      console.error("Error fetching credit info:", error);
      setCreditInfo(null);
    }
  }, [accountId]);

  const fetchTransactions = useCallback(async () => {
    if (!accountId) return;

    try {
      const { data, error } = await supabase
        .from("account_credit_transactions")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
    }
  }, [accountId]);

  const fetchPackages = useCallback(async () => {
    if (!user || !creditInfo) return;

    try {
      // Buscar pacotes associados ao plano do usuário
      const { data, error } = await supabase
        .from("plan_packages")
        .select(`
          id,
          bonus_multiplier,
          is_featured,
          package:credit_packages(
            id,
            name,
            credits,
            price,
            bonus_credits
          )
        `)
        .eq("plan_type", creditInfo.plan_type);

      if (error) throw error;

      // Transformar os dados para incluir bônus calculado
      const packagesWithBonus: CreditPackage[] = (data || []).map((planPackage: any) => {
        const pkg = planPackage.package;
        const totalBonus = Math.round(pkg.bonus_credits * planPackage.bonus_multiplier);
        const totalCredits = pkg.credits + totalBonus;
        
        return {
          id: pkg.id,
          name: pkg.name,
          credits: pkg.credits,
          price: pkg.price,
          bonus_credits: pkg.bonus_credits,
          total_bonus: totalBonus,
          total_credits: totalCredits,
          is_featured: planPackage.is_featured,
          plan_bonus_multiplier: planPackage.bonus_multiplier
        };
      });

      // Ordenar por preço
      packagesWithBonus.sort((a, b) => a.price - b.price);
      setPackages(packagesWithBonus);
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pacotes de crédito",
        variant: "destructive",
      });
    }
  }, [user, creditInfo]);

  const consumeCredits = useCallback(async (
    amount: number,
    description: string,
    action?: string
  ): Promise<boolean> => {
    if (!user || !accountId) return false;

    try {
      const { data, error } = await supabase.rpc("consume_account_credits", {
        p_account_id: accountId,
        p_user_id: user.id,
        p_amount: amount,
        p_description: description,
        p_action: action
      });

      if (error) throw error;

      if (data) {
        await fetchCreditInfo();
        await fetchTransactions();
        return true;
      } else {
        toast({
          title: "Créditos insuficientes",
          description: "A conta não possui créditos suficientes para esta ação. Adquira mais créditos para continuar.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error consuming credits:", error);
      toast({
        title: "Erro",
        description: "Não foi possível consumir créditos",
        variant: "destructive",
      });
      return false;
    }
  }, [user, accountId, fetchCreditInfo, fetchTransactions]);

  const purchaseCredits = useCallback(async (
    packageId: string,
    paymentMethodId?: string
  ): Promise<{ success: boolean; payment_url?: string }> => {
    if (!user) return { success: false };

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: {
          packageId,
          paymentMethodId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Compra iniciada",
          description: "Redirecionando para pagamento...",
        });

        if (data.payment_url) {
          window.open(data.payment_url, "_blank");
        }

        // Refresh data after a short delay
        setTimeout(() => {
          fetchCreditInfo();
          fetchTransactions();
        }, 2000);

        return { success: true, payment_url: data.payment_url };
      }

      return { success: false };
    } catch (error) {
      console.error("Error purchasing credits:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a compra de créditos",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setPurchasing(false);
    }
  }, [user, fetchCreditInfo, fetchTransactions]);

  const calculateCreditCost = useCallback((baseCost: number): number => {
    if (!creditInfo) return baseCost;
    return Math.ceil(baseCost * creditInfo.credit_multiplier);
  }, [creditInfo]);

  const verifyPayment = useCallback(async (sessionId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "User not authenticated" };

    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Pagamento confirmado!",
          description: data.already_processed 
            ? "Os créditos já foram adicionados à conta"
            : `${data.credits_added} créditos foram adicionados à conta`,
        });

        // Refresh data
        await Promise.all([
          fetchCreditInfo(),
          fetchTransactions()
        ]);

        return { success: true, message: "Payment verified successfully" };
      }

      return { success: false, message: data.message || "Payment verification failed" };
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast({
        title: "Erro na verificação",
        description: "Não foi possível verificar o pagamento",
        variant: "destructive",
      });
      return { success: false, message: "Verification error" };
    }
  }, [user, fetchCreditInfo, fetchTransactions]);

  useEffect(() => {
    if (accountId && !accountLoading) {
      const loadData = async () => {
        setLoading(true);
        await fetchCreditInfo();
        await fetchTransactions();
        setLoading(false);
      };
      loadData();
    } else if (!accountLoading) {
      setLoading(false);
    }
  }, [accountId, accountLoading, fetchCreditInfo, fetchTransactions]);

  // Carregar pacotes quando creditInfo estiver disponível
  useEffect(() => {
    if (creditInfo) {
      fetchPackages();
    }
  }, [creditInfo, fetchPackages]);

  return {
    creditInfo,
    transactions,
    packages,
    loading: loading || accountLoading,
    purchasing,
    consumeCredits,
    purchaseCredits,
    calculateCreditCost,
    verifyPayment,
    refreshData: async () => {
      await Promise.all([
        fetchCreditInfo(),
        fetchTransactions()
      ]);
    }
  };
};