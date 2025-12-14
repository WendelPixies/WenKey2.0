
const fs = require('fs');

const filePath = 'src/pages/KRCheckins.tsx';
let fileContent = fs.readFileSync(filePath, 'utf8');

let modified = false;

// 1. Fix Modal Attainment
// We search for `calculateAttainment(` ... `currentKR.direction` ... `)}%`
// We want to insert `.toFixed(2)` before `}%`
const attRegex = /\{calculateAttainment\([^}]*?currentKR\.direction\s*\)\}%/gs;

fileContent = fileContent.replace(attRegex, (match) => {
    if (match.includes('toFixed(2)')) return match;
    console.log("Fixing Attainment...");
    return match.slice(0, -2) + ".toFixed(2)}%"; // Remove }% then add .toFixed(2)}%
});

// 2. Fix Modal KR
// We search for `calculateKR(` ... `currentKR.direction` ... `)}%`
const krRegex = /\{calculateKR\([^}]*?currentKR\.direction\s*\)\}%/gs;

fileContent = fileContent.replace(krRegex, (match) => {
    if (match.includes('toFixed(2)')) return match;
    console.log("Fixing KR...");
    return match.slice(0, -2) + ".toFixed(2)}%";
});

fs.writeFileSync(filePath, fileContent, 'utf8');
