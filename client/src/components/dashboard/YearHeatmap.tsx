import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, startOfYear, endOfYear, eachDayOfInterval } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

interface HeatmapProps {
  data: Array<{
    date: string;
    volumeLb: number;
    count: number;
    prCount: number;
  }>;
  year?: number;
}

function HeatmapGrid({ days, dataMap, getColor }: { 
  days: Date[], 
  dataMap: Map<string, { volumeLb: number; prCount: number }>,
  getColor: (volume: number) => string 
}) {
  return (
    <div 
      className="grid gap-[2px] sm:gap-[3px]"
      style={{ 
        gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
        gridAutoFlow: 'column',
        gridAutoColumns: 'minmax(0, 1fr)'
      }}
    >
      {days.map((day) => {
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
                    aspect-square rounded-sm transition-all duration-200 
                    ${getColor(volume)}
                    ${prCount > 0 ? "ring-1 ring-accent" : ""}
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
  );
}

export function YearHeatmap({ data, year = new Date().getFullYear() }: HeatmapProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const startDate = startOfYear(new Date(year, 0, 1));
  const endDate = endOfYear(new Date(year, 0, 1));
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const midpoint = new Date(year, 6, 1);
  const firstHalf = allDays.filter(d => d < midpoint);
  const secondHalf = allDays.filter(d => d >= midpoint);

  const dataMap = new Map(data.map(d => [d.date, d]));

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
      <CardContent className="pb-4">
        <div className="w-full">
          {isMobile ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Jan - Jun</div>
                <HeatmapGrid days={firstHalf} dataMap={dataMap} getColor={getColor} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">Jul - Dec</div>
                <HeatmapGrid days={secondHalf} dataMap={dataMap} getColor={getColor} />
              </div>
            </div>
          ) : (
            <HeatmapGrid days={allDays} dataMap={dataMap} getColor={getColor} />
          )}
          
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
