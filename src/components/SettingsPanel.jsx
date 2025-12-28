import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Text,
  Container,
  Heading,
  FocusModal,
} from "@medusajs/ui";
import { Trash } from "@medusajs/icons";

export function SettingsPanel({ config, onConfigChange, isOpen, onToggle }) {
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onConfigChange({ ...config, headerImage: file });
    }
  };

  const handleTermNameChange = (idx, val) => {
    const newTerms = [...(config.termNames || [])];
    newTerms[idx] = val;
    onConfigChange({ ...config, termNames: newTerms });
  };

  const handleTermsCountChange = (val) => {
    const count = parseInt(val);
    if (isNaN(count) || count < 1) return;

    let newTerms = [...(config.termNames || [])];
    if (count > newTerms.length) {
      // Fill with default names
      for (let i = newTerms.length; i < count; i++) {
        newTerms.push(`Term ${i + 1}`);
      }
    } else {
      newTerms = newTerms.slice(0, count);
    }

    onConfigChange({ ...config, rowsPerStudent: count, termNames: newTerms });
  };

  return (
    <>
      <div className="w-full flex justify-end">
        <Button variant="secondary" onClick={onToggle} className="gap-2">
          Configure Report
        </Button>
      </div>

      <FocusModal open={isOpen} onOpenChange={onToggle}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button
              variant="primary"
              size="small"
              onClick={onToggle}
              className="ml-auto"
            >
              Done
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center py-8 px-4 overflow-y-auto">
            <div className="w-full max-w-2xl space-y-8">
              <div>
                <Heading>Configuration</Heading>
                <Text className="text-ui-fg-subtle">
                  Manage report settings and defaults.
                </Text>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label className="text-ui-fg-subtle text-small">
                    School Name
                  </Label>
                  <Input
                    placeholder="e.g. PODAR WORLD SCHOOL"
                    value={config.schoolName || ""}
                    onChange={(e) =>
                      onConfigChange({ ...config, schoolName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-ui-fg-subtle text-small">
                    Report Title
                  </Label>
                  <Input
                    placeholder="e.g. RESULT ANALYSIS 2025-26"
                    value={config.reportTitle || ""}
                    onChange={(e) =>
                      onConfigChange({ ...config, reportTitle: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-ui-fg-subtle text-small">
                    Header Image
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                  />
                  {config.headerImage && (
                    <Text className="text-xs text-green-600">
                      Image Selected:{" "}
                      {config.headerImage.name || "Custom Image"}
                    </Text>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-ui-fg-subtle text-small">
                    Number of Terms (Rows/Student)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() =>
                        handleTermsCountChange((config.rowsPerStudent || 3) - 1)
                      }
                      disabled={(config.rowsPerStudent || 3) <= 1}
                      className="w-8 h-8 p-0 flex items-center justify-center"
                    >
                      -
                    </Button>
                    <Text className="text-ui-fg-base font-medium w-4 text-center">
                      {config.rowsPerStudent || 3}
                    </Text>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() =>
                        handleTermsCountChange((config.rowsPerStudent || 3) + 1)
                      }
                      className="w-8 h-8 p-0 flex items-center justify-center"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Term Names Dynamic Inputs */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex flex-col">
                    <Label className="text-ui-fg-subtle text-small">
                      Term Names (Fallback)
                    </Label>
                    <Text className="text-xs text-ui-fg-muted mb-2">
                      These names are used if the 3rd column in the CSV (Exam
                      Name) is empty.
                    </Text>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(config.termNames || []).map((term, idx) => (
                      <Input
                        key={idx}
                        value={term}
                        onChange={(e) =>
                          handleTermNameChange(idx, e.target.value)
                        }
                        placeholder={`Term ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </>
  );
}
