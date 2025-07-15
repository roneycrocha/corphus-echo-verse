import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Upload, X, ZoomIn, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoGalleryProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  patientId: string;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onPhotosChange,
  patientId
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const newPhotos: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Arquivo inválido',
            description: 'Apenas imagens são permitidas.',
            variant: 'destructive'
          });
          continue;
        }

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'Arquivo muito grande',
            description: 'Imagens devem ter no máximo 5MB.',
            variant: 'destructive'
          });
          continue;
        }

        // Converter para base64 para preview (em produção, seria feito upload para o storage)
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPhotos.push(e.target.result as string);
            if (newPhotos.length === Math.min(files.length, 10 - photos.length)) {
              onPhotosChange([...photos, ...newPhotos]);
            }
          }
        };
        reader.readAsDataURL(file);
      }

      toast({
        title: 'Fotos adicionadas',
        description: `${Math.min(files.length, 10 - photos.length)} foto(s) adicionada(s) com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao processar fotos:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar as fotos.',
        variant: 'destructive'
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    toast({
      title: 'Foto removida',
      description: 'A foto foi removida da galeria.',
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
            📷
          </div>
          Fotos do Paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Button */}
        <Button
          variant="outline"
          onClick={handleUploadClick}
          disabled={photos.length >= 10}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {photos.length === 0 ? 'Adicionar Fotos' : `Adicionar (${photos.length}/10)`}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-20 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedPhoto(photo)}
                />
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto(index);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-6 w-6 p-0"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm">Nenhuma foto adicionada</p>
            <p className="text-xs">Clique em "Adicionar Fotos" para começar</p>
          </div>
        )}

        {/* Photo Preview Dialog */}
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl w-[95vw] h-[95vh] p-2">
            {selectedPhoto && (
              <div className="relative w-full h-full">
                <img
                  src={selectedPhoto}
                  alt="Foto ampliada"
                  className="w-full h-full object-contain"
                />
                <Button
                  className="absolute top-4 right-4"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Máximo 10 fotos</p>
          <p>• Tamanho máximo: 5MB por foto</p>
          <p>• Formatos: JPG, PNG, GIF</p>
          <p>• Clique na foto para ampliar</p>
        </div>
      </CardContent>
    </Card>
  );
};