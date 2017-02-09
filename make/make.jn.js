(function() {
    'use strict';

    if(typeof global === 'undefined') {
        return;
    }

    const ENCODING = 'utf-8',
        BUILD_DIR = 'build',
        LINE_SEPARATOR = require('os').EOL,
        fs = require('fs'),
        path = require('path'),
        jn = require('../lib/server.jn.js');

    let config = getConfig(),
        langStore = getLangStore(),
        tmpProject = {};

    jn.setLangStore(langStore);
    jn.setDefaultLang(config.lang_default);

    function buildAll() {
        let projectText, projectDir, writerHtml;

        try {
            fs.mkdirSync(BUILD_DIR);
        } catch(err) {/*pass*/}


        config.tmpl_levels.forEach((lvlList) => {
            projectDir = `${lvlList.join('-')}`;
            
            try {
                fs.mkdirSync(path.join(BUILD_DIR, projectDir));
            } catch(err) {/*pass*/}

            buildProject(lvlList);

            config.lang_list.forEach((lang) => {
                jn.setLang(lang);
                projectText = jn.exec(config.init_tmpl);

                try {
                    writerHtml = fs.createWriteStream(path.join(BUILD_DIR, projectDir, `index.${lang}.html`));
                    writerHtml.write(projectText);
                    writerHtml.end();
                } catch(err) {/*pass*/}
            });
        });
    }

    function buildProject(tmplLevels) {
        let blocks = [],
            projectDir = `${tmplLevels.join('-')}`,
            writerJs = fs.createWriteStream(path.join(BUILD_DIR, projectDir, 'all.js')),
            writerCss = fs.createWriteStream(path.join(BUILD_DIR, projectDir, 'all.css'));

            try {
                writerJs.write(wrapJs('./node_modules/jn/lib/client.jn.js', fs.readFileSync('./node_modules/jn/lib/client.jn.js', ENCODING)));
            } catch(err) {/*pass*/}

        tmplLevels.forEach((lvl) => {
            let blocksList;

            blocks = [];

            try {
                writerJs.write(`${LINE_SEPARATOR}jn.setLevel('${lvl}');${LINE_SEPARATOR}`);
                blocksList = fs.readdirSync(path.join(lvl));
            } catch(err) {
                return;
            }

            blocksList.forEach((blockName) => {
                createJn(lvl, blockName);
            });
        });

        writerJs.end();
        writerCss.end();

        function createJn(lvl, name) {
            if(blocks.indexOf(name) !== -1) {return;}

            let deps = getDeps(lvl, name),
                pathJnHtml = path.join(lvl, name, `${name}.jn.html`),
                pathCss = path.join(lvl, name, `.${name}.jn.css`),
                cssCode,
                jnHtml,
                jnTmplList;
                

            jn.setLevel(lvl);

            deps.forEach((item) => {
                createJn(lvl, item);
            });

            try {
                jnHtml = fs.readFileSync(pathJnHtml, ENCODING);
            } catch(err) {
                jnHtml = '';
            }

            jnTmplList = jn.parseHtml(jnHtml);

            jnTmplList.forEach((item) => {
                jn.create(item.name, item.text);
            });

            try {
                writerJs.write(wrapJs(pathJnHtml, getClientJnJs(jnTmplList)));
            } catch(err) {/*pass*/}

            evalJnJs(lvl, name);

            writeClientJs(lvl, name);

            try {
                cssCode = fs.readFileSync(pathCss, ENCODING);
                writerCss.write(wrapJs(pathCss, cssCode));
            } catch(err) {/*pass*/}

            blocks.push(name);
        }

        function evalJnJs(lvl, name) {
            let pathJs = path.join(lvl, name, `${name}.jn.js`),
                jnJs;

            try {
                jnJs = fs.readFileSync(pathJs, ENCODING);
                eval(jnJs);
                writerJs.write(wrapJs(pathJs, jnJs));
            } catch(err) {
                return;
            }
        }

        function writeClientJs(lvl, name) {
            let pathJs = path.join(lvl, name, `${name}.js`),
                clientJs;

            try {
                clientJs = fs.readFileSync(pathJs, ENCODING);
                writerJs.write(wrapJs(pathJs, clientJs));
            } catch(err) {
                return;
            }
        }

        function getDeps(lvl, name) {
            try {
                return JSON.parse(
                    fs.readFileSync(path.join(lvl, name, `${name}.deps.json`), ENCODING)
                );
            } catch(err) {/*pass*/}

            return [];
        }
    }

    function getConfig() {
        let CONFIG_FILE = './config.jn.json',
            config = {
                lang_file: 'lang.jn.json',
                lang_default: 'ru',
                lang_list: ['ru'],
                tmpl_levels: [['common', 'desktop']],
                init_tmpl: 'document'
            },
            tmpConfig;

        try {
            tmpConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, ENCODING));
            for(var key in tmpConfig) {
                config[key] = tmpConfig[key];
            }
        } catch(err) {/*pass*/}

        return config;
    }

    function getLangStore() {
        let langStore = {};

        try {
            langStore = JSON.parse(fs.readFileSync(config.lang_file, ENCODING));
        } catch(err) {/*pass*/}

        return langStore;
    }

    function wrapJs(fileName, fileText) {
        return `/*- ${fileName} @ -*/` + LINE_SEPARATOR +
            `${fileText} `+ LINE_SEPARATOR +
            `/*- @ ${fileName} -*/` + LINE_SEPARATOR;
    }

    function getClientJnJs(jnTmplList) {
        return jnTmplList.map((item) => {
            let tmplText = item.text
                .replace(/\'/g, '\\\'')
                .replace(new RegExp(LINE_SEPARATOR, 'g'), `' +${LINE_SEPARATOR}'`)
                .replace(/\r/g, ''); // Убиравем лишние \r, это полезно для файлов созданных в windows (гуглим vim ^M)
            return `${LINE_SEPARATOR}jn.create('${item.name}',${LINE_SEPARATOR}'${tmplText}');`;
        }).join('');
    }

    if(typeof module !== 'undefined' && module.exports) {
        module.exports = buildAll;
    }
})();