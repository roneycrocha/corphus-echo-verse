import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useAccountId = () => {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountId = async () => {
      if (!user) {
        setAccountId(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("account_id")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching account_id:", error);
          setAccountId(null);
        } else {
          setAccountId(data?.account_id || null);
        }
      } catch (error) {
        console.error("Unexpected error fetching account_id:", error);
        setAccountId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountId();
  }, [user]);

  return { accountId, loading };
};