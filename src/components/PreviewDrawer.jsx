import { useEffect, useRef, useState } from "react";
import { Drawer, Heading, Badge, Text, clx } from "@medusajs/ui";
import { renderAsync } from "docx-preview";
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
        <Drawer.Body className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center">
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
            // docx-preview styling usually needs no explicit size on container, it expands
          />
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <button className="text-ui-fg-subtle hover:text-ui-fg-base text-sm">
              Close
            </button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
