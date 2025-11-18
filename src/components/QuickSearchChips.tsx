import { MapPin, Plane, Building2, Calendar, Clock } from "lucide-react";
import { Button } from "./ui/button";

interface QuickSearchChipsProps {
  onChipClick: (query: string, type?: string) => void;
}

const QuickSearchChips = ({ onChipClick }: QuickSearchChipsProps) => {
  const chips = [
    { label: "Near Me", icon: MapPin, query: "", type: "nearby" },
    { label: "Airport Parking", icon: Plane, query: "airport", type: "hourly" },
    { label: "Downtown", icon: Building2, query: "downtown", type: "hourly" },
    { label: "Monthly Spots", icon: Calendar, query: "", type: "monthly" },
    { label: "Daily Parking", icon: Clock, query: "", type: "daily" },
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
      {chips.map((chip, index) => {
        const Icon = chip.icon;
        return (
          <Button
            key={chip.label}
            variant="glass"
            size="sm"
            onClick={() => onChipClick(chip.query, chip.type)}
            className="glass-card hover-lift group"
            style={{ animationDelay: `${0.3 + index * 0.1}s` }}
          >
            <Icon className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
};

export default QuickSearchChips;
