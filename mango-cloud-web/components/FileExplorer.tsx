"use client";

import React, { useEffect, useState } from "react";

// Define the shape of our database ledger entry
interface CloudFile {
  _id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  uploadStatus: string;
  createdAt: string;
}

export default function FileExplorer() {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch the ledger from the Node API
  const fetchLedger = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/files`);
      if (!res.ok) throw new Error("Failed to fetch ledger");
      const data = await res.json();
      setFiles(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch files on initial load
  useEffect(() => {
    fetchLedger();
  }, []);

  // Format bytes to a readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle the secure download sequence
  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      // 1. Request a 5-minute pre-signed GET URL from the Gatekeeper
      const res = await fetch(`${apiUrl}/api/files/${fileId}/download`);
      if (!res.ok) throw new Error("Failed to get download ticket");
      
      const { downloadUrl } = await res.json();

      // 2. Trigger the download in the browser
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to securely download the file.");
    }
  };

  return (
    <div className="w-full max-w-2xl mt-8 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Cloud Storage Ledger</h2>
        <button 
          onClick={fetchLedger}
          className="text-sm px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-center py-4">Syncing with cluster...</p>
      ) : files.length === 0 ? (
        <p className="text-zinc-500 text-center py-4">No files detected in the cloud ledger.</p>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div 
              key={file._id} 
              className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-orange-500 dark:hover:border-orange-500 transition-colors"
            >
              <div className="flex flex-col overflow-hidden">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate w-48 sm:w-80">
                  {file.originalName}
                </span>
                <span className="text-xs text-zinc-500 mt-1">
                  {formatBytes(file.sizeBytes)} • {new Date(file.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <button
                onClick={() => handleDownload(file._id, file.originalName)}
                className="ml-4 px-4 py-2 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-800/50 font-medium text-sm rounded-lg transition-colors"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}