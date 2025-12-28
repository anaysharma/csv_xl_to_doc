import { useState, useRef } from "react";
import {
  Container,
  Heading,
  Text,
  Button,
  Toaster,
  toast,
  DropdownMenu,
  Prompt,
} from "@medusajs/ui";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { ArrowDownTray, Trash } from "@medusajs/icons";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { renderAsync } from "docx-preview";
import html2pdf from "html2pdf.js";

import { UploadArea } from "./components/UploadArea";
import { FileList } from "./components/FileList";
import { PreviewDrawer } from "./components/PreviewDrawer";
import { parseCSV, parseRows } from "./utils/csvParser";
import { generateWordDocument, saveDocument } from "./utils/docGenerator";
import { fetchGoogleSheet } from "./utils/googleSheetsParser";

import { SettingsPanel } from "./components/SettingsPanel";

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState({
    schoolName: "PODAR WORLD SCHOOL, BADWAI BHOPAL",
    reportTitle: "RESULT ANALYSIS 2025-26",
    rowsPerStudent: 3,
    termNames: ["PT I", "TERM I", "PT II"],
    headerImage: null,
  });

  const pdfContainerRef = useRef(null);

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

    for (const fileObj of newFiles) {
      try {
        const { students, subjects } = await parseCSV(
          fileObj.originalFile,
          config,
        );
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
        name: `${sheet.name}.csv`,
        originalFile: null,
        status: "processing",
        data: null,
        error: null,
        sheetData: sheet.data,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      for (const fileObj of newFiles) {
        try {
          const { students, subjects } = parseRows(fileObj.sheetData, config);
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
        config,
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
          config,
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

  const generatePdfBlob = async (file) => {
    const docBlob = await generateWordDocument(
      file.data.students,
      file.data.subjects,
      file.name,
      config,
    );

    const container = document.createElement("div");

    Object.assign(container.style, {
      position: "absolute",
      top: "-9999px",
      left: "-9999px",
      width: "794px",
      backgroundColor: "white",
      color: "black",
    });
    document.body.appendChild(container);

    try {
      await renderAsync(docBlob, container, undefined, {
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: true,
        breakPages: true,
        experimental: true,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;

      let currentY = margin;

      let targetElements = Array.from(
        container.querySelectorAll(
          ".docx-wrapper > section, .docx-wrapper > .docx-page",
        ),
      );

      if (targetElements.length === 0) {
        const wrapper = container.querySelector(".docx-wrapper") || container;
        targetElements = Array.from(wrapper.children).filter((el) => {
          return (
            el.tagName === "SECTION" ||
            el.tagName === "DIV" ||
            el.tagName === "TABLE" ||
            (el.tagName === "P" && el.innerText.trim().length > 0)
          );
        });
      }

      if (targetElements.length === 0) {
        targetElements = [container];
      }

      for (const element of targetElements) {
        const canvas = await html2canvas(element, {
          scale: 1.5,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.85);

        const imgProps = pdf.getImageProperties(imgData);
        const pdfImgHeight = (imgProps.height * contentWidth) / imgProps.width;

        if (
          currentY + pdfImgHeight > pageHeight - margin &&
          currentY > margin
        ) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.addImage(
          imgData,
          "JPEG",
          margin,
          currentY,
          contentWidth,
          pdfImgHeight,
        );

        currentY += pdfImgHeight;
      }

      return pdf.output("blob");
    } catch (e) {
      console.error("PDF generation failed:", e);
      throw e;
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleDownloadPdf = async (file) => {
    if (file.status !== "success") return;
    const toastId = toast.loading(`Generating PDF for ${file.name}...`);
    try {
      const pdfBlob = await generatePdfBlob(file);
      saveAs(pdfBlob, file.name.replace(/\.[^/.]+$/, "") + ".pdf");
      toast.dismiss(toastId);
      toast.success(`Downloaded ${file.name} as PDF`);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Download failed", { description: e.message });
      console.error(e);
    } finally {
      if (pdfContainerRef.current) pdfContainerRef.current.innerHTML = "";
    }
  };

  const handleBulkDownloadPdf = async () => {
    const filesToDownload = files.filter(
      (f) => selectedFiles.includes(f.id) && f.status === "success",
    );
    if (filesToDownload.length === 0) return;
    if (!pdfContainerRef.current) {
      toast.error("Internal Error: PDF Container missing");
      return;
    }

    if (filesToDownload.length === 1) {
      await handleDownloadPdf(filesToDownload[0]);
      return;
    }

    const toastId = toast.loading("Generating PDFs...", {
      description: "This might take a while.",
    });

    try {
      const zip = new JSZip();
      let count = 0;

      for (const file of filesToDownload) {
        try {
          const pdfBlob = await generatePdfBlob(file);
          const pdfName = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
          zip.file(pdfName, pdfBlob);
          count++;
        } catch (e) {
          console.error(`Failed to generate PDF for ${file.name}`, e);
        }
      }

      if (count > 0) {
        const zipContent = await zip.generateAsync({ type: "blob" });
        saveAs(zipContent, "reports_pdf.zip");
        toast.success("Downloaded PDF Zip");
      }
    } catch (e) {
      toast.error("PDF Generation Failed", { description: e.message });
    } finally {
      if (pdfContainerRef.current) pdfContainerRef.current.innerHTML = "";
      toast.dismiss(toastId);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen w-full bg-ui-bg-subtle p-2 sm:p-6 overflow-auto">
      <Toaster />
      <div
        ref={pdfContainerRef}
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          width: "794px",
          height: "auto",
          minHeight: "1123px",
          backgroundColor: "white",
          color: "black",
          fontFamily: "Arial, sans-serif",
          zIndex: -10000,
          visibility: "hidden",
          opacity: 0,
          pointerEvents: "none",
          boxSizing: "border-box",
        }}
        aria-hidden="true"
      />

      <Container className="w-full max-w-4xl p-3 sm:p-6 flex flex-col gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Heading level="h1">Report Generator</Heading>
          {selectedFiles.length > 0 && (
            <div className="flex gap-2 w-full sm:w-auto -mt-1">
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none justify-center"
                onClick={() => setSelectedFiles([])}
              >
                Cancel
              </Button>

              <DropdownMenu>
                <DropdownMenu.Trigger asChild>
                  <Button className="flex-1 sm:flex-none justify-center">
                    <ArrowDownTray />
                    Download ({selectedFiles.length})
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item onClick={handleBulkDownload}>
                    Download as DOCX
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={handleBulkDownloadPdf}>
                    Download as PDF
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>
            </div>
          )}
        </div>

        <UploadArea
          onUpload={handleUpload}
          onUrlImport={handleUrlImport}
          isProcessing={isProcessing}
          disabled={isProcessing}
        />

        <SettingsPanel
          isOpen={isSettingsOpen}
          onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
          config={config}
          onConfigChange={setConfig}
        />

        {files.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <Heading level="h2" className="text-ui-fg-base text-lg">
                Files ({files.length})
              </Heading>
              <Prompt>
                <Prompt.Trigger asChild>
                  <Button
                    variant="transparent"
                    className="text-ui-fg-destructive hover:bg-ui-bg-base-hover"
                  >
                    <Trash /> Clear All
                  </Button>
                </Prompt.Trigger>
                <Prompt.Content>
                  <Prompt.Header>
                    <Prompt.Title>Clear All Files?</Prompt.Title>
                    <Prompt.Description>
                      This will remove all uploaded files and data. This action
                      cannot be undone.
                    </Prompt.Description>
                  </Prompt.Header>
                  <Prompt.Footer>
                    <Prompt.Cancel>Cancel</Prompt.Cancel>
                    <Prompt.Action onClick={() => setFiles([])}>
                      Clear
                    </Prompt.Action>
                  </Prompt.Footer>
                </Prompt.Content>
              </Prompt>
            </div>
            <FileList
              files={files}
              selectedFiles={selectedFiles}
              onSelect={setSelectedFiles}
              onRemove={handleRemove}
              onPreview={setPreviewFile}
              onDownload={handleDownload}
              onDownloadPdf={handleDownloadPdf}
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
