import { ExtendedSpecConfig, generateSpec } from 'tsoa';
import * as packageJson from './package.json';

(async () => {
  const specOptions: ExtendedSpecConfig = {
    name: 'Plasma Gas Station Relay Server.',
    description: 'The relay server pays for gas for the user\'s transaction, takes ERC 20 tokens.',
    version: packageJson.version,
    basePath: '/',
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
        { name: "Transaction" },
      ],
    }
  };

  await generateSpec(specOptions);
})();
