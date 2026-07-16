const ts = require("typescript");
const fs = require("fs");
const text = fs.readFileSync("app/admin/tickets/page.tsx","utf8");
const src = ts.createSourceFile("page.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = src.parseDiagnostics.map(d => ({
  start: d.start,
  length: d.length,
  code: d.code,
  message: ts.flattenDiagnosticMessageText(d.messageText, " ")
}));
console.log(JSON.stringify(diagnostics,null,2));
const positions = diagnostics.map(d => d.start);
for (const pos of positions) {
  const before = text.slice(0, pos);
  const line = before.split(/\r?\n/).length;
  const col = before.split(/\r?\n/).pop().length + 1;
  const start = Math.max(0, pos - 120);
  const end = Math.min(text.length, pos + 120);
  console.log(`POS ${pos} LINE ${line} COL ${col}`);
  console.log('---');
  console.log(text.slice(start, end));
  console.log('---');
}
