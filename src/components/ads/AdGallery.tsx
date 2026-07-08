import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Star, Expand } from "lucide-react";

interface GalleryImage {
  id: string;
  image_url: string;
}

interface AdGalleryProps {
  images: GalleryImage[];
  title: string;
  isFeatured?: boolean;
}

export function AdGallery({ images, title, isFeatured }: AdGalleryProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const next = () => setIndex((prev) => (prev + 1) % images.length);
  const prev = () => setIndex((prev) => (prev - 1 + images.length) % images.length);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, images.length]);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
        <span className="text-muted-foreground">No images</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden group">
        <button
          type="button"
          className="w-full h-full cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
          aria-label="Expand image"
        >
          <img
            src={images[index].image_url}
            alt={`${title} — photo ${index + 1} of ${images.length}`}
            className="w-full h-full object-contain"
          />
        </button>

        <div className="absolute top-4 right-4 hidden group-hover:flex bg-card/80 rounded-full p-2">
          <Expand className="h-4 w-4" />
        </div>

        {images.length > 1 && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
            <span className="absolute bottom-3 right-3 text-xs bg-card/80 px-2 py-1 rounded-full">
              {index + 1} / {images.length}
            </span>
          </>
        )}

        {isFeatured && (
          <Badge className="absolute top-4 left-4 bg-primary gap-1">
            <Star className="h-3 w-3" />
            Featured
          </Badge>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setIndex(idx)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                idx === index ? "border-primary" : "border-transparent"
              }`}
            >
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl w-full p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            <img
              src={images[index].image_url}
              alt={`${title} — full size photo ${index + 1}`}
              className="max-h-[85vh] w-full object-contain"
            />
            {images.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
                  onClick={prev}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
                  onClick={next}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
