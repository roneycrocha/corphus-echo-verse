import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DailyVideoCall } from '@/components/communication/DailyVideoCall';
import { Card } from '@/components/ui/card';

export default function DailyPatientPage() {
  const { encodedData } = useParams<{ encodedData: string }>();
  const navigate = useNavigate();
  const [callData, setCallData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!encodedData) {
      setError('Link inválido');
      return;
    }

    try {
      // Decodificar dados da URL
      const base64Data = encodedData
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Adicionar padding se necessário
      const padded = base64Data + '='.repeat((4 - base64Data.length % 4) % 4);
      
      const decodedString = atob(padded);
      const data = JSON.parse(decodedString);

      // Verificar se o link não expirou (2 horas)
      const now = Date.now();
      const linkAge = now - data.timestamp;
      const twoHours = 2 * 60 * 60 * 1000;

      if (linkAge > twoHours) {
        setError('Este link de videochamada expirou. Solicite um novo link ao seu terapeuta.');
        return;
      }

      if (!data.roomUrl || !data.patientName) {
        setError('Dados da chamada inválidos');
        return;
      }

      setCallData(data);

    } catch (error) {
      console.error('Erro ao decodificar link:', error);
      setError('Link inválido ou corrompido');
    }
  }, [encodedData]);

  const handleCallEnd = () => {
    navigate('/');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4 text-destructive">Erro</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Voltar ao Início
          </button>
        </Card>
      </div>
    );
  }

  if (!callData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando videochamada...</p>
        </div>
      </div>
    );
  }

  return (
    <DailyVideoCall
      roomUrl={callData.roomUrl}
      onCallEnd={handleCallEnd}
      patientName={callData.patientName}
      userType="patient"
    />
  );
}