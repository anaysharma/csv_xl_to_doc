import { useEffect, useRef, useState } from "react";
import { Drawer, Heading, Badge, Text, clx } from "@medusajs/ui";
import { renderAsync } from "docx-preview";
import { ArrowDownTray } from "@medusajs/icons";
import html2pdf from 'html2pdf.js';
import { generateWordDocument } from "../utils/docGenerator";

export function PreviewDrawer({ open, onClose, file }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !file || !file.data) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const renderDoc = async () => {
      try {
        // 1. Generate the Blob
        const blob = await generateWordDocument(
          file.data.students,
          file.data.subjects,
          file.name,
        );

        if (!mounted) return;

        // 2. Render to Container
        if (containerRef.current) {
          containerRef.current.innerHTML = ""; // Clear previous
          await renderAsync(blob, containerRef.current, undefined, {
            inWrapper: false, // We handle wrapper
            ignoreWidth: false,
            ignoreHeight: false,
            debug: false,
          });
        }
      } catch (e) {
        console.error("Preview render failed", e);
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    renderDoc();

    return () => {
      mounted = false;
    };
  }, [open, file]);

  const handleDownloadPdf = async () => {
    if (!containerRef.current) return;
    
    // We can show a toast or loading state here if desired
    
    const element = containerRef.current;
    
    // html2pdf configuration
    const opt = {
      margin:       10, // mm
      filename:     (file.name.replace(/\.[^/.]+$/, "") || "document") + ".pdf",
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } catch (e) {
        console.error("PDF generation failed", e);
        // Could set an error state here or toast
    }
  }

  if (!file) return null;

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <Drawer.Content className="w-[90vw] max-w-[1000px] h-full flex flex-col">
        <Drawer.Header>
          <Drawer.Title>Preview: {file.name}</Drawer.Title>
          <div className="flex gap-2 mt-2">
            <Badge>{file.data?.students?.length || 0} Students</Badge>
          </div>
        </Drawer.Header>
        <Drawer.Body className="flex-1 overflow-auto bg-gray-100 p-4 sm:p-8 flex justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center p-12">
              <Text className="animate-pulse">Generating Preview...</Text>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 text-red-500 rounded border border-red-200">
              Failed to preview: {error}
            </div>
          )}

          <div
            ref={containerRef}
            className={clx(
              "bg-white shadow-lg min-h-[800px] w-fit origin-top transition-opacity duration-300",
              { "opacity-0": loading, "opacity-100": !loading },
            )}
          />
        </Drawer.Body>
        <Drawer.Footer className="flex justify-end gap-2">
            <button 
                onClick={handleDownloadPdf}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors gap-2 disabled:opacity-50"
                disabled={loading}
            >
                <ArrowDownTray /> Download PDF
            </button>
          <Drawer.Close asChild>
            <button className="text-ui-fg-subtle hover:text-ui-fg-base text-sm px-4 py-2">
              Close
            </button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
