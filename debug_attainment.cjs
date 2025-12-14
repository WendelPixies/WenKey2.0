
const fs = require('fs');

const lines = fs.readFileSync('src/pages/KRCheckins.tsx', 'utf8').split('\n');

lines.forEach((line, index) => {
    if (line.includes('Atingimento:')) {
        console.log(`--- Match at line ${index + 1} ---`);
        for (let i = index; i < index + 10; i++) {
            if (lines[i]) console.log(lines[i]);
        }
    }
});
