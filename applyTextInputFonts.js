const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const dirs = ['screens', 'components', 'navigation'];
let files = [];
dirs.forEach(d => {
  files = files.concat(walk(path.join(__dirname, d)));
});

files.forEach(file => {
  if (file.includes('AppTextInput.js')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('AppTextInput as TextInput')) return;
  
  const rnImportRegex = /import\s+\{([^}]*)\}\s+from\s+['"]react-native['"];?/g;
  
  let modified = false;
  content = content.replace(rnImportRegex, (match, p1) => {
    const imports = p1.split(',').map(s => s.trim());
    if (imports.includes('TextInput')) {
      modified = true;
      const newImports = imports.map(i => i === 'TextInput' ? 'TextInput as RNTextInput' : i).join(', ');
      
      const relativePath = path.relative(path.dirname(file), path.join(__dirname, 'components', 'AppTextInput'));
      const posixPath = relativePath.split(path.sep).join('/');
      const importPath = posixPath.startsWith('.') ? posixPath : './' + posixPath;
      
      return `import { ${newImports} } from 'react-native';\nimport { AppTextInput as TextInput } from '${importPath}';`;
    }
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
