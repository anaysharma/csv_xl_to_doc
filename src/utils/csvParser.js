import Papa from "papaparse";
import { read, utils } from "xlsx";

const normalizeScore = (obtained, total) => {
  let obt = parseFloat(obtained);
  if (isNaN(obt)) obt = 0.0;

  let tot = parseFloat(total);
  if (isNaN(tot) || tot === 0) tot = 80.0; // Default or guard div/0

  return (obt / tot) * 80;
};

const processRows = (lines, subjects = [], config = {}) => {
  const students = [];
  const rowsPerStudent = config.rowsPerStudent || 3;
  const defaultTermNames = config.termNames || ["PT I", "TERM I", "PT II"];

  const rowOffsets = Array.from({length: rowsPerStudent}, (_, i) => i);

  // 1. Detect Subjects if not provided
  let headerIdx = -1;
  if (subjects.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const row = lines[i];
      if (!row) continue;

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

      rowOffsets.forEach((offset) => {
        if (i + offset >= lines.length) return;
        const r = lines[i + offset];

        let examName = (r[2] || "").toString().trim();
        if (!examName) {
           examName = defaultTermNames[offset] || `Term ${offset + 1}`;
        }

        const scores = {};
        let col = 3;
        subjects.forEach((subj) => {
          const val = r[col];
          const tot = r[col + 1];
          scores[subj] = normalizeScore(val, tot);
          col += 2;
        });

        studentExams.push({ exam: examName, scores });
      });

      students.push({ s_no: sNo, name, exams: studentExams });
      i += rowsPerStudent;
      continue;
    }
    i++;
  }

  return { students, subjects };
};

export const parseCSV = (file, config = {}) => {
  return new Promise((resolve, reject) => {
    // Check for Excel extension
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (isExcel) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
                
                const { students, subjects } = processRows(jsonData, [], config);
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
          const { students, subjects } = processRows(results.data, [], config);
          resolve({ students, subjects });
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
};

export const parseRows = (rows, config = {}) => {
  return processRows(rows, [], config);
};
