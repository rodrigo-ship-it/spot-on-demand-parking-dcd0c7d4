import { MapPin, Plane, Building2, Calendar, Clock } from "lucide-react";

interface QuickSearchChipsProps {
  onChipClick: (query: string, type?: string) => void;
}

const QuickSearchChips = ({ onChipClick }: QuickSearchChipsProps) => {
  const chips = [
    { label: "Near Me", icon: MapPin, query: "", type: "nearby" },
    { label: "Airport", icon: Plane, query: "airport", type: "hourly" },
    { label: "Downtown", icon: Building2, query: "downtown", type: "hourly" },
    { label: "Monthly", icon: Calendar, query: "", type: "monthly" },
    { label: "Daily", icon: Clock, query: "", type: "daily" },
  ];

  return (
    <div className="flex flex-wrap gap-3 justify-center mt-6">
      {chips.map((chip, index) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.label}
            onClick={() => onChipClick(chip.query, chip.type)}
            className="group px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-400/30 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 hover:border-cyan-400/50 transition-all duration-300 flex items-center gap-2 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20 animate-fade-in"
            style={{ animationDelay: `${0.3 + index * 0.1}s` }}
          >
            <Icon className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-sm font-semibold text-foreground/90 group-hover:text-foreground">{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default QuickSearchChips;
