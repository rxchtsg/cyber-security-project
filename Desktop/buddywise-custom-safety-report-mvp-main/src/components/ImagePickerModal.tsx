import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface ReportImage {
  id: string;
  file: File;
  url: string;
  caption: string;
}

interface ImagePickerModalProps {
  open: boolean;
  onConfirm: (images: ReportImage[]) => void;
  onCancel: () => void;
}

export const ImagePickerModal = ({ open, onConfirm, onCancel }: ImagePickerModalProps) => {
  const [images, setImages] = useState<ReportImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newImages: ReportImage[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        newImages.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          url,
          caption: "",
        });
      }
    });

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
    } else {
      toast({
        title: "Invalid files",
        description: "Please select image files only.",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      const removed = prev.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return updated;
    });
  };

  const updateCaption = (id: string, caption: string) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, caption } : img)));
  };

  const moveImage = (id: string, direction: "up" | "down") => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;

      const newImages = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
      return newImages;
    });
  };

  const handleConfirm = () => {
    onConfirm(images);
    setImages([]);
  };

  const handleCancel = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setImages([]);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Add Photos to Report
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Drop images here or click to browse</p>
            <p className="text-xs text-muted-foreground">Supports JPG, PNG, WEBP</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Selected Images ({images.length})</p>
              {images.map((image, index) => (
                <div key={image.id} className="border rounded-lg p-3 bg-card">
                  <div className="flex gap-3">
                    {/* Reorder Controls */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveImage(image.id, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-accent rounded disabled:opacity-30"
                        title="Move up"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveImage(image.id, "down")}
                        disabled={index === images.length - 1}
                        className="p-1 hover:bg-accent rounded disabled:opacity-30"
                        title="Move down"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Image Preview */}
                    <div className="w-24 h-24 flex-shrink-0 rounded overflow-hidden bg-muted">
                      <img src={image.url} alt="Preview" className="w-full h-full object-cover" />
                    </div>

                    {/* Caption Input */}
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Add a caption (optional)"
                        value={image.caption}
                        onChange={(e) => updateCaption(image.id, e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">{image.file.name}</p>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeImage(image.id)}
                      className="p-2 hover:bg-destructive/10 rounded-md text-destructive self-start"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-buddywise-green hover:bg-buddywise-dark-green">
            Confirm & Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
