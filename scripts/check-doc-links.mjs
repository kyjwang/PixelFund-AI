import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const files = [path.join(root, "README.md")];

for (const file of fs.readdirSync(docsDir)) {
  if (file.endsWith(".md")) files.push(path.join(docsDir, file));
}

const mdLinkRegex = /\[[^\]]+\]\(([^)]+)\)/g;
const failures = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const match of content.matchAll(mdLinkRegex)) {
    const raw = match[1];
    if (!raw || raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("#")) continue;
    const clean = raw.split("#")[0];
    const target = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(target)) {
      failures.push(`${path.relative(root, file)} -> ${raw}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Broken markdown links found:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(`Link check passed for ${files.length} markdown files.`);
