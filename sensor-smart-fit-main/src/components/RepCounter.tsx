import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface RepCounterProps {
  repCount: number;
  exercise: string;
}

const RepCounter = ({ repCount, exercise }: RepCounterProps) => {
  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border/50 hover:shadow-glow transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-success" />
          Rep Counter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <div className="text-6xl font-bold text-success mb-4 animate-data-pulse">
            {repCount}
          </div>
          <div className="text-lg text-muted-foreground capitalize">
            {exercise === "Ready" ? "Ready to start" : exercise}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepCounter;
