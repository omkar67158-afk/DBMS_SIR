const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /#5b3ef0/gi, replace: '#2563eb' },
  { regex: /#5b3fe0/gi, replace: '#2563eb' }, // typo from early on
  { regex: /rgba\(\s*91\s*,\s*62\s*,\s*240\s*,/g, replace: 'rgba(37,99,235,' },
  { regex: /#7c5cfc/gi, replace: '#3b82f6' },
  { regex: /rgba\(\s*124\s*,\s*92\s*,\s*252\s*,/g, replace: 'rgba(59,130,246,' },
  { regex: /#a78bfa/gi, replace: '#60a5fa' },
  { regex: /#4028c7/gi, replace: '#1d4ed8' }
];

function recursivelyReplace(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      recursivelyReplace(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      replacements.forEach(({ regex, replace }) => {
        content = content.replace(regex, replace);
      });
      fs.writeFileSync(fullPath, content);
      console.log('Updated:', fullPath);
    }
  });
}

recursivelyReplace(directoryPath);
console.log('Done!');
