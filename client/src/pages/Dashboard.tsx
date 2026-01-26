import { useDashboardData, useRefreshData } from "@/hooks/use-hevy";
import { Shell } from "@/components/layout/Shell";
import { StatCard } from "@/components/dashboard/StatCard";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { YearHeatmap } from "@/components/dashboard/YearHeatmap";
import { RecentPrs } from "@/components/dashboard/RecentPrs";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CalendarDays, Activity, Target, Trophy, Clock, BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboardData();
  const refreshMutation = useRefreshData();

  if (isLoading) {
    return (
      <Shell>
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Crunching your numbers...</p>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="max-w-md mx-auto mt-20 text-center space-y-6">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">Setup Required</h2>
          <p className="text-muted-foreground">
            Welcome to HevyGoals! To start tracking your progress, please configure your Hevy API key in settings.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/settings">
              <Button size="lg" className="w-full">Go to Settings</Button>
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const { stats, chartData, heatmapData, recentPrs } = data;

  const handleRefresh = () => {
    refreshMutation.mutate(undefined, {
      onSuccess: () => refetch()
    });
  };

  return (
    <Shell>
      <div className="space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">
              {(stats.goalLb / 1000000).toFixed(1)}M lbs Goal
            </h1>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                {new Date().getFullYear()} Progress Dashboard
              </span>
              {stats.lastSyncAt && (
                <span className="text-xs py-0.5 px-2 rounded-full bg-secondary border border-white/5 whitespace-nowrap">
                  Synced: {new Date(stats.lastSyncAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={refreshMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
              {refreshMutation.isPending ? "Syncing..." : "Sync Data"}
            </Button>
            <Link href="/settings">
              <Button variant="secondary">Settings</Button>
            </Link>
          </div>
        </div>

        {/* Progress Bar Section */}
        <section className="glass-card p-6 rounded-2xl">
          <GoalProgress 
            current={stats.totalLiftedLb} 
            target={stats.goalLb} 
            percentage={stats.percentageComplete} 
            daysRemaining={stats.daysRemaining}
            requiredPerDay={stats.requiredPerDayLb}
          />
        </section>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard 
            title="Total Volume" 
            value={`${(stats.totalLiftedLb / 1000).toFixed(1)}k`}
            subtext="lbs lifted this year"
            icon={Activity}
            className="border-l-4 border-l-primary"
            delay={100}
          />
          <StatCard 
            title="Pace Status" 
            value={Math.abs(stats.aheadBehindLb).toLocaleString()}
            subtext={stats.aheadBehindLb >= 0 ? "Ahead of schedule" : "Behind schedule"}
            icon={Target}
            trend={stats.aheadBehindLb >= 0 ? "up" : "down"}
            trendValue={stats.aheadBehindLb >= 0 ? "Ahead" : "Behind"}
            valueClassName={stats.aheadBehindLb >= 0 ? "text-emerald-500" : "text-rose-500"}
            delay={200}
          />
          <StatCard 
            title="Sessions" 
            value={stats.sessionsCount}
            subtext="Total workouts"
            icon={BarChart3}
            delay={300}
          />
           <StatCard 
            title="Active Days" 
            value={stats.daysLiftedCount}
            subtext={`${((stats.daysLiftedCount / 365) * 100).toFixed(0)}% consistency`}
            icon={CalendarDays}
            delay={400}
          />
          <StatCard 
            title="Required / Day" 
            value={Math.round(stats.requiredPerDayLb).toLocaleString()}
            subtext="To meet goal"
            icon={Clock}
            delay={500}
          />
          <StatCard 
            title="Projected" 
            value={`${(stats.projectedYearEndLb / 1000000).toFixed(2)}M`}
            subtext="At current pace"
            icon={TrendingUp}
            className="bg-accent/5 border-accent/20"
            valueClassName="text-accent"
            delay={600}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 lg:col-span-2 min-h-[300px] sm:min-h-[350px]">
            <VolumeChart data={chartData} />
          </div>
          <div className="col-span-1 min-h-[300px] sm:min-h-[350px]">
            <RecentPrs prs={recentPrs} year={new Date().getFullYear()} />
          </div>
        </div>

        {/* Heatmap Section */}
        <YearHeatmap data={heatmapData} />

      </div>
    </Shell>
  );
}
