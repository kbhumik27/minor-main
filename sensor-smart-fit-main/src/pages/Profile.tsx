import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Activity, Award, TrendingUp, Calendar, ArrowLeft } from "lucide-react";

const Profile = () => {
  const stats = [
    { label: "Workouts", value: "42", icon: Activity, color: "text-primary" },
    { label: "Total Reps", value: "1,247", icon: TrendingUp, color: "text-accent" },
    { label: "Achievements", value: "8", icon: Award, color: "text-success" },
    { label: "Streak", value: "7 days", icon: Calendar, color: "text-primary" },
  ];

  const recentWorkouts = [
    { date: "Today", exercise: "Squats", reps: 45, formScore: 95 },
    { date: "Yesterday", exercise: "Push-ups", reps: 30, formScore: 92 },
    { date: "2 days ago", exercise: "Bicep Curls", reps: 50, formScore: 88 },
  ];

  const achievements = [
    { title: "First Workout", description: "Complete your first session", unlocked: true },
    { title: "Perfect Form", description: "Score 95+ form rating", unlocked: true },
    { title: "Century", description: "Complete 100 reps in one session", unlocked: false },
    { title: "Consistency King", description: "7 day workout streak", unlocked: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Profile Header */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="w-24 h-24 border-4 border-primary/50">
                <AvatarFallback className="text-2xl bg-gradient-primary">JD</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">John Doe</h1>
                <p className="text-muted-foreground mb-4">john.doe@example.com</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge className="bg-primary/20 text-primary border-primary/30">Pro Member</Badge>
                  <Badge className="bg-success/20 text-success border-success/30">Active Streak</Badge>
                </div>
              </div>
              <Button className="bg-gradient-accent hover:shadow-accent-glow">
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-card/80 backdrop-blur-xl border-border/50 hover:shadow-glow transition-all duration-300">
              <CardContent className="pt-6 text-center">
                <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Workouts */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle>Recent Workouts</CardTitle>
              <CardDescription>Your latest training sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentWorkouts.map((workout, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/50">
                    <div>
                      <div className="font-semibold">{workout.exercise}</div>
                      <div className="text-sm text-muted-foreground">{workout.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">{workout.reps} reps</div>
                      <div className="text-sm text-success">Form: {workout.formScore}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
              <CardDescription>Your fitness milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {achievements.map((achievement, i) => (
                  <div key={i} className={`flex items-start gap-3 p-4 rounded-lg border ${
                    achievement.unlocked 
                      ? 'bg-success/10 border-success/30' 
                      : 'bg-secondary/20 border-border/50 opacity-50'
                  }`}>
                    <Award className={`w-5 h-5 mt-0.5 ${achievement.unlocked ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <div className="font-semibold">{achievement.title}</div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                    </div>
                    {achievement.unlocked && (
                      <Badge className="bg-success/20 text-success border-success/30">Unlocked</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
