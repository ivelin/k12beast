"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { isMobile } from "react-device-detect";
import useAppStore from "../../store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Paperclip } from "lucide-react";

export default function ProblemSubmission() {
  const {
    problem,
    images,
    imageUrls,
    sessionId,
    setProblem,
    setSubmittedProblem,
    setImages,
    setImageUrls,
    setLesson,
    setSessionId,
    setError,
    setStep,
    setLoading,
  } = useAppStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      try {
        const newImages = acceptedFiles.filter((file) => file.size <= 5 * 1024 * 1024);
        if (newImages.length !== acceptedFiles.length) {
          setError("Some files were rejected because they exceed the 5MB limit.");
          return;
        }

        if (images.length + newImages.length > 5) {
          setError("You can only upload a maximum of 5 images.");
          return;
        }

        setLoading(true);
        const formData = new FormData();
        newImages.forEach((file) => {
          formData.append("files", file);
        });

        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to upload images");
        }

        setImages([...images, ...newImages]);
        setImageUrls([...imageUrls, ...data.files.map((file) => file.url)]);
        setIsDialogOpen(false);
      } catch (err) {
        setError(err.message || "Failed to upload images. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [images, imageUrls, setImages, setImageUrls, setError, setLoading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 5,
  });

  const handleFileInputChange = async (e) => {
    const files = Array.from(e.target.files);
    await onDrop(files);
  };

  const handleTutorRequest = async () => {
    try {
      if (!problem && images.length === 0) {
        throw new Error("Please enter a problem or upload an image.");
      }

      setLoading(true);
      setSubmittedProblem(problem || "Image-based problem");
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({ problem: problem || "Image-based problem", images: imageUrls }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tutor lesson");
      }

      const newSessionId = response.headers.get("x-session-id");
      if (newSessionId) {
        setSessionId(newSessionId);
      }

      setLesson(data.lesson);
      setStep("examples");
    } catch (err) {
      setError(err.message || "Failed to fetch tutor lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-4 space-y-4">
        {useAppStore.getState().loading && (
          <p className="text-blue-500 text-center">Loading... Please wait.</p>
        )}
        <div className="relative input-container">
          <Textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Enter a problem (e.g., Simplify 12(3y + x)) or attach an image"
            rows={3}
            disabled={useAppStore.getState().loading}
            className="resize-none border-none rounded-lg focus:ring-0 focus-visible:ring-0 pr-12 pl-4 py-3"
          />
          {isMobile ? (
            <label className="absolute right-3 bottom-3">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
                capture="environment"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={useAppStore.getState().loading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </label>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 bottom-3 h-6 w-6"
                  disabled={useAppStore.getState().loading}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Images</DialogTitle>
                </DialogHeader>
                <div
                  {...getRootProps()}
                  className={`drop-area ${
                    isDragActive ? "active" : ""
                  }`}
                >
                  <input {...getInputProps()} />
                  <p className="text-[var(--text-secondary)]">
                    {isDragActive
                      ? "Drop the images here ..."
                      : "Drag up to 5 images here (max 5MB each), or click to select"}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {images.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Uploaded Images:</h3>
            <ul className="list-disc list-inside text-[var(--text-secondary)]">
              {images.map((file, index) => (
                <li key={index} className="text-sm">
                  {file.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            onClick={handleTutorRequest}
            disabled={useAppStore.getState().loading}
            className="h-9 px-3 text-sm"
          >
            Submit Problem
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}