/** Regla de dependencias: domain <- application <- adapters <- main. */
const NPM = ['npm', 'npm-dev', 'npm-peer', 'npm-optional', 'core'];

module.exports = {
  forbidden: [
    { name: 'domain-puro', severity: 'error', from: { path: '^src/domain' }, to: { pathNot: '^src/domain' } },
    { name: 'domain-sin-npm', severity: 'error', from: { path: '^src/domain' }, to: { dependencyTypes: NPM } },
    { name: 'application-solo-domain', severity: 'error', from: { path: '^src/application' }, to: { pathNot: '^src/(domain|application)' } },
    { name: 'application-sin-npm', severity: 'error', from: { path: '^src/application' }, to: { dependencyTypes: NPM } },
    { name: 'adapters-no-importan-main', severity: 'error', from: { path: '^src/adapters' }, to: { path: '^src/main' } },
    {
      name: 'adapters-no-se-importan-entre-si',
      comment: 'La UI recibe sus puertos inyectados desde main; los adaptadores no se conocen.',
      severity: 'error',
      from: { path: '^src/adapters/([^/]+/[^/]+)/' },
      to: { path: '^src/adapters/', pathNot: '^src/adapters/$1/' },
    },
    {
      name: 'react-solo-en-ui',
      severity: 'error',
      from: { pathNot: '^src/(adapters/in/ui|main\\.tsx|test-setup)' },
      to: { path: 'node_modules/(react|react-dom)/' },
    },
    { name: 'sin-circulares', severity: 'error', from: {}, to: { circular: true } },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.test(-util)?\\.tsx?$|schema\\.d\\.ts$' },
    moduleSystems: ['es6', 'cjs'],
  },
};
