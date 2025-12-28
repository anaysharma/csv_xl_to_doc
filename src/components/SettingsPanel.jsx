import { useState } from 'react';
import { Button, Input, Label, Text, Container, Heading } from "@medusajs/ui";
import { ParsedSettings } from "../utils/types"; // Assuming TS structure mentally but writing JS
import { Cog6Tooth, XMark } from "@medusajs/icons"

export function SettingsPanel({ config, onConfigChange, isOpen, onToggle }) {
    
    // Local state for header image preview? 
    // Actually we can just pass change up.
    
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
            for(let i = newTerms.length; i < count; i++) {
                newTerms.push(`Term ${i + 1}`);
            }
        } else {
            newTerms = newTerms.slice(0, count);
        }
        
        onConfigChange({ ...config, rowsPerStudent: count, termNames: newTerms });
    }

    if (!isOpen) {
        return (
            <div className="w-full flex justify-end">
                <Button variant="transparent" onClick={onToggle} className="text-ui-fg-subtle gap-2">
                     <Cog6Tooth /> Configure Report
                </Button>
            </div>
        )
    }

    return (
        <div className="w-full border rounded-lg p-4 bg-ui-bg-base shadow-sm space-y-4 mb-4">
            <div className="flex justify-between items-center border-b pb-2 mb-2">
                <Heading level="h2" className="text-ui-fg-base text-md">Configuration</Heading>
                <Button variant="transparent" size="small" onClick={onToggle}>
                    <XMark />
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-ui-fg-subtle text-small">School Name</Label>
                    <Input 
                        placeholder="e.g. PODAR WORLD SCHOOL" 
                        value={config.schoolName || ""}
                        onChange={(e) => onConfigChange({ ...config, schoolName: e.target.value })}
                    />
                </div>
                
                <div className="space-y-2">
                    <Label className="text-ui-fg-subtle text-small">Report Title</Label>
                    <Input 
                        placeholder="e.g. RESULT ANALYSIS 2025-26" 
                        value={config.reportTitle || ""}
                        onChange={(e) => onConfigChange({ ...config, reportTitle: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-ui-fg-subtle text-small">Header Image</Label>
                    <Input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                    />
                    {config.headerImage && (
                        <Text className="text-xs text-green-600">
                            Image Selected: {config.headerImage.name || "Custom Image"}
                        </Text>
                    )}
                </div>

                <div className="space-y-2">
                    <Label className="text-ui-fg-subtle text-small">Number of Terms (Rows/Student)</Label>
                    <Input 
                        type="number" 
                        min={1} 
                        value={config.rowsPerStudent || 3}
                        onChange={(e) => handleTermsCountChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Term Names Dynamic Inputs */}
            <div className="space-y-2 pt-2 border-t">
                 <Label className="text-ui-fg-subtle text-small">Term Names (Fallback)</Label>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(config.termNames || []).map((term, idx) => (
                        <Input 
                            key={idx} 
                            value={term} 
                            onChange={(e) => handleTermNameChange(idx, e.target.value)}
                            placeholder={`Term ${idx+1}`}
                        />
                    ))}
                 </div>
                 <Text className="text-xs text-ui-fg-muted">
                    These names are used if the 3rd column in the CSV (Exam Name) is empty.
                 </Text>
            </div>
        </div>
    );
}
