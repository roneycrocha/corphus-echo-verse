import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { DailyVideoCall } from '@/components/communication/DailyVideoCall';

export default function DailyVideoCallPage() {
  const { callId } = useParams<{ callId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const { roomUrl, patientName, userType } = location.state || {};

  const handleCallEnd = () => {
    navigate('/agenda');
  };

  if (!roomUrl || !patientName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Erro na Videochamada</h1>
          <p className="text-muted-foreground mb-4">
            Dados da chamada não encontrados.
          </p>
          <button 
            onClick={() => navigate('/agenda')}
            className="text-primary hover:underline"
          >
            Voltar à Agenda
          </button>
        </div>
      </div>
    );
  }

  return (
    <DailyVideoCall
      roomUrl={roomUrl}
      onCallEnd={handleCallEnd}
      patientName={patientName}
      userType={userType || 'doctor'}
    />
  );
}