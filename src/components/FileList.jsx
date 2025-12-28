import {
  Table,
  IconButton,
  StatusBadge,
  Checkbox,
  Tooltip,
  DropdownMenu,
} from "@medusajs/ui";
import { Trash, Eye, ArrowDownTray } from "@medusajs/icons";

export function FileList({
  files,
  selectedFiles,
  onSelect,
  onRemove,
  onPreview,
  onDownload,
  onDownloadPdf,
}) {
  const allSelected = files.length > 0 && selectedFiles.length === files.length;
  const indeterminate =
    selectedFiles.length > 0 && selectedFiles.length < files.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelect([]);
    } else {
      onSelect(files.map((f) => f.id));
    }
  };

  const toggleOne = (id) => {
    if (selectedFiles.includes(id)) {
      onSelect(selectedFiles.filter((sid) => sid !== id));
    } else {
      onSelect([...selectedFiles, id]);
    }
  };

  return (
    <div className="w-full border rounded-lg overflow-hidden overflow-x-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell className="w-8 !pl-3">
              <Checkbox
                checked={allSelected}
                indeterminate={indeterminate}
                onCheckedChange={toggleAll}
              />
            </Table.HeaderCell>
            <Table.HeaderCell>File Name</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {files.map((file) => (
            <Table.Row key={file.id} className="group">
              <Table.Cell className="p-1 !pl-3 w-8">
                <Checkbox
                  checked={selectedFiles.includes(file.id)}
                  onCheckedChange={() => toggleOne(file.id)}
                />
              </Table.Cell>
              <Table.Cell className="font-medium text-ui-fg-base  text-xs sm:text-sm max-w-[100px] truncate sm:max-w-none">
                {file.name}
              </Table.Cell>
              <Table.Cell className=" hidden sm:table-cell">
                {file.status === "success" ? (
                  <StatusBadge color="green" className="py-0">
                    Ready
                  </StatusBadge>
                ) : file.status === "processing" ? (
                  <StatusBadge color="orange" className="py-0">
                    Processing
                  </StatusBadge>
                ) : (
                  <StatusBadge color="red" className="py-0">
                    Error
                  </StatusBadge>
                )}
              </Table.Cell>
              {/* Mobile Status Indicator (Icon only) */}
              <Table.Cell className=" sm:hidden w-8">
                <div
                  className={`w-2 h-2 rounded-full ${
                    file.status === "success"
                      ? "bg-green-500"
                      : file.status === "processing"
                        ? "bg-orange-500"
                        : "bg-red-500"
                  }`}
                ></div>
              </Table.Cell>

              <Table.Cell className="text-right !pr-3">
                <div className="flex justify-end gap-1 items-center h-full">
                  <IconButton
                    variant="transparent"
                    className="w-8 h-8 flex items-center justify-center p-0"
                    onClick={() => onPreview(file)}
                  >
                    <Eye className="w-5 h-5 text-ui-fg-subtle" />
                  </IconButton>

                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <IconButton
                        variant="transparent"
                        className="w-8 h-8 flex items-center justify-center p-0"
                        disabled={file.status !== "success"}
                      >
                        <ArrowDownTray className="w-5 h-5 text-ui-fg-subtle" />
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item onClick={() => onDownload(file)}>
                        Download as DOCX
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => onDownloadPdf && onDownloadPdf(file)}
                      >
                        Download as PDF
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>

                  <IconButton
                    variant="transparent"
                    className="w-8 h-8 flex items-center justify-center p-0"
                    onClick={() => onRemove(file.id)}
                  >
                    <Trash className="w-5 h-5 text-ui-fg-destructive" />
                  </IconButton>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
