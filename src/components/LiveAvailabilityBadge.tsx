import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LiveAvailabilityBadge = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      const { count: spotCount } = await supabase
        .from("parking_spots")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      
      setCount(spotCount || 0);
    };

    fetchCount();
    
    // Update count every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (count === null) return null;

  return (
    <div className="glass-card px-4 py-2 flex items-center gap-2 animate-fade-in">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
      </span>
      <span className="text-sm font-medium text-foreground">
        {count.toLocaleString()} spots available right now
      </span>
    </div>
  );
};

export default LiveAvailabilityBadge;
