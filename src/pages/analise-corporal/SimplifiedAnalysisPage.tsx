import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimplifiedAnalysis } from '@/components/analise-corporal/SimplifiedAnalysis';

export const SimplifiedAnalysisPage: React.FC = () => {
  const { patientId, patientName } = useParams<{ patientId: string; patientName: string }>();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/prontuario');
  };

  if (!patientId || !patientName) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Parâmetros inválidos</h2>
          <p className="text-muted-foreground">ID do paciente ou nome não fornecido.</p>
        </div>
      </div>
    );
  }

  return (
    <SimplifiedAnalysis
      patientId={patientId}
      patientName={decodeURIComponent(patientName)}
      onClose={handleClose}
    />
  );
};