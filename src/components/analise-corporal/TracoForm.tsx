import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

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

interface TracoFormProps {
  initialData?: BodyTrait;
  onSubmit: (data: Omit<BodyTrait, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

export const TracoForm: React.FC<TracoFormProps> = ({
  initialData,
  onSubmit,
  onCancel
}) => {
  const [codigo, setCodigo] = useState(initialData?.codigo || '');
  const [nomeTecnico, setNomeTecnico] = useState(initialData?.nome_tecnico || '');
  const [nomeSimbolico, setNomeSimbolico] = useState(initialData?.nome_simbolico || '');
  const [descricao, setDescricao] = useState(initialData?.descricao || '');
  const [color, setColor] = useState(initialData?.color || '#3B82F6');
  const [atributos, setAtributos] = useState<string[]>(initialData?.atributos_principais || []);
  const [novoAtributo, setNovoAtributo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!codigo.trim()) {
      newErrors.codigo = 'Código é obrigatório';
    } else if (codigo.length !== 1) {
      newErrors.codigo = 'Código deve ter apenas 1 letra';
    }

    if (!nomeTecnico.trim()) {
      newErrors.nomeTecnico = 'Nome técnico é obrigatório';
    }

    if (!nomeSimbolico.trim()) {
      newErrors.nomeSimbolico = 'Nome simbólico é obrigatório';
    }

    if (!descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    } else if (descricao.length < 50) {
      newErrors.descricao = 'Descrição deve ter pelo menos 50 caracteres';
    }

    if (atributos.length === 0) {
      newErrors.atributos = 'Pelo menos um atributo é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      codigo: codigo.toUpperCase(),
      nome_tecnico: nomeTecnico,
      nome_simbolico: nomeSimbolico,
      descricao,
      color,
      atributos_principais: atributos,
      is_active: true
    });
  };

  const adicionarAtributo = () => {
    if (novoAtributo.trim() && !atributos.includes(novoAtributo.trim())) {
      setAtributos([...atributos, novoAtributo.trim()]);
      setNovoAtributo('');
      if (errors.atributos) {
        setErrors({ ...errors, atributos: '' });
      }
    }
  };

  const removerAtributo = (index: number) => {
    setAtributos(atributos.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarAtributo();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 p-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="codigo">Código *</Label>
          <Input
            id="codigo"
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase());
              if (errors.codigo) setErrors({ ...errors, codigo: '' });
            }}
            placeholder="Ex: V"
            maxLength={1}
            className={errors.codigo ? 'border-destructive' : ''}
          />
          {errors.codigo && (
            <p className="text-sm text-destructive">{errors.codigo}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome-simbolico">Nome Simbólico *</Label>
          <Input
            id="nome-simbolico"
            value={nomeSimbolico}
            onChange={(e) => {
              setNomeSimbolico(e.target.value);
              if (errors.nomeSimbolico) setErrors({ ...errors, nomeSimbolico: '' });
            }}
            placeholder="Ex: Visionário"
            className={errors.nomeSimbolico ? 'border-destructive' : ''}
          />
          {errors.nomeSimbolico && (
            <p className="text-sm text-destructive">{errors.nomeSimbolico}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome-tecnico">Nome Técnico *</Label>
        <Input
          id="nome-tecnico"
          value={nomeTecnico}
          onChange={(e) => {
            setNomeTecnico(e.target.value);
            if (errors.nomeTecnico) setErrors({ ...errors, nomeTecnico: '' });
          }}
          placeholder="Ex: Esquizoide"
          className={errors.nomeTecnico ? 'border-destructive' : ''}
        />
        {errors.nomeTecnico && (
          <p className="text-sm text-destructive">{errors.nomeTecnico}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Cor do Traço</Label>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-md border-2 border-muted-foreground cursor-pointer transition-all hover:scale-105"
              style={{ backgroundColor: color }}
              onClick={() => document.getElementById('color-picker')?.click()}
            />
            <Input
              id="color-picker"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-16 h-10 p-1 border-0"
            />
          </div>
          <div className="w-full sm:flex-1">
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#3B82F6"
              className="font-mono text-sm w-full"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição *</Label>
        <Textarea
          id="descricao"
          value={descricao}
          onChange={(e) => {
            setDescricao(e.target.value);
            if (errors.descricao) setErrors({ ...errors, descricao: '' });
          }}
          placeholder="Descreva as características e comportamentos deste traço..."
          className={`min-h-[120px] ${errors.descricao ? 'border-destructive' : ''}`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{descricao.length} caracteres</span>
          {errors.descricao && (
            <span className="text-destructive">{errors.descricao}</span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Atributos Principais *</Label>
        
        <div className="flex gap-2">
          <Input
            value={novoAtributo}
            onChange={(e) => setNovoAtributo(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite um atributo..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={adicionarAtributo}
            disabled={!novoAtributo.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {atributos.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {atributos.length} atributo{atributos.length !== 1 ? 's' : ''} adicionado{atributos.length !== 1 ? 's' : ''}:
            </p>
            <div className="flex flex-wrap gap-2">
              {atributos.map((atributo, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {atributo}
                  <button
                    type="button"
                    onClick={() => removerAtributo(index)}
                    className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {errors.atributos && (
          <p className="text-sm text-destructive">{errors.atributos}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button 
          type="submit"
          className="w-full sm:w-auto"
        >
          {initialData ? 'Atualizar' : 'Criar'} Traço
        </Button>
      </div>
    </form>
  );
};