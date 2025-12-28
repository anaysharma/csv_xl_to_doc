import {
  Table,
  IconButton,
  StatusBadge,
  Checkbox,
  Tooltip,
} from "@medusajs/ui";
import { Trash, Eye, ArrowDownTray } from "@medusajs/icons";

export function FileList({
  files,
  selectedFiles,
  onSelect,
  onRemove,
  onPreview,
  onDownload,
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
    <div className="w-full border rounded-lg overflow-hidden">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell className="w-10">
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
              <Table.Cell className="py-2">
                <Checkbox
                  checked={selectedFiles.includes(file.id)}
                  onCheckedChange={() => toggleOne(file.id)}
                />
              </Table.Cell>
              <Table.Cell className="font-medium text-ui-fg-base py-2">
                {file.name}
              </Table.Cell>
              <Table.Cell className="py-2">
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
              <Table.Cell className="text-right py-2">
                <div className="flex justify-end gap-1 items-center h-full">
                  <Tooltip content="Preview Data">
                    <IconButton
                      variant="transparent"
                      size="small"
                      onClick={() => onPreview(file)}
                    >
                      <Eye />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Download Doc">
                    <IconButton
                      variant="transparent"
                      size="small"
                      onClick={() => onDownload(file)}
                      disabled={file.status !== "success"}
                    >
                      <ArrowDownTray />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Remove">
                    <IconButton
                      variant="transparent"
                      size="small"
                      onClick={() => onRemove(file.id)}
                    >
                      <Trash className="text-ui-fg-destructive" />
                    </IconButton>
                  </Tooltip>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
