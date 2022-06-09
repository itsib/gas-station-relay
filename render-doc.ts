import { ExtendedSpecConfig, generateSpec } from 'tsoa';
import * as packageJson from './package.json';

(async () => {
  const specOptions: ExtendedSpecConfig = {
    name: 'Plasma Gas Station Relay Server.',
    description: 'The relay server pays for gas for the user\'s transaction, takes ERC 20 tokens.',
    version: packageJson.version,
    basePath: './',
    specFileBaseName: 'plasma-gas-station-api-doc',
    entryFile: 'src/index.ts',
    specVersion: 3,
    outputDirectory: 'public',
    controllerPathGlobs: [
      'src/controllers/*.controller.ts'
    ],
    noImplicitAdditionalProperties: 'throw-on-extras',
    spec: {
      tags: [
        { name: "Info" },
        { name: "Gas" },
      ],
    }
  };

  await generateSpec(specOptions);
})();


// const showdown  = require('showdown');
// const fs = require('fs');
//
// const filePath = `${__dirname}/API-REFERENCE.md`;
// const outputPath = `${__dirname}/src/public/index.html`;
// if (!fs.existsSync(filePath)) {
//   throw new Error('API-REFERENCE.md file not found');
// }
//
// const converter = new showdown.Converter();
// const text = fs.readFileSync(filePath, { encoding: 'utf8' });
//
// const html = `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <title>Plasma Gas Station API reference</title>
//
//   <link rel="stylesheet" href="./styles.css">
// </head>
// <body>
// ${converter.makeHtml(text)}
// </body>
// </html>`;
//
// fs.writeFileSync(outputPath, html);
