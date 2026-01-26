import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

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

export function VolumeChart({ data }: VolumeChartProps) {
  if (!data || data.length === 0) return null;

  const year = new Date(data[0]?.date).getFullYear();
  const jan1 = new Date(year, 0, 1).getTime();
  const today = new Date();
  const todayTime = today.getTime();
  
  const goalPerDay = data[1]?.targetVolume || 0;
  const daysSinceJan1 = Math.floor((todayTime - jan1) / (1000 * 60 * 60 * 24));
  const todayTarget = goalPerDay * daysSinceJan1;
  const lastActual = data[data.length - 1]?.cumulativeActual || 0;

  const chartData: Array<{
    date: string;
    timestamp: number;
    cumulativeActual: number | null;
    targetLine: number | null;
    aheadBehind?: number;
  }> = [];

  chartData.push({
    date: format(new Date(jan1), 'yyyy-MM-dd'),
    timestamp: jan1,
    cumulativeActual: 0,
    targetLine: 0
  });

  for (const point of data.slice(1)) {
    chartData.push({
      date: point.date,
      timestamp: parseISO(point.date).getTime(),
      cumulativeActual: point.cumulativeActual,
      targetLine: null,
      aheadBehind: point.aheadBehind
    });
  }

  chartData.push({
    date: format(today, 'yyyy-MM-dd'),
    timestamp: todayTime,
    cumulativeActual: lastActual,
    targetLine: todayTarget,
    aheadBehind: lastActual - todayTarget
  });

  chartData.sort((a, b) => a.timestamp - b.timestamp);

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
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              scale="time"
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickFormatter={(value) => format(new Date(value), "MMM d")}
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
              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
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
                      {format(parseISO(dataPoint.date), "MMM d, yyyy")}
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
