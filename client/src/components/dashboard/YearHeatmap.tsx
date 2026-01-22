import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, getDay, startOfYear, endOfYear, eachDayOfInterval, isSameDay } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeatmapProps {
  data: Array<{
    date: string;
    volumeLb: number;
    count: number;
    prCount: number;
  }>;
  year?: number;
}

export function YearHeatmap({ data, year = new Date().getFullYear() }: HeatmapProps) {
  // Generate all days for the year
  const startDate = startOfYear(new Date(year, 0, 1));
  const endDate = endOfYear(new Date(year, 0, 1));
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Create a map for fast lookup
  const dataMap = new Map(data.map(d => [d.date, d]));

  // Color scale function
  const getColor = (volume: number) => {
    if (volume === 0) return "bg-secondary";
    if (volume < 5000) return "bg-primary/20";
    if (volume < 15000) return "bg-primary/40";
    if (volume < 30000) return "bg-primary/60";
    if (volume < 50000) return "bg-primary/80";
    return "bg-primary";
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Consistency Heatmap</CardTitle>
        <CardDescription>{year} Activity Log</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="min-w-[800px]">
          <div className="flex gap-1">
            {/* Simple Grid Layout for the heatmap - grouping by weeks would be complex, doing columns per week */}
            {/* Instead, let's use a CSS grid with 7 rows and auto-flow column */}
            <div 
              className="grid grid-rows-7 grid-flow-col gap-1 w-fit" 
            >
              {allDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayData = dataMap.get(dateStr);
                const volume = dayData?.volumeLb || 0;
                const prCount = dayData?.prCount || 0;

                return (
                  <TooltipProvider key={dateStr}>
                    <Tooltip delayDuration={50}>
                      <TooltipTrigger asChild>
                        <div 
                          className={`
                            w-3 h-3 rounded-sm transition-all duration-200 
                            ${getColor(volume)}
                            ${prCount > 0 ? "ring-2 ring-accent ring-offset-1 ring-offset-background" : ""}
                          `}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        <div className="font-bold">{format(day, "MMM d, yyyy")}</div>
                        <div>{volume > 0 ? `${(volume).toLocaleString()} lbs` : "No activity"}</div>
                        {prCount > 0 && <div className="text-accent mt-1">★ {prCount} PRs</div>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground justify-end">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-secondary"></div>
            <div className="w-3 h-3 rounded-sm bg-primary/20"></div>
            <div className="w-3 h-3 rounded-sm bg-primary/40"></div>
            <div className="w-3 h-3 rounded-sm bg-primary/60"></div>
            <div className="w-3 h-3 rounded-sm bg-primary"></div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
