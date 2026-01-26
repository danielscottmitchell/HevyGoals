import { useExercisePrs } from "@/hooks/use-hevy";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Dumbbell, TrendingUp, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function PRs() {
  const { data: prs, isLoading } = useExercisePrs();
  const [searchTerm, setSearchTerm] = useState("");

  if (isLoading) {
    return (
      <Shell>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  const filteredPrs = prs?.filter(pr => 
    pr.exerciseName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatWeight = (weight: string | null) => {
    if (!weight) return "-";
    const num = parseFloat(weight);
    return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toFixed(0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getExerciseTypeLabel = (type: string | null) => {
    switch (type) {
      case 'bodyweight': return 'BW';
      case 'bodyweight_weighted': return 'BW+';
      case 'bodyweight_assisted': return 'BW-';
      case 'weight_reps': return 'Weight';
      default: return type || 'Weight';
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Personal Records
            </h1>
            <p className="text-muted-foreground mt-2">
              Your all-time best performances for each exercise.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-prs"
            />
          </div>
        </div>

        {filteredPrs.length === 0 ? (
          <Card className="glass-card" data-testid="card-prs-empty">
            <CardContent className="py-12 text-center">
              <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-prs-empty">
                {prs?.length === 0 
                  ? "No exercise data yet. Sync your workouts to see your PRs!"
                  : "No exercises match your search."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrs.map((pr) => (
              <Card key={pr.id} className="glass-card hover-elevate" data-testid={`pr-card-${pr.exerciseTemplateId}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight" data-testid={`text-exercise-name-${pr.exerciseTemplateId}`}>{pr.exerciseName}</CardTitle>
                    <Badge variant="secondary" className="shrink-0" data-testid={`badge-exercise-type-${pr.exerciseTemplateId}`}>
                      {getExerciseTypeLabel(pr.exerciseType)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Dumbbell className="h-3 w-3" />
                        <span>Max Weight</span>
                      </div>
                      <p className="text-xl font-bold text-primary" data-testid={`value-max-weight-${pr.exerciseTemplateId}`}>
                        {formatWeight(pr.maxWeightLb)}
                        <span className="text-xs text-muted-foreground ml-0.5">lb</span>
                      </p>
                      {pr.maxWeightReps && pr.maxWeightReps > 0 && (
                        <p className="text-xs text-muted-foreground" data-testid={`value-max-weight-reps-${pr.exerciseTemplateId}`}>
                          @ {pr.maxWeightReps} reps
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground" data-testid={`date-max-weight-${pr.exerciseTemplateId}`}>
                        {formatDate(pr.maxWeightDate)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>Set Vol</span>
                      </div>
                      <p className="text-xl font-bold text-secondary" data-testid={`value-max-set-volume-${pr.exerciseTemplateId}`}>
                        {formatWeight(pr.maxSetVolumeLb)}
                        <span className="text-xs text-muted-foreground ml-0.5">lb</span>
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`date-max-set-volume-${pr.exerciseTemplateId}`}>
                        {formatDate(pr.maxSetVolumeDate)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3" />
                        <span>Session</span>
                      </div>
                      <p className="text-xl font-bold text-accent" data-testid={`value-max-session-volume-${pr.exerciseTemplateId}`}>
                        {formatWeight(pr.maxSessionVolumeLb)}
                        <span className="text-xs text-muted-foreground ml-0.5">lb</span>
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`date-max-session-volume-${pr.exerciseTemplateId}`}>
                        {formatDate(pr.maxSessionVolumeDate)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {prs && prs.length > 0 && (
          <p className="text-sm text-muted-foreground text-center" data-testid="text-prs-count">
            Showing {filteredPrs.length} of {prs.length} exercises
          </p>
        )}
      </div>
    </Shell>
  );
}
