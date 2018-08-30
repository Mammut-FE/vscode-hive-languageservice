const path = require('path');

module.exports = {
    entry: './src/hiveLanguageService.ts',
    output: {
        path: path.resolve(__dirname, '../lib/esm'),
        library: 'hiveLanguageService',
        filename: 'hiveLanguageService.js',
        globalObject: "this"
    },
    mode: 'production',
    node: {
        fs: 'empty'
    }
};
