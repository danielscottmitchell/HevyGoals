import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface CopyStatsButtonProps {
  stats: {
    totalLiftedLb: number;
    sessionsCount: number;
    percentageComplete: number;
    goalLb: number;
    lastWorkoutVolume?: number;
  };
  year: number;
}

export function CopyStatsButton({ stats, year }: CopyStatsButtonProps) {
  const { toast } = useToast();
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackText, setFallbackText] = useState("");

  const generateText = () => {
    const sessionVolume = stats.lastWorkoutVolume || 0;
    const ytdVolume = stats.totalLiftedLb || 0;
    const sessions = stats.sessionsCount || 0;
    const progress = stats.percentageComplete || 0;
    const goal = stats.goalLb || 0;

    return [
      `Session #${sessions} Volume: ${sessionVolume.toLocaleString()} lbs`,
      `YTD Volume: ${ytdVolume.toLocaleString()} lbs`,
      `Progress: ${progress.toFixed(1)}% of ${goal.toLocaleString()} lbs goal for ${year}`
    ].join('\n');
  };

  const handleCopy = async () => {
    const text = generateText();

    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Stats copied to clipboard.",
      });
    } catch {
      setFallbackText(text);
      setShowFallback(true);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleCopy}
        className="gap-2"
        data-testid="button-copy-stats"
      >
        <Copy className="w-4 h-4" />
        Copy Stats
      </Button>

      <Dialog open={showFallback} onOpenChange={setShowFallback}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Stats</DialogTitle>
            <DialogDescription>
              Select all and copy the text below.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={fallbackText}
            readOnly
            className="min-h-[120px] font-mono text-sm"
            onFocus={(e) => e.target.select()}
            data-testid="textarea-fallback-stats"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
