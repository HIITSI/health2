import { zipSync, strToU8 } from "fflate";
export type Cell = string | number | null | boolean;
export function csvCell(value: Cell) {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@\t\r\n]/.test(text))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function csv(rows: Cell[][]) {
  return (
    "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"
  );
}
const xml = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
function col(n: number): string {
  let s = "";
  for (n++; n; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
export function xlsx(rows: Cell[][]) {
  const sheet = rows
    .map(
      (r, i) =>
        `<row r="${i + 1}">${r
          .map((v, j) => {
            const ref = `${col(j)}${i + 1}`;
            if (v === null) return `<c r="${ref}"/>`;
            if (typeof v === "number" && Number.isFinite(v))
              return `<c r="${ref}"><v>${v}</v></c>`;
            if (typeof v === "boolean")
              return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
            return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(String(v))}</t></is></c>`;
          })
          .join("")}</row>`,
    )
    .join("");
  const parts: { [key: string]: string } = {
    "[Content_Types].xml": `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="FitLog 기록" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`,
  };
  return zipSync(
    Object.fromEntries(
      Object.entries(parts).map(([k, v]) => [
        k,
        strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + v),
      ]),
    ),
    { level: 6 },
  );
}
