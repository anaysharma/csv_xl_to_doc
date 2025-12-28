import { read, utils } from "xlsx";

export const fetchGoogleSheet = async (url) => {
  // 1. Extract Spreadsheet ID
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("Invalid Google Sheet URL. Could not find Spreadsheet ID.");
  }
  const sheetId = match[1];

  // 2. Fetch as XLSX (which supports multiple sheets)
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch sheet. Ensure it is shared as "Anyone with the link". Status: ${response.status}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  // 3. Parse with SheetJS
  const workbook = read(arrayBuffer);

  // 4. Convert sheets to objects
  const sheets = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    // Parse as array of arrays to match PapaParse output roughly
    const data = utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
      sheets.push({
        name: sheetName,
        data: data, // Array of arrays
      });
    }
  });

  return sheets;
};
