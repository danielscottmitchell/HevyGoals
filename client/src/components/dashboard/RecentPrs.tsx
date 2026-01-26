import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Trophy, TrendingUp } from "lucide-react";

interface RecentPrsProps {
  prs: Array<{
    id: number;
    date: string;
    type: string;
    exerciseName?: string;
    value: number;
    delta?: number;
  }>;
}

export function RecentPrs({ prs }: RecentPrsProps) {
  if (!prs || prs.length === 0) {
    return (
      <Card className="glass-card h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Recent Records
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Trophy className="w-8 h-8 mb-2 opacity-20" />
          <p>No PRs recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Recent Records
        </CardTitle>
        <CardDescription>Your latest personal bests</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
        <div className="space-y-4">
          {prs.map((pr) => (
            <div 
              key={pr.id} 
              className="flex items-start justify-between p-3 rounded-lg bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors group"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {pr.exerciseName || "Workout"}
                </h4>
                <div className="text-xs text-muted-foreground mt-1">
                  {format(parseISO(pr.date), "MMM d")} • {
                    pr.type === "exercise_max_weight" ? "Max Weight" :
                    pr.type === "exercise_max_set_volume" ? "Set Volume" :
                    pr.type === "exercise_max_session_volume" ? "Session Volume" :
                    pr.type === "daily_total_volume" ? "Daily Total" : "PR"
                  }
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-accent">
                  {pr.value.toLocaleString()} {pr.type.includes("weight") ? "lbs" : "lbs"}
                </div>
                {pr.delta && pr.delta > 0 && (
                  <div className="text-xs text-emerald-500 flex items-center justify-end gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3" />
                    +{pr.delta.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
