
const fs = require('fs');

const filePath = 'src/pages/KRCheckins.tsx';
let fileContent = fs.readFileSync(filePath, 'utf8');

// The output from the previous run showed the context was slightly different or fragmented in my regex imagination.
// Output: "t(parseInputValue(formData.realizado)) || 0,"
// Let's print the specific block again to be sure.

const targetString = "parseFloat(parseInputValue(formData.realizado)) || 0,";
const idx = fileContent.indexOf(targetString);

if (idx !== -1) {
    // Go back to find the start of component function or surrounding div
    console.log(fileContent.substring(idx - 200, idx + 400));
} else {
    console.log("Could not find target string.");
}
