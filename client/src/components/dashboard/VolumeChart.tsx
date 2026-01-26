import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";

interface VolumeChartProps {
  data: Array<{
    date: string;
    actualVolume: number;
    targetVolume: number;
    cumulativeActual: number;
    cumulativeTarget: number;
    targetForDay?: number;
    aheadBehind?: number;
  }>;
}

function dateToDay(dateStr: string, year: number): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const jan1 = new Date(year, 0, 1);
  return Math.floor((date.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24));
}

export function VolumeChart({ data }: VolumeChartProps) {
  if (!data || data.length === 0) return null;

  const year = parseInt(data[0]?.date?.split('-')[0] || '2026');
  const today = new Date();
  const currentDay = Math.floor((today.getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24));
  
  const goalPerDay = data[1]?.targetVolume || 0;
  const todayTarget = goalPerDay * currentDay;
  const lastActual = data[data.length - 1]?.cumulativeActual || 0;

  const chartData: Array<{
    date: string;
    day: number;
    cumulativeActual: number;
    targetLine: number | null;
    aheadBehind?: number;
  }> = [];

  chartData.push({
    date: `${year}-01-01`,
    day: 0,
    cumulativeActual: 0,
    targetLine: 0
  });

  for (const point of data.slice(1)) {
    const day = dateToDay(point.date, year);
    chartData.push({
      date: point.date,
      day,
      cumulativeActual: point.cumulativeActual,
      targetLine: null,
      aheadBehind: point.aheadBehind
    });
  }

  chartData.push({
    date: format(today, 'yyyy-MM-dd'),
    day: currentDay,
    cumulativeActual: lastActual,
    targetLine: todayTarget,
    aheadBehind: lastActual - todayTarget
  });

  chartData.sort((a, b) => a.day - b.day);

  return (
    <Card className="glass-card col-span-1 lg:col-span-2 h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Volume Trajectory</CardTitle>
        <CardDescription>Cumulative progress vs. Linear Target</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="day"
              type="number"
              domain={[0, currentDay]}
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickFormatter={(value) => {
                const date = new Date(year, 0, value + 1);
                return format(date, "MMM d");
              }}
              tickMargin={10}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              }}
              tickMargin={10}
              tickCount={6}
              domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, todayTarget) * 1.1)]}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const dataPoint = payload[0]?.payload;
                if (!dataPoint) return null;
                
                const aheadBehind = dataPoint.aheadBehind;
                const hasAheadBehind = aheadBehind !== undefined && aheadBehind !== null;
                const isAhead = aheadBehind >= 0;
                
                return (
                  <div style={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    padding: "8px 12px",
                  }}>
                    <div style={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}>
                      {format(new Date(year, 0, dataPoint.day + 1), "MMM d, yyyy")}
                    </div>
                    <div style={{ color: "hsl(var(--primary))", fontWeight: 600 }}>
                      {new Intl.NumberFormat('en-US').format(Math.round(dataPoint.cumulativeActual || 0))} lbs
                    </div>
                    {hasAheadBehind && (
                      <div style={{ 
                        color: isAhead ? "hsl(142 71% 45%)" : "hsl(0 84% 60%)",
                        fontSize: "12px",
                        marginTop: "4px"
                      }}>
                        {isAhead ? "+" : ""}{new Intl.NumberFormat('en-US').format(Math.round(aheadBehind))} lbs {isAhead ? "ahead" : "behind"}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ paddingTop: "4px" }} />
            
            <Line 
              type="linear" 
              name="Target Pace"
              dataKey="targetLine" 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            
            <Area 
              type="linear" 
              name="Actual Volume"
              dataKey="cumulativeActual" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1} 
              fill="url(#colorActual)" 
              strokeWidth={3}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
