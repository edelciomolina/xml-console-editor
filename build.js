const exe = require('@angablue/exe')

const build = exe({
    entry: './index.js',
    out: '.dist/XMLConsoleEditor.exe',
    pkg: ['-C', 'GZip'],
    target: 'latest-win-x64',
    productVersion: '0.0.2',
    fileVersion: '0.0.2',
    icon: 'index.ico',
    properties: {
        FileDescription: 'XML Console Editor',
        ProductName: 'XML Console Editor',
        LegalCopyright: 'XML Console Editor',
        OriginalFilename: 'XML Console Editor',
    },
})

build.then(() => console.log('Build completed!')).catch(() => null)
