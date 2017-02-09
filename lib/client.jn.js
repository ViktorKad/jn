(function() {
    'use strict';

    var ENV = (typeof global !== 'undefined') ? global : window;
    /**
     * _level          Текущий уровень переопределения шаблонов
     * _langStore      Словарь с переводами ({ключ: {язык1: значение, язык2: значение}, ...})
     * _lang           Текущий язык
     * _defaultLang    Язык по умолчанию (ищем в нем, если нет перевода на _lang)
     * _tmpls          Список существующих шаблонов
     * @type {Object}
     */
    ENV.jn = {
        _level: '',
        _langStore: {},
        _lang: 'ru',
        _defaultLang: 'ru',
        _tmpls: {}
    };

    jn.setLangStore = function(langStore) {
        jn._langStore = langStore;
    }

    jn.setLang = function(lang) {
        jn._lang = lang;
    }

    jn.setDefaultLang = function(lang) {
        jn._defaultLang = lang;
    }

    jn.setLevel = function(level) {
        jn._level = level;
    }

    /**
     * Создает шаблон из переданной строки.
     * 
     * @param  {String} name Имя шаблона.
     * @param  {String} tmpl Текст шаблона или функция, его возвращающая.
     * @return {void}
     */
    jn.create = function(name, tmpl) {
        let tmpJn = {};
        tmpJn[jn._level] = String(typeof tmpl === 'function' ? tmpl() : tmpl);

        if (typeof jn._tmpls[name] === 'undefined') {
            jn._tmpls[name] = [];
        }

        /* Нужен именно unshift, чтобы поиск происходил в правильном порядке */
        jn._tmpls[name].unshift(tmpJn);
    }

    /**
     * Раскрывает шаблон, подставляя данные из <i>data</i> в шаблон.
     * Вызывается рекурсивно, для раскрытия шаблона.
     * 
     * @param  {String} tmplCode Текст шаблона.
     * @param  {Object} data     Объект, содержащий поля с данными, для подстановки в шаблон.
     * @return {String}          Текст раскрытого шаблона.
     */
    jn._execDataAndTmpls = function(tmplCode, data) {
        let result = tmplCode,
            REPLACE_PATTERN = /\[%\s{1}[a-zA-Z_\-]+\s%\]/g,
            REPLACE_PATTERN_LANG = /\[%\s{1}[a-zA-Z_-]+:{1}[a-zA-Z0-9_\-\.]+\s%\]/g,
            tmpName, replacable, replacableLang, keyArr;

        replacable = result.match(REPLACE_PATTERN) || [];

        replacable.forEach((item) => {
            var key = item.replace(/\s/g, '');
            key = key.substring(2, key.length - 2);
            
            if (data && data.hasOwnProperty(key)) {
                // Ищем свойство в перданных параметрах
                result = result.replace(new RegExp('\\[%\\s+' + key + '\\s+%\\]', 'g'), data[key]);
            } else if (jn.check(key)) {
                // Ищем шаблон с таким названием
                result = result.replace(new RegExp('\\[%\\s+' + key + '\\s+%\\]', 'g'), jn.read(key));
                return jn._execDataAndTmpls(result, data);
            } else {
                result = result.replace(new RegExp('\\[%\\s+' + key + '\\s+%\\]', 'g'), '');
            }
        });

        replacableLang = result.match(REPLACE_PATTERN_LANG) || [];

        replacableLang.forEach((item) => {
            var key = item.replace(/\s/g, ''),
                tmpTranslate;
            key = key.substring(2, key.length - 2);
            keyArr = key.split(':');

            if (typeof keyArr[1] === 'undefined') {return;}

            if (keyArr[0] === 'lang' && keyArr[1] in jn._langStore) {
                tmpTranslate = jn._langStore[keyArr[1]][jn._lang] || jn._langStore[keyArr[1]][jn._defaultLang] || '';

                result = result.replace(new RegExp('\\[%\\s+' + key + '\\s+%\\]', 'g'), tmpTranslate);
            }
        });

        return result;

    }

    /**
     * Раскрывает шаблон полученный с уровня <i>level</i>;
     *
     * @see jn.exec(name, data)
     * @param  {[type]} name  Имя шаблона.
     * @param  {[type]} level Уровень, с которого хотим получить шаблон. Например 'desktop' или 'common'.
     * @param  {[type]} data  Объект, содержащий поля с данными, для подстановки в шаблон.
     * @return {[type]}       Текст раскрытого шаблона. Или пустую строку, если шаблон не найден.
     */
    jn.execFrom = function(name, level, data) {
        var result = '',
            REPLACE_PATTERN = /\[%\s{1}[a-zA-Z_-]+\s%\]/g,
            tmpName, replacable;
        
        if (typeof jn._tmpls[name] === 'undefined') {
            return result;
        }

        for (var i = 0; i < jn._tmpls[name].length; i++) {
            if (level in jn._tmpls[name][i]) {
                result = jn._execDataAndTmpls(jn._tmpls[name][i][level], data);
                break;
            }
        };

        return result;
    }

    /**
     * Раскрывает шаблон.
     *
     * @see jn._execDataAndTmpls
     * @param  {String} name Имя шаблона.
     * @param  {Object} data Объект, содержащий поля с данными, для подстановки в шаблон.
     * @return {String}      Текст раскрытого шаблона. Или пустую строку, если шаблон не найден.
     */
    jn.exec = function(name, data) {
        var result = '';

        if (typeof jn._tmpls[name] === 'undefined') {
            return result;
        }

        return jn.execFrom(name, Object.keys(jn._tmpls[name][0])[0], data);
    };

    /**
     * Читает шаблон и возвращает его в виде сырого текста.
     * 
     * @param  {String} name  Имя шаблона.
     * @param  {String} level Уровень, с которого хотим получить шаблон. Например 'desktop' или 'common'.
     * @return {String}       Текст шаблона в сыром виде (без изменений).
     */
    jn.readFrom = function(name, level) {
        var result = '';
        
        if (typeof jn._tmpls[name] === 'undefined') {
            return result;
        }

        for (var i = 0; i < jn._tmpls[name].length; i++) {
            if (level in jn._tmpls[name][i]) {
                result = jn._tmpls[name][i][level];
                break;
            }
        };

        return result;
    }

    /**
     * Читает шаблон и возвращает его в виде сырого текста.
     * 
     * @param  {String} name Имя шаблона.
     * @return {String}      Текст шаблона в сыром виде (без изменений).
     */
    jn.read = function(name) {
        return jn.readFrom(name, Object.keys(jn._tmpls[name][0])[0]);
    };

    /**
     * Проверяет, существует ли шаблон с именем <i>name</i>.
     * 
     * @param  {String} name Имя шаблона
     * @return {Boolean}     В случае, если шаблон существует, возвращает true. В противном случае - false.
     */
    jn.check = function(name) {
        return typeof jn._tmpls[name] !== 'undefined';
    }

    if(typeof module !== 'undefined' && module.exports) {
        module.exports = jn;
    }
})();