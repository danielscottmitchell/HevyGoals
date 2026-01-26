import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

interface ShareButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  filename?: string;
  className?: string;
}

export function ShareButton({ targetRef, filename = "hevygoals", className }: ShareButtonProps) {
  const { toast } = useToast();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleShare = async () => {
    if (!targetRef.current) return;

    try {
      if (buttonRef.current) {
        buttonRef.current.style.visibility = "hidden";
      }

      const element = targetRef.current;
      const originalStyle = element.style.cssText;
      
      // Capture original dimensions before any manipulation
      const rect = element.getBoundingClientRect();
      const originalWidth = rect.width;
      
      // Lock the element's width to prevent mobile shrinking
      element.style.width = `${originalWidth}px`;
      element.style.minWidth = `${originalWidth}px`;
      element.style.margin = "0";
      
      const wrapper = document.createElement("div");
      wrapper.style.display = "inline-block";
      wrapper.style.padding = "16px";
      wrapper.style.width = `${originalWidth + 32}px`; // Include padding
      wrapper.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--background').trim() 
        ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--background').trim()})`
        : "#ffffff";
      
      const parent = element.parentNode;
      if (parent) {
        parent.insertBefore(wrapper, element);
        wrapper.appendChild(element);
      }

      const canvas = await html2canvas(wrapper, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background').trim() 
          ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--background').trim()})`
          : "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      if (parent) {
        parent.insertBefore(element, wrapper);
        wrapper.remove();
      }
      element.style.cssText = originalStyle;

      if (buttonRef.current) {
        buttonRef.current.style.visibility = "visible";
      }

      const link = document.createElement("a");
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({
        title: "Image saved",
        description: "Your card has been downloaded as a PNG.",
      });
    } catch (error) {
      if (buttonRef.current) {
        buttonRef.current.style.visibility = "visible";
      }
      toast({
        title: "Failed to save image",
        description: "There was an error generating the image.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      ref={buttonRef}
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
