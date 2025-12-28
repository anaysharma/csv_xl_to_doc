import Papa from "papaparse";
import { read, utils } from "xlsx";

const normalizeScore = (obtained, total) => {
  let obt = parseFloat(obtained);
  if (isNaN(obt)) obt = 0.0;

  let tot = parseFloat(total);
  if (isNaN(tot) || tot === 0) tot = 80.0; // Default or guard div/0

  return (obt / tot) * 80;
};

const processRows = (lines, subjects = []) => {
  const students = [];

  // 1. Detect Subjects if not provided
  // (Here we assume lines is array of arrays if from xlsx, or we need to standardize)

  // Check if lines are strings (csv parse) or arrays (xlsx)
  // Papaparse results.data is array of arrays.

  // Logic extraction
  let headerIdx = -1;
  if (subjects.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const row = lines[i];
      // Safety check for row existence
      if (!row) continue;

      // Check headers - row might be array of values
      // Flexible check:
      const col0 = (row[0] || "").toString().trim();
      const col1 = (row[1] || "").toString().trim();
      const col2 = (row[2] || "").toString().trim();

      if (col0 === "S. No." && col1 === "Student Name" && col2 === "EXAM") {
        headerIdx = i;
        let idx = 3;
        while (idx < row.length) {
          const subjName = (row[idx] || "").toString().trim();
          if (!subjName) break;
          subjects.push(subjName);
          idx += 2;
        }
        break;
      }
    }
    if (headerIdx === -1) {
      // If we can't find header, we might just fail for this sheet
      return { students: [], subjects: [] };
    }
  }

  // 2. Parse Students
  let i = 0;
  while (i < lines.length) {
    const row = lines[i];
    if (!row || row.length === 0) {
      i++;
      continue;
    }

    const sNo = (row[0] || "").toString().trim();

    if (sNo && !isNaN(parseInt(sNo))) {
      const name = (row[1] || "").toString().trim();
      const studentExams = [];

      // We expect 3 rows
      [0, 1, 2].forEach((offset) => {
        if (i + offset >= lines.length) return;
        const r = lines[i + offset];

        let examName = (r[2] || "").toString().trim();
        // Fallback
        if (!examName) {
          if (offset === 0) examName = "PT I";
          else if (offset === 1) examName = "TERM I";
          else if (offset === 2) examName = "PT II";
        }

        const scores = {};
        let col = 3;
        subjects.forEach((subj) => {
          const val = r[col];
          const tot = r[col + 1];
          // normalize expects strings or numbers
          scores[subj] = normalizeScore(val, tot);
          col += 2;
        });

        studentExams.push({ exam: examName, scores });
      });

      students.push({ s_no: sNo, name, exams: studentExams });
      i += 3;
      continue;
    }
    i++;
  }

  return { students, subjects };
};

export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    // Check for Excel extension
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (isExcel) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = read(data, { type: 'array' });
                // We assume data is in the first sheet for single file upload
                // Or we could return all sheets but the current architecture expects one "file" to ensure one report set
                // Let's iterate all sheets and merge them? Or just pick first?
                // The requirements say "Import Google Sheet" -> fetches all sheets.
                // For local Excel upload, file object implies one item in file list.
                // Let's just take the first visible sheet for now to match single CSV behavior,
                // OR we can return multiple datasets, but parseCSV signature expects { students, subjects }.
                // If we want to support multi-sheet Excel, we'd need to change App.jsx logic for "Upload".
                // Let's stick to First Sheet for simple "File Upload" to keep it compatible with "One File -> One Report" visual.
                // (The Google Sheet Logic explicitly creates multiple file entries).
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
                
                const { students, subjects } = processRows(jsonData);
                resolve({ students, subjects });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
        return; 
    }

    // Default to CSV
    Papa.parse(file, {
      complete: (results) => {
        try {
          const { students, subjects } = processRows(results.data);
          resolve({ students, subjects });
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
};

export const parseRows = (rows) => {
  return processRows(rows);
};
