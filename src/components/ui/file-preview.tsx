// File path: src/components/ui/file-preview.tsx
// Displays a preview of uploaded files (images, text, or generic) with options to view or remove

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileIcon, X, ExternalLink } from "lucide-react";
import Image from "next/image"; // Use Next.js Image for optimized loading
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface FilePreviewProps {
  file?: File;
  url?: string;
  name?: string;
  onRemove?: () => void;
}

// Main FilePreview component to determine file type and render appropriate preview
export const FilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  (props, ref) => {
    if (props.file && props.file.type.startsWith("image/")) {
      return <ImageFilePreview {...props} ref={ref} />;
    } else if (props.url && props.url.match(/\.(jpeg|jpg|gif|png)$/i)) {
      return <ImageFilePreview {...props} ref={ref} />;
    }

    if (
      props.file &&
      (props.file.type.startsWith("text/") ||
        props.file.name.endsWith(".txt") ||
        props.file.name.endsWith(".md"))
    ) {
      return <TextFilePreview {...props} ref={ref} />;
    }

    return <GenericFilePreview {...props} ref={ref} />;
  }
);
FilePreview.displayName = "FilePreview";

// Preview component for image files with dialog for full-size view
const ImageFilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, url, name, onRemove }, ref) => {
    const src = file ? URL.createObjectURL(file) : url;
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <motion.div
          ref={ref}
          className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs cursor-pointer"
          layout
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          onClick={() => setIsOpen(true)}
        >
          <div className="flex w-full items-center space-x-2">
            <Image
              alt={`Attachment ${name || file?.name || "Image"}`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted object-cover"
              src={src || ""}
              width={40}
              height={40}
            />
            <span className="w-full truncate text-muted-foreground">
              {name || file?.name || "Image"}
            </span>
          </div>
          {onRemove ? (
            <button
              className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label="Remove attachment"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          ) : null}
        </motion.div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="p-0 max-w-3xl">
            <DialogTitle className="sr-only">Image Preview</DialogTitle>
            <DialogDescription className="sr-only">
              Preview of the uploaded image. Click &quot;View Full Size&quot; to see the original image in a new tab.
            </DialogDescription>
            <div className="relative">
              <Image
                src={src || ""}
                alt={name || file?.name || "Full-size image"}
                className="w-full h-auto max-h-[80vh] object-contain"
                width={800}
                height={600}
              />
              <a
                href={src || ""}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" />
                View Full Size
              </a>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);
ImageFilePreview.displayName = "ImageFilePreview";

// Preview component for text files with a snippet of content
const TextFilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove }, ref) => {
    const [preview, setPreview] = React.useState<string>("");

    React.useEffect(() => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setPreview(text.slice(0, 50) + (text.length > 50 ? "..." : ""));
      };
      reader.readAsText(file);
    }, [file]);

    return (
      <motion.div
        ref={ref}
        className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs"
        layout
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
      >
        <div className="flex w-full items-center space-x-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted p-0.5">
            <div className="h-full w-full overflow-hidden text-[6px] leading-none text-muted-foreground">
              {preview || "Loading..."}
            </div>
          </div>
          <span className="w-full truncate text-muted-foreground">
            {file?.name || "Text File"}
          </span>
        </div>
        {onRemove ? (
          <button
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </motion.div>
    );
  }
);
TextFilePreview.displayName = "TextFilePreview";

// Preview component for generic files with a file icon
const GenericFilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, name, onRemove }, ref) => {
    return (
      <motion.div
        ref={ref}
        className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs"
        layout
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
      >
        <div className="flex w-full items-center space-x-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted">
            <FileIcon className="h-6 w-6 text-foreground" />
          </div>
          <span className="w-full truncate text-muted-foreground">
            {name || file?.name || "File"}
          </span>
        </div>
        {onRemove ? (
          <button
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </motion.div>
    );
  }
);
GenericFilePreview.displayName = "GenericFilePreview";