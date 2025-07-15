import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WhatsAppButtonProps {
  phoneNumber: string;
  patientName: string;
  message?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phoneNumber,
  patientName,
  message,
  variant = 'outline',
  size = 'sm'
}) => {
  const sendWhatsAppMessage = () => {
    // Limpar o número de telefone (remover caracteres especiais)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Verificar se o número tem DDD (se não tiver, assumir que é do Brasil)
    let formattedPhone = cleanPhone;
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      formattedPhone = `55${cleanPhone.slice(1)}`; // Remove o 0 e adiciona código do Brasil
    } else if (cleanPhone.length === 11) {
      formattedPhone = `55${cleanPhone}`; // Adiciona código do Brasil
    } else if (cleanPhone.length === 10) {
      formattedPhone = `55${cleanPhone}`; // Adiciona código do Brasil
    }

    // Mensagem padrão se não fornecida
    const defaultMessage = `Olá ${patientName}, aqui é da clínica. Como você está?`;
    const messageText = message || defaultMessage;

    // Criar URL do WhatsApp
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;

    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');
    
    toast.success('WhatsApp aberto');
  };

  // Verificar se o número está válido
  const isValidPhone = phoneNumber && phoneNumber.replace(/\D/g, '').length >= 10;

  if (!isValidPhone) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        title="Número de telefone inválido"
      >
        <MessageCircle className="w-4 h-4 mr-1" />
        WhatsApp
      </Button>
    );
  }

  return (
    <Button
      onClick={sendWhatsAppMessage}
      variant={variant}
      size={size}
      className="text-green-600 border-green-600 hover:bg-green-50"
      title={`Enviar mensagem para ${patientName}`}
    >
      <MessageCircle className="w-4 h-4 mr-1" />
      WhatsApp
    </Button>
  );
};