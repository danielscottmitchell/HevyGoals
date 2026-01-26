import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GoalProgressProps {
  current: number;
  target: number;
  percentage: number;
  daysRemaining: number;
  requiredPerDay: number;
}

export function GoalProgress({ current, target, percentage, daysRemaining, requiredPerDay }: GoalProgressProps) {
  // Cap percentage at 100 for visual bar, but display real number
  const displayPercentage = Math.min(100, Math.max(0, percentage));
  
  return (
    <div className="relative py-6">
      <div className="flex justify-between items-end mb-2">
        <div>
          <span className="text-3xl font-bold font-display text-foreground">{current.toLocaleString()}</span>
          <span className="text-muted-foreground ml-2 text-sm">lbs lifted</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-muted-foreground">Goal: {target.toLocaleString()} lbs</span>
          <div className="text-2xl font-bold text-primary">{percentage.toFixed(1)}%</div>
        </div>
      </div>

      <div className="relative h-4 w-full">
        <Progress value={displayPercentage} className="h-4 w-full bg-secondary border border-white/5" indicatorClassName="bg-primary shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
        
        {/* Milestones */}
        {[25, 50, 75].map((mark) => (
          <div 
            key={mark}
            className="absolute top-0 bottom-0 w-px bg-white/20 z-10"
            style={{ left: `${mark}%` }}
          >
            <div className="absolute -bottom-6 -translate-x-1/2 text-[10px] text-muted-foreground font-mono">
              {mark}%
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
          <div className="opacity-80 text-xs mb-1">Remaining to Goal</div>
          <div className="font-bold font-mono">{(target - current).toLocaleString()} lbs</div>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm">
          <div className="opacity-80 text-xs mb-1">Required Daily Avg</div>
          <div className="font-bold font-mono">~{Math.round(requiredPerDay).toLocaleString()} lbs/day</div>
        </div>
      </div>
    </div>
  );
}
