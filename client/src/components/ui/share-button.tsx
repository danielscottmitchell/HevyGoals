import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  filename?: string;
  className?: string;
}

export function ShareButton({ targetRef, filename = "hevygoals", className }: ShareButtonProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    if (!targetRef.current) return;

    try {
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({
        title: "Image saved",
        description: "Your card has been downloaded as a PNG.",
      });
    } catch (error) {
      toast({
        title: "Failed to save image",
        description: "There was an error generating the image.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      size="icon" 
      variant="ghost" 
      onClick={handleShare}
      className={className}
      data-testid="button-share"
    >
      <Share2 className="w-4 h-4" />
    </Button>
  );
}
