# ประกอบ stepbystep.md จาก template (คำอธิบาย) + โค้ดจริงในโปรเจกต์
# ใช้ (ที่โฟลเดอร์ mtp_po_web): python docs/stepbystep-src/build.py .
# ใน template บรรทัด  @@FILE path/to/file@@  จะถูกแทนด้วย code block ของไฟล์นั้น (โค้ดจริงที่ทดสอบแล้ว)
import os
import re
import sys

ROOT = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
LANG = {
    ".ts": "ts", ".tsx": "tsx", ".mjs": "js", ".js": "js", ".prisma": "prisma", ".sql": "sql",
    ".cs": "csharp", ".csproj": "xml", ".frx": "xml", ".py": "python", ".json": "json",
    ".css": "css", ".md": "md",
}

parts = sorted(f for f in os.listdir(HERE) if re.match(r"^\d\d-.*\.md$", f))
out = []
missing = []
for name in parts:
    with open(os.path.join(HERE, name), encoding="utf-8") as fh:
        for line in fh:
            m = re.match(r"^@@FILE (.+?)@@\s*$", line)
            if not m:
                out.append(line)
                continue
            rel = m.group(1).strip()
            path = os.path.join(ROOT, rel)
            if not os.path.exists(path):
                missing.append(rel)
                out.append(f"> ⚠️ ไม่พบไฟล์ {rel}\n")
                continue
            with open(path, encoding="utf-8") as src:
                code = src.read().rstrip("\n")
            lang = LANG.get(os.path.splitext(rel)[1], "")
            fence = "````" if "```" in code else "```"
            out.append(f"{fence}{lang} title=\"{rel}\"\n{code}\n{fence}\n")

with open(os.path.join(ROOT, "stepbystep.md"), "w", encoding="utf-8", newline="\n") as fh:
    fh.write("".join(out))
print("parts:", len(parts), "lines:", sum(s.count("\n") for s in out), "missing:", missing)
