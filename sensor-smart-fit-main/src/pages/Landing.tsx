import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, Zap, TrendingUp, Award } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="mb-8 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-sm border border-primary/30 rounded-full">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">AI-Powered Form Analysis</span>
            </div>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent animate-slide-up">
            Train Smarter
            <br />
            Not Harder
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Real-time AI coaching with ESP32 sensors. Perfect your form, count your reps, and crush your fitness goals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-primary hover:shadow-glow transition-all duration-300 text-lg px-8 py-6">
                Start Training
                <Zap className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="border-primary/50 hover:bg-primary/10 text-lg px-8 py-6">
                View Demo
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">95%</div>
              <div className="text-sm text-muted-foreground">Form Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent mb-2">Real-time</div>
              <div className="text-sm text-muted-foreground">AI Feedback</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-success mb-2">10+</div>
              <div className="text-sm text-muted-foreground">Exercises</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Your AI Gym Trainer
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Real-time Form Analysis</h3>
              <p className="text-muted-foreground">
                Get instant feedback on your form with ESP32 IMU sensors and AI-powered analysis.
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-accent-glow transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Smart Rep Counting</h3>
              <p className="text-muted-foreground">
                Never lose count again. Automatic rep detection for all your exercises.
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-success rounded-xl flex items-center justify-center mb-6">
                <Award className="w-6 h-6 text-success-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Track Your Progress</h3>
              <p className="text-muted-foreground">
                Visualize your improvements with detailed analytics and workout history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Workouts?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of athletes using AI to perfect their form
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-accent hover:shadow-accent-glow transition-all duration-300 text-lg px-8 py-6">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>
      
      
    </div>
  );
};

export default Landing;
