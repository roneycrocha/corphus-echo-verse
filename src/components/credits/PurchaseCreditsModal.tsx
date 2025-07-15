import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCredits } from "@/hooks/useCredits";
import { Loader2 } from "lucide-react";

interface PurchaseCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PurchaseCreditsModal = ({ open, onOpenChange }: PurchaseCreditsModalProps) => {
  const { packages, creditInfo, purchasing, purchaseCredits } = useCredits();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    setSelectedPackage(packageId);
    const result = await purchaseCredits(packageId);
    
    if (result.success) {
      onOpenChange(false);
    }
    setSelectedPackage(null);
  };

  const calculateFinalPrice = (originalPrice: number) => {
    if (!creditInfo?.credit_multiplier) return originalPrice;
    return originalPrice * creditInfo.credit_multiplier;
  };

  if (packages.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nenhum Pacote Disponível</DialogTitle>
            <DialogDescription>
              Não há pacotes de crédito disponíveis no momento.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl">Comprar Créditos</DialogTitle>
          <DialogDescription className="text-base">
            Escolha um pacote de créditos para continuar usando nossos recursos avançados.
            {creditInfo?.credit_multiplier && creditInfo.credit_multiplier !== 1 && (
              <Badge variant="secondary" className="ml-2">
                Desconto de {Math.round((1 - creditInfo.credit_multiplier) * 100)}% do seu plano
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4">
          {packages.map((pkg) => {
            const finalPrice = calculateFinalPrice(Number(pkg.price));
            const totalCredits = pkg.total_credits || (pkg.credits + pkg.bonus_credits);
            const totalBonus = pkg.total_bonus || pkg.bonus_credits;
            const isProcessing = purchasing && selectedPackage === pkg.id;

            return (
              <Card 
                key={pkg.id} 
                className={`relative hover:shadow-lg transition-shadow ${
                  pkg.is_featured ? 'ring-2 ring-primary/50 border-primary/50' : ''
                }`}
              >
                {pkg.is_featured && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      ⭐ Destaque
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-center">{pkg.name}</CardTitle>
                  <CardDescription className="text-center">
                    {pkg.credits} créditos
                    {totalBonus > 0 && (
                      <span className="text-primary font-medium">
                        {" + "}
                        {totalBonus} bônus
                        {pkg.plan_bonus_multiplier && pkg.plan_bonus_multiplier > 1 && (
                          <span className="text-green-600 text-xs ml-1">
                            (+{Math.round((pkg.plan_bonus_multiplier - 1) * 100)}%)
                          </span>
                        )}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {totalCredits}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        créditos totais
                      </div>
                    </div>

                    <div className="text-center">
                      {finalPrice !== Number(pkg.price) && (
                        <div className="text-sm line-through text-muted-foreground">
                          R$ {Number(pkg.price).toFixed(2)}
                        </div>
                      )}
                      <div className="text-2xl font-bold">
                        R$ {finalPrice.toFixed(2)}
                      </div>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={purchasing}
                      variant={pkg.is_featured ? "default" : "outline"}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        "Comprar Agora"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};