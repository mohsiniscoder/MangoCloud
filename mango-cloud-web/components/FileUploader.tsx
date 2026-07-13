"use client";

import React, { useState, useRef } from "react";

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "authorizing" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setStatus("authorizing");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      // 1. Get the VIP pass from the Node API
      const initResponse = await fetch(`${apiUrl}/api/upload/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, fileType: file.type }),
      });

      if (!initResponse.ok) throw new Error("Failed to initialize upload ledger");
      const { uploadUrl, fileId } = await initResponse.json();

      setStatus("uploading");

      // 2. Stream directly to MinIO
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setStatus("success");
          console.log(`File stored. Ledger ID: ${fileId}`);
        } else {
          setStatus("error");
        }
      };

      xhr.onerror = () => setStatus("error");
      xhr.send(file);

    } catch (error) {
      console.error("Upload failed:", error);
      setStatus("error");
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800">
      <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">Upload to Mango Cloud</h2>
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-orange-500 transition-colors"
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {file ? `Selected: ${file.name}` : "Click to browse files for upload"}
        </p>
      </div>

      {file && status === "idle" && (
        <button onClick={handleUpload} className="w-full mt-4 bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 rounded-lg transition-colors">
          Initialize Cloud Sync
        </button>
      )}

      {status !== "idle" && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <span className="capitalize">Status: {status}</span>
            {status === "uploading" && <span>{progress}%</span>}
          </div>
          
          {status === "uploading" && (
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div className="bg-orange-600 h-full transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>
          )}
          {status === "success" && <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center font-medium">🎉 File synchronized!</p>}
          {status === "error" && <p className="text-sm text-rose-600 dark:text-rose-400 text-center font-medium">❌ Pipeline crashed.</p>}
        </div>
      )}
    </div>
  );
}