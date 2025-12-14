
const fs = require('fs');

const filePath = 'src/pages/KRCheckins.tsx';
let fileContent = fs.readFileSync(filePath, 'utf8');

// Pattern for Attainment in the Modal
// It uses "parseFloat(parseInputValue(formData....))" references
// Regex to catch the calculateAttainment call and the following %
const attainmentRegex = /(\{calculateAttainment\(\s*parseFloat[\s\S]+?currentKR\.direction\s*\))\s*%/g;

// Pattern for KR in the Modal
const krRegex = /(\{calculateKR\(\s*parseFloat[\s\S]+?currentKR\.direction\s*\))\s*%/g;

let modified = false;

// Fix Attainment
if (attainmentRegex.test(fileContent)) {
    fileContent = fileContent.replace(attainmentRegex, (match, p1) => {
        if (match.includes('toFixed(2)')) return match;
        console.log("Fixing Modal Attainment decimal");
        return p1 + ".toFixed(2)}%";
    });
    modified = true;
}

// Fix KR
if (krRegex.test(fileContent)) {
    fileContent = fileContent.replace(krRegex, (match, p1) => {
        if (match.includes('toFixed(2)')) return match;
        console.log("Fixing Modal KR decimal");
        return p1 + ".toFixed(2)}%";
    });
    modified = true;
}

if (modified) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log("Success: Modal decimals updated.");
} else {
    console.log("No changes for Modal decimals (maybe already fixed or regex mismatch).");

    // Debug if failed
    const checkIndex = fileContent.indexOf("parseInputValue(formData.realizado)");
    if (checkIndex !== -1) {
        console.log("Context found:", fileContent.substring(checkIndex - 100, checkIndex + 300));
    }
}
