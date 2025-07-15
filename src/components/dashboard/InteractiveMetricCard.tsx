import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface InteractiveMetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  loading?: boolean;
  onClick?: () => void;
  navigateTo?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

/**
 * Card de métrica interativo com navegação
 */
export const InteractiveMetricCard: React.FC<InteractiveMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  loading = false,
  onClick,
  navigateTo,
  trend
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (navigateTo) {
      navigate(navigateTo);
    }
  };

  const isClickable = onClick || navigateTo;

  return (
    <Card 
      className={`metric-card transition-all duration-200 ${
        isClickable 
          ? 'cursor-pointer hover:shadow-md hover:scale-105 hover:border-primary/30' 
          : ''
      }`}
      onClick={handleClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
          {title}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor} flex-shrink-0`} />
          {isClickable && (
            <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
        ) : (
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {value}
          </div>
        )}
        <div className="flex items-center justify-between mt-1 sm:mt-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {subtitle}
          </span>
          {trend && (
            <div className={`text-[10px] sm:text-xs font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};