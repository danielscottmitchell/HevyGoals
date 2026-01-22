import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

interface VolumeChartProps {
  data: Array<{
    date: string;
    actualVolume: number;
    targetVolume: number;
    cumulativeActual: number;
    cumulativeTarget: number;
  }>;
}

export function VolumeChart({ data }: VolumeChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="glass-card col-span-1 lg:col-span-2 min-h-[400px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Volume Trajectory</CardTitle>
            <CardDescription>Cumulative progress vs. Linear Target</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickFormatter={(value) => format(parseISO(value), "MMM")}
              tickMargin={10}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              tickMargin={10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                borderColor: "hsl(var(--border))",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-lg)"
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [
                new Intl.NumberFormat('en-US').format(value) + ' lbs', 
                undefined
              ]}
              labelFormatter={(label) => format(parseISO(label), "MMM d, yyyy")}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            
            <Area 
              type="monotone" 
              name="Target Pace"
              dataKey="cumulativeTarget" 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="5 5"
              fill="transparent"
              strokeWidth={2}
            />
            
            <Area 
              type="monotone" 
              name="Actual Volume"
              dataKey="cumulativeActual" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1} 
              fill="url(#colorActual)" 
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
