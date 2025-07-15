import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BodyTrait {
  id: string;
  codigo: string;
  nome_tecnico: string;
  nome_simbolico: string;
  descricao: string;
  atributos_principais: string[];
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TracoDetailsProps {
  trait: BodyTrait;
}

export const TracoDetails: React.FC<TracoDetailsProps> = ({ trait }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-md border-2 border-muted-foreground"
            style={{ backgroundColor: trait.color }}
            title={`Cor: ${trait.color}`}
          />
          <Badge variant="outline" className="font-mono text-lg p-2">
            {trait.codigo}
          </Badge>
        </div>
        <div>
          <h2 className="text-2xl font-bold">{trait.nome_simbolico}</h2>
          <p className="text-muted-foreground">{trait.nome_tecnico}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{trait.descricao}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atributos Principais</CardTitle>
          <CardDescription>
            Características chave deste traço corporal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {trait.atributos_principais.map((atributo, index) => (
              <div key={index} className="flex items-start gap-3">
                <Badge variant="secondary" className="font-mono min-w-fit">
                  {index + 1}
                </Badge>
                <p className="text-sm leading-relaxed">{atributo}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Criado em: {new Date(trait.created_at).toLocaleString('pt-BR')}</p>
        <p>Atualizado em: {new Date(trait.updated_at).toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
};