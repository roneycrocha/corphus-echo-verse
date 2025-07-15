import React from 'react';
import { Badge } from '@/components/ui/badge';
import { usePatientTraits } from '@/hooks/usePatientTraits';

interface PatientNameWithTraitsProps {
  patientId?: string;
  patientName: string;
  className?: string;
}

export const PatientNameWithTraits: React.FC<PatientNameWithTraitsProps> = ({
  patientId,
  patientName,
  className = ''
}) => {
  const { patientTraits, loading } = usePatientTraits(patientId);

  const getTraitInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  const getTraitColor = (color: string): string => {
    // Usar a cor do traço do banco de dados para o texto e borda
    return `text-white border-2`;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="font-medium">{patientName}</span>

      {loading && (
        <Badge variant="outline" className="text-xs">
          Carregando...
        </Badge>
      )}
      
      {patientTraits?.hasAnalysis && patientTraits.traits.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {patientTraits.traits.slice(0, 5).map((trait, index) => (
            <Badge
              key={trait.code}
              variant="outline"
              className={`text-xs px-1.5 py-0.5 ${getTraitColor(trait.color)}`}
              style={{ 
                backgroundColor: trait.color,
                borderColor: trait.color
              }}
              title={`${trait.name}: ${trait.percentage}%`}
            >
              {getTraitInitial(trait.name)} {trait.percentage}%
            </Badge>
          ))}
          {patientTraits.traits.length > 5 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600">
              +{patientTraits.traits.length - 5}
            </Badge>
          )}
        </div>
      )}
      
      {patientTraits && !patientTraits.hasAnalysis && (
        <Badge variant="outline" className="text-xs w-fit bg-gray-50 text-gray-500">
          Sem análise corporal
        </Badge>
      )}
    </div>
  );
};