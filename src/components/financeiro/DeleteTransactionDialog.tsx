import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Transaction } from '@/hooks/useFinancialData';

interface DeleteTransactionDialogProps {
  transaction: Transaction;
  onTransactionDeleted: () => void;
}

export const DeleteTransactionDialog: React.FC<DeleteTransactionDialogProps> = ({ 
  transaction,
  onTransactionDeleted 
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    
    try {
      // Primeiro verificar se existe recibo associado
      const { data: receipt } = await supabase
        .from('receipts')
        .select('id')
        .eq('transaction_id', transaction.id)
        .single();

      // Se houver recibo, deletar primeiro
      if (receipt) {
        const { error: receiptError } = await supabase
          .from('receipts')
          .delete()
          .eq('transaction_id', transaction.id);

        if (receiptError) throw receiptError;
      }

      // Deletar a transação
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);

      if (error) throw error;

      toast.success('Transação excluída com sucesso!');
      setOpen(false);
      onTransactionDeleted();
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      toast.error('Erro ao excluir transação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4 mr-1" />
          Excluir
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. A transação será permanentemente removida.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Transação:</strong> {transaction.description}<br/>
              <strong>Paciente:</strong> {transaction.patient_name}<br/>
              <strong>Valor:</strong> R$ {Number(transaction.amount).toFixed(2)}<br/>
              <strong>Status:</strong> {transaction.status}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Excluindo...' : 'Excluir Transação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};