import { useState } from "react";
import { Container, Text, Input, Button, clx, toast } from "@medusajs/ui";
import { ArrowUpTray, Link } from "@medusajs/icons";
import { useDropzone } from "react-dropzone";

export function UploadArea({ onUpload, onUrlImport, isProcessing }) {
  const [url, setUrl] = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: true,
  });

  const handleImport = async () => {
    if (!url) return;
    await onUrlImport(url);
    setUrl("");
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div
        {...getRootProps()}
        className={clx(
          "w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors gap-2 p-4",
          {
            "border-ui-border-strong bg-ui-bg-base hover:bg-ui-bg-base-hover":
              !isDragActive,
            "border-ui-border-interactive bg-blue-500/5": isDragActive,
            "opacity-50 cursor-not-allowed": isProcessing,
          },
        )}
      >
        <input {...getInputProps()} disabled={isProcessing} />

        <div className="p-2 rounded-full bg-ui-bg-component">
          <ArrowUpTray className="text-ui-fg-subtle" />
        </div>

        <div className="text-center">
          <Text weight="plus" className="text-ui-fg-base text-sm">
            Click to upload CSV or Excel files
          </Text>
          <Text className="text-ui-fg-subtle text-xs">
            or drag and drop them here
          </Text>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <div className="text-ui-fg-muted absolute left-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Link />
          </div>
          <Input
            placeholder="Paste Google Sheet Link"
            className="pl-8"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isProcessing}
          />
        </div>
        <Button
          variant="secondary"
          onClick={handleImport}
          disabled={!url || isProcessing}
          isLoading={isProcessing}
        >
          Import
        </Button>
      </div>
    </div>
  );
}
