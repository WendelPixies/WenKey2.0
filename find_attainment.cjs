
const fs = require('fs');

const lines = fs.readFileSync('src/pages/KRCheckins.tsx', 'utf8').split('\n');

lines.forEach((line, index) => {
    if (line.includes('Atingimento:')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
        console.log(`Context: ${lines[index + 1] ? lines[index + 1].trim() : ''}`);
    }
});
