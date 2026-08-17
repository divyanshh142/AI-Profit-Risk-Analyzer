import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileSpreadsheet, Upload as UploadIcon } from 'lucide-react';
import { addUploadedFile, getUploadedFiles } from '../api/auth';
import { clearStoredDataset, uploadDatasetFile } from '../api/upload';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/ui/EmptyState';
import type { UploadedFile } from '../types';

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>(() =>
    getUploadedFiles().map((name, i) => ({
      id: `stored-${i}`,
      name,
      size: 0,
      uploadedAt: new Date().toISOString(),
      status: 'ready' as const,
    })),
  );
  const [uploading, setUploading] = useState(false);

  function handleReset() {
    clearStoredDataset();
    setFiles([]);
  }

  const canContinue = files.some((f) => f.status === 'ready');

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);

    for (const file of Array.from(fileList)) {
      if (!file.name.toLowerCase().endsWith('.csv')) continue;

      const entry: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'uploading',
      };
      setFiles((prev) => [...prev, entry]);

      await uploadDatasetFile(file, user?.tenantId ?? 3);
      addUploadedFile(file.name);

      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: 'ready' as const } : f)),
      );
    }
    setUploading(false);
  }, [user?.tenantId]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload your data</h1>
        <p className="mt-1 text-sm text-gray-500">
          Import CSV files for <span className="font-medium text-gray-700">{user?.companyName}</span>
          — product catalog, orders, returns, and more.
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="mb-6 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center transition hover:border-brand-200 hover:bg-brand-50/30"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <UploadIcon className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-gray-900">Drag &amp; drop CSV files here</p>
        <p className="mt-1 text-xs text-gray-500">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Select CSV files'}
        </button>
      </div>

      {files.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No files uploaded yet"
          description="Upload your product catalog, order history, or returns data to generate insights."
        />
      ) : (
        <div className="section-card divide-y divide-gray-100 p-0">
          <div className="px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Uploaded files</h2>
          </div>
          <ul>
            {files.map((file) => (
              <li key={file.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    {file.size > 0 && (
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </div>
                {file.status === 'ready' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Ready
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Uploading...</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        {files.length > 0 ? (
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Clear dataset
          </button>
        ) : <div />}
        <button
          type="button"
          className="btn-primary gap-2"
          disabled={!canContinue}
          onClick={() => navigate('/dashboard')}
        >
          Continue to Dashboard
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
