"use client";

import { useRef, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  className?: string;
}

export function FileUpload({ onFileSelect, accept = ".pdf,.docx,.doc", className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (selectedFile) {
    return (
      <div className={cn("flex items-center gap-3 p-4 border border-[var(--border)] rounded-lg bg-[var(--surface)]", className)}>
        <FileText size={20} className="text-brand shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{selectedFile.name}</p>
          <p className="text-xs text-[var(--text-secondary)]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        dragging
          ? "border-brand bg-brand/5"
          : "border-[var(--border)] hover:border-brand/50 hover:bg-[var(--surface)]",
        className
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <Upload size={24} className="mx-auto mb-3 text-[var(--text-secondary)]" />
      <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
        Drop your file here or click to browse
      </p>
      <p className="text-xs text-[var(--text-secondary)]">PDF or DOCX, max 10MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
