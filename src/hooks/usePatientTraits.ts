import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TraitScore {
  code: string;
  name: string;
  percentage: number;
  color: string;
}

interface PatientTraits {
  patientId: string;
  traits: TraitScore[];
  hasAnalysis: boolean;
}

export const usePatientTraits = (patientId?: string) => {
  const [patientTraits, setPatientTraits] = useState<PatientTraits | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchPatientTraits(patientId);
    }
  }, [patientId]);

  const fetchPatientTraits = async (id: string) => {
    setLoading(true);
    try {
      // Buscar a análise corporal mais recente do paciente
      const { data: analysis, error } = await supabase
        .from('body_analyses')
        .select('trait_scores, analysis_date')
        .eq('patient_id', id)
        .eq('status', 'completed')
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !analysis) {
        setPatientTraits({
          patientId: id,
          traits: [],
          hasAnalysis: false
        });
        return;
      }

      // Processar os trait_scores para extrair os traços e percentuais
      const traitScores = analysis.trait_scores as any[];
      
      if (!Array.isArray(traitScores) || traitScores.length === 0) {
        setPatientTraits({
          patientId: id,
          traits: [],
          hasAnalysis: false
        });
        return;
      }

      // Converter para o formato esperado e ordenar por percentual
      const traits: TraitScore[] = traitScores
        .map(trait => ({
          code: trait.code || '',
          name: trait.name || '',
          percentage: Math.round(trait.percentage || 0),
          color: trait.color || '#3B82F6'
        }))
        .filter(trait => trait.code && trait.name)
        .sort((a, b) => b.percentage - a.percentage);

      setPatientTraits({
        patientId: id,
        traits,
        hasAnalysis: true
      });

    } catch (error) {
      console.error('Erro ao buscar traços do paciente:', error);
      setPatientTraits({
        patientId: id,
        traits: [],
        hasAnalysis: false
      });
    } finally {
      setLoading(false);
    }
  };

  return { patientTraits, loading, refetch: () => patientId && fetchPatientTraits(patientId) };
};