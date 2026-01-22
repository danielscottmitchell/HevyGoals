import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  valueClassName?: string;
  delay?: number;
}

export function StatCard({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  trend,
  trendValue,
  className,
  valueClassName,
  delay = 0 
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        "glass-card overflow-hidden hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </CardTitle>
        {Icon && (
          <div className="p-2 rounded-lg bg-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-300">
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold font-mono tracking-tight", valueClassName)}>
          {value}
        </div>
        {(subtext || trendValue) && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            {trend && trendValue && (
              <span className={cn(
                "flex items-center font-medium",
                trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-amber-500"
              )}>
                {trendValue}
              </span>
            )}
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
