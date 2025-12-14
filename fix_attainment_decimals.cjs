
const fs = require('fs');

const filePath = 'src/pages/KRCheckins.tsx';
let fileContent = fs.readFileSync(filePath, 'utf8');

// Regex to find {calculateAttainment(...)}%
// We use [^}]+ to match arguments inside, assumming no nested curly braces which is typical for these calls.
const regex = /(\{calculateAttainment\([^}]+\))\s*%/g;

let count = 0;
const newContent = fileContent.replace(regex, (match, p1) => {
    count++;
    // p1 is "{calculateAttainment(...)" without the closing brace of the JSX expression presumably?
    // Wait. "{calculateAttainment(...)}" is the block.
    // The previous regex was `(\{calculateKR\([^}]+\))\s*%`.
    // If the string is `{calculateAttainment(a,b)}%`
    // p1 capture depends.

    // Let's refine the regex.
    // We want to match `{calculateAttainment(...)}` literally.
    // Inside it contains `calculateAttainment(...)`.

    // Let's check if there is already a toFixed to avoid double application
    if (match.includes('toFixed(2)')) return match;

    console.log("Found match:", match);
    // Insert .toFixed(2) before the closing curly brace of the JSX expression
    // match is like "{calculateAttainment(args)}%"
    // We want "{calculateAttainment(args).toFixed(2)}%"

    // Find the last '}' before the '%'
    const lastBraceIndex = match.lastIndexOf('}');
    if (lastBraceIndex === -1) return match;

    const beforeBrace = match.substring(0, lastBraceIndex);
    const afterBrace = match.substring(lastBraceIndex); // "}%"

    return beforeBrace + ".toFixed(2)" + afterBrace;
});

if (count > 0) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${count} occurrences of Atingimento display.`);
} else {
    console.log("No matches found.");
    // Debug
    const idx = fileContent.indexOf("calculateAttainment");
    if (idx !== -1) console.log(fileContent.substring(idx, idx + 100));
}
