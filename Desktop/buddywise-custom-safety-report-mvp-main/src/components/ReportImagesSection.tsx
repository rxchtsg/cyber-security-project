import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { ReportImage } from "./ImagePickerModal";

interface ReportImagesSectionProps {
  images: ReportImage[];
}

export const ReportImagesSection = ({ images }: ReportImagesSectionProps) => {
  if (images.length === 0) return null;

  return (
    <Card className="print-avoid-break">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl text-buddywise-dark-green flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Photos &amp; Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="print-avoid-break border rounded-lg overflow-hidden bg-card"
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                <img
                  src={image.url}
                  alt={image.caption || "Report image"}
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              </div>
              {image.caption && (
                <div className="p-3 border-t bg-background">
                  <p className="text-sm text-foreground">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
