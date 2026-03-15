#!/usr/bin/env node
/**
 * Disable all logging service calls by commenting them out
 * This fixes ERR_CONNECTION_REFUSED errors for 127.0.0.1:7244
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

const files = glob.sync("src/**/*.{ts,tsx}");

let totalDisabled = 0;

for (const file of files) {
  let content = readFileFileSync(file, "utf-8");
  const originalContent = content;
  
  // Comment out fetch calls to logging service
  content = content.replace(
    /fetch\s*\(\s*["']http:\/\/127\.0\.0\.1:7244\/ingest[^"']+["'][^)]*\)/gs,
    (match) => {
      // Check if already commented
      if (match.trim().startsWith("//")) return match;
      return `// Disabled: logging service not available\n      // ${match}`;
    }
  );
  
  if (content !== originalContent) {
    writeFileSync(file, content, "utf-8");
    totalDisabled++;
    console.log(`✅ Disabled logging in: ${file}`);
  }
}

console.log(`\n✅ Disabled logging service calls in ${totalDisabled} files`);

