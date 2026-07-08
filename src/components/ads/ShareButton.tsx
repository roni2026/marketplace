import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  text?: string;
  className?: string;
}

export function ShareButton({ title, text, className }: ShareButtonProps) {
  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // user cancelled share sheet — ignore
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <Button variant="outline" size="icon" className={className} onClick={handleShare} aria-label="Share this ad">
      <Share2 className="h-4 w-4" />
    </Button>
  );
}
