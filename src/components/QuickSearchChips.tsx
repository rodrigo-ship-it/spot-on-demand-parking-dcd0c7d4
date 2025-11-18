import { MapPin, Plane, Building2, Calendar } from "lucide-react";

interface QuickSearchChipsProps {
  onChipClick: (query: string, type?: string) => void;
}

const QuickSearchChips = ({ onChipClick }: QuickSearchChipsProps) => {
  const chips = [
    { label: "Near Me", icon: MapPin, query: "", type: "nearby" },
    { label: "Airport", icon: Plane, query: "airport", type: "hourly" },
    { label: "Downtown", icon: Building2, query: "downtown", type: "hourly" },
    { label: "Monthly", icon: Calendar, query: "", type: "monthly" },
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-6 pt-6 border-t">
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.label}
            onClick={() => onChipClick(chip.query, chip.type)}
            className="px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Icon className="w-4 h-4" />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
};

export default QuickSearchChips;
