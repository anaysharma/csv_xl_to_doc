import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TextRun,
  AlignmentType,
  VerticalAlign,
  ImageRun,
  HeightRule,
  ShadingType,
  PageBreak,
} from "docx";
import { saveAs } from "file-saver";
import Chart from "chart.js/auto";

// Constants matching Python script
const TEXT_SCHOOL = "PODAR WORLD SCHOOL, BADWAI BHOPAL";
const TEXT_REPORT = "RESULT ANALYSIS 2025-26";
const HIGHLIGHT_COLOR = "CFE2F3"; // Light Blue
const PINK_COLOR = "EAD1DC"; // Pink

// Helper to fetch the header image as ArrayBuffer
const fetchImage = async () => {
  try {
    const response = await fetch("/assets/Picture.png");
    if (!response.ok) throw new Error("Image not found");
    return await response.arrayBuffer();
  } catch (e) {
    console.warn("Header image not found", e);
    return null; // Handle missing image gracefully
  }
};

// Helper: Create Graph Image using Chart.js
const createGraphImage = async (student, subjects) => {
  return new Promise((resolve) => {
    // Create a hidden canvas
    const canvas = document.createElement("canvas");
    canvas.width = 1400; // Match python 14 inch * 100 dpi approx
    canvas.height = 700;
    canvas.style.display = "none";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    // Prepare Data
    const datasets = student.exams.map((exam, i) => {
      const data = subjects.map((subj) => exam.scores[subj] || 0);
      // Colors: Blue, Red, Green, Yellow
      const colors = ["#4285F4", "#EA4335", "#34A853", "#FBBC05"];
      return {
        label: exam.exam,
        data: data,
        backgroundColor: colors[i % colors.length],
        borderColor: "white",
        borderWidth: 2,
      };
    });

    // Chart Config
    const chartConfig = {
      type: "bar",
      data: {
        labels: subjects,
        datasets: datasets,
      },
      options: {
        animation: false,
        responsive: false,
        layout: {
          padding: {
            top: 50, // Legend space
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 90,
            title: {
              display: true,
              text: "Marks (out of 80)",
              font: { size: 24, weight: "bold" },
            },
            ticks: {
              font: { size: 22 },
            },
            grid: {
              display: true,
              drawOnChartArea: true,
              drawTicks: false,
              color: "rgba(0,0,0,0.1)",
            },
          },
          x: {
            ticks: {
              font: { size: 24, weight: "bold" }, // Subject names
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: { size: 26 },
            },
          },
          tooltip: { enabled: false }, // Static image
        },
      },
    };

    // Render
    const chart = new Chart(ctx, chartConfig);

    // Wait a tick for rendering then export
    setTimeout(() => {
      const dataUrl = canvas.toDataURL("image/png");

      // Cleanup
      chart.destroy();
      document.body.removeChild(canvas);

      // Convert DataURL to Blob -> ArrayBuffer for docx
      fetch(dataUrl)
        .then((res) => res.arrayBuffer())
        .then((buffer) => resolve(buffer));
    }, 100);
  });
};

export const generateWordDocument = async (
  students,
  subjects,
  originalFileName,
  config = {},
) => {
  const {
    schoolName = "PODAR WORLD SCHOOL, BADWAI BHOPAL",
    reportTitle = "RESULT ANALYSIS 2025-26",
    headerImage,
  } = config;

  // Determine Class Name from filename (e.g., "Result Sheet - Grade X.csv")
  let baseName = originalFileName.replace(/\.csv$/i, "");
  let className = `CLASS ${baseName.toUpperCase()}`;
  if (baseName.includes(" - ")) {
    const parts = baseName.split(" - ");
    if (parts.length > 1) {
      className = `CLASS ${parts[parts.length - 1].toUpperCase()}`;
    }
  }

  let headerImgBuffer = null;
  if (headerImage) {
    if (typeof headerImage === "string") {
      // Data URL or Path
      if (headerImage.startsWith("data:")) {
        // Convert data URL to buffer
        const res = await fetch(headerImage);
        headerImgBuffer = await res.arrayBuffer();
      } else {
        // Path
        const res = await fetch(headerImage);
        if (res.ok) headerImgBuffer = await res.arrayBuffer();
      }
    } else if (headerImage instanceof File || headerImage instanceof Blob) {
      headerImgBuffer = await headerImage.arrayBuffer();
    }
  } else {
    // Default fallback
    headerImgBuffer = await fetchImage();
  }

  // We build a list of children for the document (sections not typically iterated in this library version in same way)
  // Actually docx library uses 'sections'. Each student is a Page Break usually.
  // However, docx library structure: Document -> sections: [ { children: [] } ]
  // We can put all students in one section with page breaks, or multiple sections.
  // Page break is easier.

  const children = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];

    // --- Header Image ---
    if (headerImgBuffer) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: headerImgBuffer,
              transformation: {
                width: 700, // approx 7.7 inches * 96 dpi
                height: 180,
              },
            }),
          ],
        }),
      );
    }

    // --- School Name ---
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: schoolName, bold: true, size: 28 })], // 14pt = 28 half-pt
      }),
    );

    // --- Report Name ---
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: reportTitle, bold: true, size: 24 })],
      }),
    );

    // --- Class Name ---
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: className, bold: true, size: 24 })],
      }),
    );

    children.push(new Paragraph("")); // Spacer

    // --- Student Info Table (S.No, Name) ---
    // Widths: 1/3 and 2/3 roughly
    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "S. No.: ", bold: true, size: 30 }),
                    new TextRun({ text: `  ${student.s_no}`, size: 30 }),
                  ],
                }),
              ],
              shading: {
                fill: HIGHLIGHT_COLOR,
                type: ShadingType.CLEAR,
                color: "auto",
              },
              width: { size: 33, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Student Name: ",
                      bold: true,
                      size: 30,
                    }),
                    new TextRun({ text: `  ${student.name}`, size: 30 }),
                  ],
                }),
              ],
              shading: {
                fill: HIGHLIGHT_COLOR,
                type: ShadingType.CLEAR,
                color: "auto",
              },
              width: { size: 67, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ],
    });
    children.push(infoTable);
    children.push(new Paragraph(""));

    // --- Marks Table ---
    // Headers: EXAM, Subj1, Subj2...
    // Widths: 20% for Exam, rest divided

    const headerCells = [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "EXAM", bold: true, size: 18 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: PINK_COLOR, type: ShadingType.CLEAR, color: "auto" },
      }),
    ];

    subjects.forEach((subj) => {
      headerCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: subj, bold: true, size: 18 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: PINK_COLOR, type: ShadingType.CLEAR, color: "auto" },
        }),
      );
    });

    const tableRows = [new TableRow({ children: headerCells })];

    // Data Rows
    student.exams.forEach((exam) => {
      const cells = [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: exam.exam, size: 18 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
        }),
      ];

      subjects.forEach((subj) => {
        const val = exam.scores[subj] || 0.0;
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: val.toFixed(1), size: 18 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
        );
      });

      tableRows.push(
        new TableRow({
          children: cells,
          height: { value: 432, rule: HeightRule.AT_LEAST }, // approx 0.3 inch
        }),
      );
    });

    const marksTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    });
    children.push(marksTable);
    children.push(new Paragraph(""));

    // --- Graph ---
    const graphBuffer = await createGraphImage(student, subjects);
    if (graphBuffer) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: graphBuffer,
              transformation: {
                width: 700,
                height: 350,
              },
            }),
          ],
        }),
      );
    }

    // --- Page Break ---
    if (i < students.length - 1) {
      children.push(
        new Paragraph({
          children: [new PageBreak()], // Wait, docx usually handles page breaks via PageBreak object in run or paragraph
        }),
      );
    }
  }

  // Docx PageBreak is tricky in children list.
  // Correct way: new Paragraph({ children: [new PageBreak()] })

  // Let's fix loop to add PageBreak correctly.
  // Actually, simple valid approach:
  const finalChildren = [];
  children.forEach((child, idx) => {
    // If it's a "PageBreak" marker (logic above was pseudo), we handle it.
    // But simply adding `new Paragraph({ children: [new PageBreak()] })` works.
    finalChildren.push(child);
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 20, // 10pt
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 576, // 0.4 inch * 1440 twips (approx 576?) 1 inch = 1440 twips. 0.4 * 1440 = 576
              bottom: 576,
              left: 576,
              right: 576,
            },
          },
        },
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
};

export const saveDocument = (blob, filename) => {
  saveAs(blob, filename.replace(/\.csv$/i, "_Report.docx"));
};

// Helper for PageBreak handled in top imports
