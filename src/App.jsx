import { useState } from "react";
import { Container, Heading, Text, Button, Toaster, toast } from "@medusajs/ui";
import { ArrowDownTray, Trash } from "@medusajs/icons";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { UploadArea } from "./components/UploadArea";
import { FileList } from "./components/FileList";
import { PreviewDrawer } from "./components/PreviewDrawer";
import { parseCSV, parseRows } from "./utils/csvParser";
import { generateWordDocument, saveDocument } from "./utils/docGenerator";
import { fetchGoogleSheet } from "./utils/googleSheetsParser";

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      originalFile: file,
      status: "processing",
      data: null,
      error: null,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    setIsProcessing(true);

    // Process each file
    for (const fileObj of newFiles) {
      try {
        const { students, subjects } = await parseCSV(fileObj.originalFile);
        if (students.length === 0) throw new Error("No students found");

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileObj.id
              ? { ...f, status: "success", data: { students, subjects } }
              : f,
          ),
        );
      } catch (e) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileObj.id
              ? { ...f, status: "error", error: e.message }
              : f,
          ),
        );
        toast.error(`Error processing ${fileObj.name}`, {
          description: e.message,
        });
      }
    }
    setIsProcessing(false);
  };

  const handleUrlImport = async (url) => {
    setIsProcessing(true);
    const toastId = toast.loading("Fetching Google Sheet...", {
      description: "This may take a moment",
    });

    try {
      const sheets = await fetchGoogleSheet(url);
      toast.dismiss(toastId);

      if (sheets.length === 0) {
        toast.error("No sheets found");
        return;
      }

      const newFiles = sheets.map((sheet) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: `${sheet.name}.csv`, // Treat as CSV for naming
        originalFile: null,
        status: "processing",
        data: null,
        error: null,
        sheetData: sheet.data,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Process sheets
      for (const fileObj of newFiles) {
        try {
          const { students, subjects } = parseRows(fileObj.sheetData);
          if (students.length === 0) throw new Error("No students found");

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id
                ? { ...f, status: "success", data: { students, subjects } }
                : f,
            ),
          );
        } catch (e) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id
                ? { ...f, status: "error", error: e.message }
                : f,
            ),
          );
        }
      }
      toast.success(`Imported ${sheets.length} sheets`);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Import failed", { description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedFiles((prev) => prev.filter((sid) => sid !== id));
  };

  const handleDownload = async (file) => {
    if (file.status !== "success") return;
    try {
      const blob = await generateWordDocument(
        file.data.students,
        file.data.subjects,
        file.name,
      );
      saveDocument(blob, file.name);
      toast.success(`Downloaded ${file.name}`);
    } catch (e) {
      toast.error("Download failed", { description: e.message });
    }
  };

  const handleBulkDownload = async () => {
    const filesToDownload = files.filter(
      (f) => selectedFiles.includes(f.id) && f.status === "success",
    );
    if (filesToDownload.length === 0) return;

    if (filesToDownload.length === 1) {
      await handleDownload(filesToDownload[0]);
      return;
    }

    const zip = new JSZip();
    let count = 0;

    toast.info("Generating Zip", { description: "Please wait..." });

    for (const file of filesToDownload) {
      try {
        const blob = await generateWordDocument(
          file.data.students,
          file.data.subjects,
          file.name,
        );
        const docName = file.name.replace(/\.csv$/i, "_Report.docx");
        zip.file(docName, blob);
        count++;
      } catch (e) {
        console.error(`Failed to generate ${file.name} for zip`, e);
      }
    }

    if (count > 0) {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "reports.zip");
      toast.success("Downloaded Zip");
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen w-full bg-ui-bg-subtle p-6 overflow-auto">
      <Toaster />
      <Container className="w-full max-w-4xl p-3 sm:p-6 flex flex-col gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <Heading level="h1">Report Generator</Heading>
            <Text className="text-ui-fg-subtle">
              Upload CSVs to generate reports.
            </Text>
          </div>
          {selectedFiles.length > 0 && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" className="flex-1 sm:flex-none justify-center" onClick={() => setSelectedFiles([])}>
                Cancel
              </Button>
              <Button className="flex-1 sm:flex-none justify-center" onClick={handleBulkDownload}>
                <ArrowDownTray className="mr-2" />
                Download ({selectedFiles.length})
              </Button>
            </div>
          )}
        </div>

        <UploadArea
          onUpload={handleUpload}
          onUrlImport={handleUrlImport}
          isProcessing={isProcessing}
          disabled={isProcessing}
        />

        {files.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <Heading level="h2" className="text-ui-fg-base text-lg">
                Files ({files.length})
              </Heading>
              <Button
                variant="transparent"
                className="text-ui-fg-destructive hover:bg-ui-bg-base-hover"
                onClick={() => setFiles([])}
              >
                <Trash className="mr-2" /> Clear All
              </Button>
            </div>
            <FileList
              files={files}
              selectedFiles={selectedFiles}
              onSelect={setSelectedFiles}
              onRemove={handleRemove}
              onPreview={setPreviewFile}
              onDownload={handleDownload}
            />
          </div>
        )}
      </Container>

      <PreviewDrawer
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}

export default App;
