import { Button } from "@/components/ui/button";
import { Dumbbell, ArrowRight, BarChart3, Target, Calendar } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="absolute top-0 w-full z-10 border-b border-white/5">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Dumbbell className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl">HevyGoals</span>
          </div>
          <a href="/api/login">
            <Button variant="outline" className="hidden sm:flex">Log In</Button>
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] translate-y-1/2"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            <div className="flex-1 text-center lg:text-left space-y-8">
              <h1 className="text-5xl lg:text-7xl font-display font-bold tracking-tight text-white leading-[1.1]">
                Crush Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Volume Goals</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Visualize your lifting journey like never before. Track your progress towards the 3,000,000 lb club with advanced analytics for Hevy.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a href="/api/login">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                    Get Started <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </a>
              </div>

              <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                <div className="glass-card p-4 rounded-xl">
                  <BarChart3 className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-bold text-lg mb-1">Advanced Analytics</h3>
                  <p className="text-sm text-muted-foreground">Volume charts, heatmaps, and trend analysis.</p>
                </div>
                <div className="glass-card p-4 rounded-xl">
                  <Target className="w-8 h-8 text-emerald-500 mb-3" />
                  <h3 className="font-bold text-lg mb-1">Goal Tracking</h3>
                  <p className="text-sm text-muted-foreground">Stay on pace with daily and weekly targets.</p>
                </div>
                <div className="glass-card p-4 rounded-xl">
                  <Calendar className="w-8 h-8 text-purple-500 mb-3" />
                  <h3 className="font-bold text-lg mb-1">Consistency</h3>
                  <p className="text-sm text-muted-foreground">Visual heatmaps to keep your streak alive.</p>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full max-w-xl lg:max-w-none">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-30 animate-pulse"></div>
                <div className="relative glass-card rounded-2xl p-6 border border-white/10 shadow-2xl">
                  {/* Mock UI */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="h-2 w-24 bg-white/20 rounded mb-2"></div>
                        <div className="h-6 w-48 bg-white/10 rounded"></div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-primary/20"></div>
                    </div>
                    <div className="h-32 bg-white/5 rounded-xl border border-white/5"></div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-20 bg-white/5 rounded-xl"></div>
                      <div className="h-20 bg-white/5 rounded-xl"></div>
                      <div className="h-20 bg-white/5 rounded-xl"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-muted-foreground relative z-10">
        <div className="container mx-auto">
          &copy; {new Date().getFullYear()} HevyGoals. Not affiliated with Hevy.
        </div>
      </footer>
    </div>
  );
}
