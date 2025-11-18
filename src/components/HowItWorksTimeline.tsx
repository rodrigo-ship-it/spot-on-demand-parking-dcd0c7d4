import { Search, Calendar, CheckCircle } from "lucide-react";
import { Card, CardContent } from "./ui/card";

const HowItWorksTimeline = () => {
  const steps = [
    {
      icon: Search,
      number: 1,
      title: "Search & Compare",
      description: "Find the perfect parking spot by location, price, and amenities",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Calendar,
      number: 2,
      title: "Book Instantly",
      description: "Secure your reservation in seconds with instant confirmation",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: CheckCircle,
      number: 3,
      title: "Park & Go",
      description: "Show your QR code, park with ease, and enjoy your day",
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="w-full py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in three simple steps
          </p>
        </div>

        <div className="relative">
          {/* Connection line - hidden on mobile */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 -z-10" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card
                  key={step.number}
                  className="glass-card hover-lift overflow-hidden group"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <CardContent className="p-8 text-center relative">
                    {/* Gradient background on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                    
                    {/* Number badge */}
                    <div className={`w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300`}>
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksTimeline;
