(function() {
    'use strict';

    const fs = require('fs'),
        path = require('path'),
        stylus = require('stylus'),
        ENCODING = 'utf-8';

    function makeStyl() {
        let thisDir = fs.readdirSync('.'),
            blocks,
            stylFileCode,
            writerCss;

        for(let lvl in thisDir) {
            if(thisDir.hasOwnProperty(lvl) && fs.statSync(thisDir[lvl]).isDirectory() && !(['node_modules', 'build'].indexOf(thisDir[lvl]) !== -1)) {
                blocks = fs.readdirSync(thisDir[lvl]);

                for(let block in blocks) {
                    if(blocks.hasOwnProperty(block)) {
                        try {
                            stylFileCode = fs.readFileSync(path.join(thisDir[lvl], blocks[block], `${blocks[block]}.styl`), ENCODING);
                            
                            stylus(stylFileCode).render(function(err, css) {
                                writerCss = fs.createWriteStream(path.join(thisDir[lvl], blocks[block], `.${blocks[block]}.jn.css`));
                                writerCss.write(css);
                                writerCss.end();
                            });
                        } catch(err) {/*pass*/}
                    }
                }
            }
        }
    }

    if(typeof module !== 'undefined' && module.exports) {
        module.exports = makeStyl;
    }
})();