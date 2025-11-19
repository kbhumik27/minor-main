import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, AlertTriangle, CheckCircle } from "lucide-react";

interface FormFeedbackProps {
  formScore: number;
  feedback: string;
}

const FormFeedback = ({ formScore, feedback }: FormFeedbackProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-accent";
    return "text-destructive";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-success" />;
    if (score >= 70) return <Award className="w-5 h-5 text-accent" />;
    return <AlertTriangle className="w-5 h-5 text-destructive" />;
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return "bg-gradient-success";
    if (score >= 70) return "bg-gradient-accent";
    return "bg-destructive";
  };

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border/50 hover:shadow-glow transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getScoreIcon(formScore)}
          Form Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Form Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(formScore)}`}>
              {formScore}%
            </span>
          </div>
          <Progress value={formScore} className="h-2">
            <div 
              className={`h-full transition-all duration-300 ${getProgressColor(formScore)}`}
              style={{ width: `${formScore}%` }}
            />
          </Progress>
        </div>

        <div className="p-4 bg-secondary/30 rounded-lg border border-border/50">
          <div className="text-sm font-medium mb-2 text-muted-foreground">AI Feedback</div>
          <div className="text-sm leading-relaxed">
            {feedback || "Start exercising to receive real-time feedback"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormFeedback;
