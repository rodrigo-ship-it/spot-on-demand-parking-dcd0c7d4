import { motion } from 'framer-motion';

export const HeroIllustration = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background" />
      
      {/* Animated parking grid lines */}
      <svg 
        className="absolute inset-0 w-full h-full opacity-[0.03]"
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
      >
        {/* Vertical grid lines */}
        {[...Array(10)].map((_, i) => (
          <motion.line
            key={`v-${i}`}
            x1={i * 10 + 5}
            y1="0"
            x2={i * 10 + 5}
            y2="100"
            stroke="currentColor"
            strokeWidth="0.2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: i * 0.1 }}
          />
        ))}
        {/* Horizontal grid lines */}
        {[...Array(10)].map((_, i) => (
          <motion.line
            key={`h-${i}`}
            x1="0"
            y1={i * 10 + 5}
            x2="100"
            y2={i * 10 + 5}
            stroke="currentColor"
            strokeWidth="0.2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: i * 0.1 }}
          />
        ))}
      </svg>

      {/* Floating parking spot markers */}
      <motion.div
        className="absolute top-[15%] left-[10%] w-16 h-16 md:w-24 md:h-24"
        animate={{ 
          y: [0, -15, 0],
          rotate: [0, 5, 0]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-full h-full rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20 flex items-center justify-center">
          <svg className="w-8 h-8 md:w-12 md:h-12 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path d="M5 17H3V6a1 1 0 011-1h9v12H5z" />
            <path d="M14 17V5h4l3 4v8h-2" />
          </svg>
        </div>
      </motion.div>

      <motion.div
        className="absolute top-[25%] right-[8%] w-14 h-14 md:w-20 md:h-20"
        animate={{ 
          y: [0, 12, 0],
          rotate: [0, -3, 0]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <div className="w-full h-full rounded-xl bg-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center">
          <svg className="w-7 h-7 md:w-10 md:h-10 text-accent/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-[20%] left-[15%] w-12 h-12 md:w-16 md:h-16"
        animate={{ 
          y: [0, -10, 0],
          x: [0, 5, 0]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <div className="w-full h-full rounded-full bg-secondary/20 backdrop-blur-sm border border-secondary/30 flex items-center justify-center">
          <svg className="w-6 h-6 md:w-8 md:h-8 text-secondary-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-[30%] right-[12%] w-10 h-10 md:w-14 md:h-14"
        animate={{ 
          y: [0, 8, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      >
        <div className="w-full h-full rounded-lg bg-primary/5 backdrop-blur-sm border border-primary/10 flex items-center justify-center">
          <svg className="w-5 h-5 md:w-7 md:h-7 text-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
      </motion.div>

      {/* Animated car illustration */}
      <motion.div
        className="absolute bottom-[10%] right-[20%] md:right-[25%]"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <motion.svg
          className="w-32 h-20 md:w-48 md:h-28 text-primary/20"
          viewBox="0 0 120 60"
          fill="none"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Car body */}
          <motion.path
            d="M20 35 L25 20 L45 15 L75 15 L95 20 L100 35 L100 45 L20 45 Z"
            fill="currentColor"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
          />
          {/* Windows */}
          <motion.path
            d="M30 22 L43 18 L43 32 L28 32 Z"
            fill="hsl(var(--background))"
            fillOpacity="0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          />
          <motion.path
            d="M47 18 L73 18 L73 32 L47 32 Z"
            fill="hsl(var(--background))"
            fillOpacity="0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          />
          {/* Wheels */}
          <motion.circle
            cx="35"
            cy="48"
            r="8"
            fill="currentColor"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          <motion.circle
            cx="85"
            cy="48"
            r="8"
            fill="currentColor"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          {/* Wheel centers */}
          <circle cx="35" cy="48" r="3" fill="hsl(var(--background))" />
          <circle cx="85" cy="48" r="3" fill="hsl(var(--background))" />
        </motion.svg>
      </motion.div>

      {/* Subtle glow effects */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 rounded-full bg-primary/5 blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 md:w-72 md:h-72 rounded-full bg-accent/5 blur-3xl"
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
};
