import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  VerticalAlign,
  TableLayoutType,
  ShadingType,
  LevelFormat
} from "docx";
import { saveAs } from "file-saver";

const CONTENT_WIDTH_DXA = 9026; // A4 width minus 1 inch margins on both sides

export async function exportToDocx(markdown: string, clientName: string, type: 'informe' | 'contrato' = 'informe') {
  const lines = markdown.split(/\r?\n/);
  const children: any[] = [];

  // Title (Heading 1 equivalent)
  const title = type === 'informe' ? "INFORME TÉCNICO DE ASESORÍA PREVISIONAL" : "CONTRATO DE PRESTACIÓN DE SERVICIOS DE ASESORÍA PREVISIONAL";
  
  children.push(new Paragraph({
    children: [new TextRun({ 
      text: title, 
      bold: true, 
      size: 32,
      font: "Arial"
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 }
  }));

  if (type === 'informe') {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: "CLIENTE: ", bold: true, size: 22, font: "Arial" }),
        new TextRun({ text: (clientName || "Sin Nombre").toUpperCase(), size: 22, font: "Arial" })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }));
  }

  let currentTable: string[][] = [];
  let inTable = false;

  const flushTable = () => {
    if (currentTable.length > 0) {
      // Improved separator row detection
      const isSeparatorRow = (row: string[]) => 
        row.every(cell => {
          const trimmed = cell.trim();
          return trimmed === "" || /^[ \-:]+$/.test(trimmed);
        });

      const validRows = currentTable.filter(row => !isSeparatorRow(row));
      
      if (validRows.length > 0) {
        const columnCount = Math.max(...validRows.map(row => row.length));
        
        // Detect if it's a signature table (transparent)
        const isSignatureTable = type === 'contrato' && validRows.some(row => 
          row.some(cell => cell.includes("ASESOR PREVISIONAL") || cell.includes("CONSULTANTE"))
        );

        // Calculate column widths
        let columnWidths: number[] = [];
        if (columnCount === 2) {
          columnWidths = [CONTENT_WIDTH_DXA * 0.50, CONTENT_WIDTH_DXA * 0.50];
        } else {
          const equalWidth = CONTENT_WIDTH_DXA / columnCount;
          columnWidths = Array(columnCount).fill(equalWidth);
        }

        const table = new Table({
          width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
          columnWidths: columnWidths,
          layout: TableLayoutType.FIXED,
          borders: isSignatureTable ? {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          } : {
            top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
          rows: validRows.map((row, rowIndex) => {
            const cells = [...row];
            while (cells.length < columnCount) cells.push("");

            return new TableRow({
              children: cells.map((cell, cellIndex) => {
                const isHeader = !isSignatureTable && rowIndex === 0;
                return new TableCell({
                  width: { size: columnWidths[cellIndex], type: WidthType.DXA },
                  children: [new Paragraph({
                    children: [new TextRun({ 
                      text: cell.trim().replace(/[\*_]/g, ""), 
                      bold: isHeader || (isSignatureTable && rowIndex === 0),
                      size: 22, // 11pt
                      font: "Arial"
                    })],
                    alignment: isHeader || isSignatureTable ? AlignmentType.CENTER : AlignmentType.LEFT,
                    spacing: { before: 100, after: 100 }
                  })],
                  shading: isHeader ? { 
                    fill: "F2F2F2",
                    type: ShadingType.CLEAR
                  } : undefined,
                  verticalAlign: VerticalAlign.CENTER,
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  borders: isSignatureTable ? {
                    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  } : undefined
                });
              })
            });
          })
        });
        children.push(table);
        children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      }
      currentTable = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Simplified Table Detection: Only lines starting with |
    const hasPipes = line.startsWith("|");

    if (hasPipes) {
      inTable = true;
      const cells = line
        .split("|")
        .map(c => c.trim())
        .filter((c, idx, arr) => {
          if (idx === 0 && c === "" && arr.length > 1) return false;
          if (idx === arr.length - 1 && c === "" && arr.length > 1) return false;
          return true;
        });
      
      if (cells.length > 0) {
        currentTable.push(cells);
      }
      continue;
    } else {
      if (inTable) {
        flushTable();
        inTable = false;
      }
    }

    // Headings
    if (line.startsWith("## ")) {
      children.push(new Paragraph({
        text: line.replace("## ", "").replace(/[\*_]/g, ""),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }));
    } else if (line.startsWith("### ")) {
      children.push(new Paragraph({
        text: line.replace("### ", "").replace(/[\*_]/g, ""),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 300, after: 150 }
      }));
    } else if (line.startsWith("#### ")) {
      children.push(new Paragraph({
        text: line.replace("#### ", "").replace(/[\*_]/g, ""),
        heading: HeadingLevel.HEADING_4,
        spacing: { before: 200, after: 100 }
      }));
    } else if (line.match(/^[\*\-]\s+/)) {
      const cleanLine = line.replace(/^[\*\-]\s+/, "");
      const parts = cleanLine.split("**");
      const textRuns = parts.map((part, index) => new TextRun({
        text: part.replace(/[\*_]/g, ""),
        bold: index % 2 !== 0,
        size: 22,
        font: "Arial"
      }));

      children.push(new Paragraph({
        children: textRuns,
        numbering: {
          reference: "my-bullet-points",
          level: 0,
        },
        spacing: { after: 120 }
      }));
    } else if (line !== "" && !line.startsWith("---")) {
      const parts = line.split("**");
      const textRuns = parts.map((part, index) => new TextRun({
        text: part.replace(/[\*_]/g, ""),
        bold: index % 2 !== 0,
        size: 22,
        font: "Arial"
      }));

      children.push(new Paragraph({
        children: textRuns,
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED
      }));
    }
  }

  if (inTable) flushTable();

  // --- PIE DE FIRMA (Solo en DOCX) ---
  if (type === 'informe') {
    children.push(new Paragraph({ text: "", spacing: { before: 1200 } })); // Espacio antes de la firma

    // Bloque Asesor (Centrado)
    children.push(new Paragraph({
      children: [new TextRun({ text: "LUIS MAURICIO BARRÍA CHODIL", bold: true, size: 22, font: "Arial" })],
      alignment: AlignmentType.CENTER,
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: "9.319.028-9", bold: true, size: 22, font: "Arial" })],
      alignment: AlignmentType.CENTER,
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: "ASESOR PREVISIONAL", size: 20, font: "Arial" })],
      alignment: AlignmentType.CENTER,
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: "Rep. Legal Entidad de Asesoria Previsional Asesoriapensiones.cl SPA", size: 18, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 } // Espacio entre el asesor y el recibo
    }));

    // Bloque Recibo (Izquierda)
    children.push(new Paragraph({
      children: [new TextRun({ text: "Acuso recibo de Informe:", size: 22, font: "Arial" })],
      alignment: AlignmentType.LEFT,
      spacing: { after: 600 }
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: "Firma:_____________________", size: 22, font: "Arial" })],
      alignment: AlignmentType.LEFT,
      spacing: { after: 600 }
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: "Rut:_______________________", size: 22, font: "Arial" })],
      alignment: AlignmentType.LEFT,
    }));
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "my-bullet-points",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              alignment: AlignmentType.LEFT,
              text: "\u2022",
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "Arial", size: 22 },
          paragraph: { spacing: { line: 276, before: 0, after: 120 } }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, color: "000000", font: "Arial" },
          paragraph: { 
            spacing: { before: 400, after: 200 }
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, color: "000000", font: "Arial" },
          paragraph: { spacing: { before: 300, after: 150 } }
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = type === 'informe' 
    ? `Informe_Final_${clientName || "Sin Nombre"}.docx`
    : `Contrato_${clientName || "Sin Nombre"}.docx`;
  saveAs(blob, fileName);
}
