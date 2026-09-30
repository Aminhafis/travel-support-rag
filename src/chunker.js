import fs from 'fs';
import path from 'path';

/**
 * Reads all .md files in the data directory and splits them into clean chunks.
 * We split each file wherever it sees a "## " (Level 2 heading).
 */
export function loadAndChunkDocuments(dataDir) {
  // 1. Find all .md files inside data/
  const files = fs.readdirSync(dataDir).filter((file) => file.endsWith('.md'));
  const allChunks = [];

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Get the main document title (the first line with #)
    const lines = content.split('\n');
    const mainTitle = lines[0].replace(/^#\s*/, '').trim();

    // 2. Split the document by markdown sections (## Section Heading)
    const sections = content.split(/\n(?=##\s+)/);

    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;

      const sectionLines = trimmed.split('\n');
      const isHeader = sectionLines[0].startsWith('##');

      // The section title (e.g., "Flight Cancellations")
      const sectionTitle = isHeader
        ? sectionLines[0].replace(/^##\s*/, '').trim()
        : mainTitle;

      // The actual text paragraphs under that heading
      const body = isHeader ? sectionLines.slice(1).join('\n').trim() : trimmed;

      if (body) {
        allChunks.push({
          sourceFile: file,
          title: `${mainTitle} - ${sectionTitle}`,
          content: body
        });
      }
    }
  }

  return allChunks;
}

// Quick test: run `node src/chunker.js` to see what chunks look like
if (process.argv[1] && process.argv[1].endsWith('chunker.js')) {
  const testChunks = loadAndChunkDocuments('./data');
  console.log(`✅ Successfully extracted ${testChunks.length} chunks!\n`);
  console.log('Here is what the first chunk looks like:');
  console.log(testChunks[0]);
}