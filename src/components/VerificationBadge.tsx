import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerificationBadgeProps {
  status: 'unverified' | 'pending' | 'verified' | 'rejected';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const VerificationBadge = ({ 
  status, 
  size = 'md',
  showTooltip = true 
}: VerificationBadgeProps) => {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          label: 'Verified Owner',
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
          tooltip: 'This owner has verified their ownership of this parking spot'
        };
      case 'pending':
        return {
          label: 'Verification Pending',
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
          tooltip: 'Ownership verification is being reviewed'
        };
      case 'rejected':
        return {
          label: 'Verification Failed',
          icon: XCircle,
          className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
          tooltip: 'Ownership verification was not approved'
        };
      default:
        return {
          label: 'Unverified',
          icon: Shield,
          className: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200',
          tooltip: 'This owner has not yet verified their ownership'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const badge = (
    <Badge 
      variant="outline" 
      className={`${sizeClasses[size]} ${config.className} flex items-center gap-1 border`}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
