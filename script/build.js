const path = require('path');
const fs = require('fs');
const markdownLib = require('./lib/index.js');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');

const srcFolder = path.join(__dirname, '../src')
const distFolder = path.join(__dirname, '../dist')

rimraf(distFolder, () => {
    mkdirp.sync(distFolder)
    markdownLib.build(path.join(srcFolder, '**/*.md'), {
        template: true,
        navigation: true
    }, (err, filePath, fileHtml) => {
        if (err) {
            console.log(err);
        } else {
            mkdirp.sync(path.dirname(filePath).replace(srcFolder, distFolder))
            fs.writeFileSync(filePath.replace('.md', '.html').replace(srcFolder, distFolder), fileHtml);
        }
    });
})
