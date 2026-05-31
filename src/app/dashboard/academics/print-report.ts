/**
 * Client-side printable Ghana-format report card.
 * Builds a self-contained HTML document from a report card's stored snapshot
 * and opens it in a new window with the print dialog.
 */

export interface ReportSubject {
  subject_name: string;
  ca_score: number;
  ca_max: number;
  ca_pct: number | null;
  exam_score: number;
  exam_max: number;
  exam_pct: number | null;
  final_pct: number;
  grade: string;
  remark: string;
}

export interface ReportCardData {
  student: { id: string; name: string; admission_number: string | null };
  school?: { name?: string };
  term?: { name?: string; academic_year?: string };
  subjects: ReportSubject[];
  summary: {
    average_score: number;
    subjects_count: number;
    overall_position: number | null;
    total_students: number;
    ca_weight: number;
    exam_weight: number;
  };
}

interface PrintMeta {
  schoolName: string;
  className: string;
  generatedAt: string;
  teacherComments: string | null;
  headteacherRemarks: string | null;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function printReportCard(data: ReportCardData, meta: PrintMeta) {
  const school = meta.schoolName || data.school?.name || "School";
  const term = data.term?.name ?? "";
  const year = data.term?.academic_year ?? "";
  const pos = data.summary.overall_position;

  const rows = data.subjects
    .map(
      (s) => `
      <tr>
        <td class="subj">${esc(s.subject_name)}</td>
        <td>${s.ca_pct ?? "—"}</td>
        <td>${s.exam_pct ?? "—"}</td>
        <td class="b">${s.final_pct}</td>
        <td class="b">${esc(s.grade)}</td>
        <td>${esc(s.remark)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8">
  <title>Report Card — ${esc(data.student.name)}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#111;max-width:720px;margin:24px auto;padding:0 16px}
    .head{text-align:center;border-bottom:3px double #333;padding-bottom:10px;margin-bottom:14px}
    .head h1{margin:0;font-size:22px;letter-spacing:.5px}
    .head p{margin:2px 0;color:#555;font-size:13px}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;font-size:13px;margin-bottom:14px}
    .meta div{padding:3px 0;border-bottom:1px dotted #ccc}
    .meta .lbl{color:#666}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{border:1px solid #bbb;padding:6px 8px;text-align:center}
    th{background:#f3f4f6;font-size:12px}
    td.subj{text-align:left;font-weight:600}
    td.b{font-weight:700}
    .summary{display:flex;gap:24px;margin-top:14px;font-size:14px}
    .summary .box{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px;text-align:center}
    .summary .box b{display:block;font-size:20px;margin-top:2px}
    .comments{margin-top:18px;font-size:13px}
    .comments .row{margin-bottom:10px}
    .comments .lbl{color:#666;font-weight:600}
    .comments .line{border-bottom:1px solid #999;min-height:20px;padding:2px 0}
    .sign{display:flex;justify-content:space-between;margin-top:36px;font-size:12px;color:#444}
    .sign div{text-align:center;border-top:1px solid #333;padding-top:4px;width:200px}
    .foot{text-align:center;color:#888;font-size:11px;margin-top:20px}
    @media print{body{margin:0}}
  </style></head>
  <body>
    <div class="head">
      <h1>${esc(school)}</h1>
      <p>Terminal Report Card</p>
      <p>${esc(term)}${year ? ` · ${esc(year)}` : ""}</p>
    </div>

    <div class="meta">
      <div><span class="lbl">Name:</span> <b>${esc(data.student.name)}</b></div>
      <div><span class="lbl">Class:</span> ${esc(meta.className)}</div>
      <div><span class="lbl">Admission No:</span> ${esc(data.student.admission_number ?? "—")}</div>
      <div><span class="lbl">Position:</span> ${pos ? `${ordinal(pos)} of ${data.summary.total_students}` : "—"}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:left">Subject</th>
          <th>Class Score<br>(${data.summary.ca_weight}%)</th>
          <th>Exam<br>(${data.summary.exam_weight}%)</th>
          <th>Total %</th>
          <th>Grade</th>
          <th>Remark</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="6">No subjects scored.</td></tr>`}</tbody>
    </table>

    <div class="summary">
      <div class="box">Overall Average <b>${data.summary.average_score}%</b></div>
      <div class="box">Subjects <b>${data.summary.subjects_count}</b></div>
      <div class="box">Position <b>${pos ? ordinal(pos) : "—"}</b></div>
    </div>

    <div class="comments">
      <div class="row">
        <div class="lbl">Class Teacher's Remarks</div>
        <div class="line">${esc(meta.teacherComments ?? "")}</div>
      </div>
      <div class="row">
        <div class="lbl">Head Teacher's Remarks</div>
        <div class="line">${esc(meta.headteacherRemarks ?? "")}</div>
      </div>
    </div>

    <div class="sign">
      <div>Class Teacher</div>
      <div>Head Teacher</div>
    </div>

    <div class="foot">Grading: A 80+ · B 70-79 · C 60-69 · D 50-59 · E 40-49 · F below 40</div>

    <script>window.onload=function(){window.print();}</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=760,height=900");
  if (!w) { alert("Allow pop-ups to print the report card"); return; }
  w.document.write(html);
  w.document.close();
}
