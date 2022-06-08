const showdown  = require('showdown');
const fs = require('fs');

const filePath = `${__dirname}/API-REFERENCE.md`;
const outputPath = `${__dirname}/src/public/index.html`;

if (!fs.existsSync(filePath)) {
  throw new Error('API-REFERENCE.md file not found');
}

const converter = new showdown.Converter();
const text = fs.readFileSync(filePath, { encoding: 'utf8' });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">  
  <title>Plasma Gas Station API reference</title>
  
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
${converter.makeHtml(text)}
</body>
</html>`;

fs.writeFileSync(outputPath, html);
