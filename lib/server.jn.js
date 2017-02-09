(function() {
    'use strict';

    let ENV = (typeof global !== 'undefined') ? global : window,
        tmplNameStart = '<!--:',
        tmplNameEnd = ':-->',
        tmplNamePattern = new RegExp(tmplNameStart + '[a-zA-Z-_]+' + tmplNameEnd, 'g'),
        jn = null;

    try {
        jn = require('./client.jn.js');
    } catch(err) {
        console.log('Error: No such jn library (file ./lib.jn.js)');
    }

    if(!jn) {
        return;
    }

    /**
     * 
     * @param  {String} jnHtml Текст файла .jn.html
     * @return {String}         Возвращает массив вида [{name: 'имя шаблона', text: 'текст шаблона'}, ...]
     */
    jn.parseHtml = function(jnHtml) {
        let tmplNames = jnHtml.match(tmplNamePattern) || [],
            currentTmplName,
            currentTmplText,
            result = [];

        for (let i = 0; i < tmplNames.length; i++) {
            currentTmplName = readTmpl(tmplNameStart, tmplNameEnd, tmplNames[i]);
            currentTmplText = readTmpl(tmplNames[i], tmplNames[i + 1], jnHtml);

            result.push({name: currentTmplName, text: currentTmplText});
        }

        return result;
    }

    /**
     * Читает часть текста расположенную между <i>startToken</i> и <i>endToken</i>.
     * Если <i>endToken</i> не передан, возвращает текст от позиции <i>startToken</i> до конца текста.
     * 
     * @param  {String} startToken Токен начала чтения.
     * @param  {String} endToken   Токен конца чтения.
     * @param  {String} text       Текст из которого производится чтение.
     * @return {String}            Текст между <i>startToken</i> и <i>endToken</i>, или от <i>startToken</i> до конца текста.
     */
    function readTmpl(startToken, endToken, text) {
        var startPos = text.indexOf(startToken) + startToken.length,
            result;

        if(typeof endToken !== 'string') {
            return text.substring(startPos).trim();
        } else {
            return text.substring(startPos, text.indexOf(endToken)).trim();
        }
    }

    if(typeof module !== 'undefined' && module.exports) {
        module.exports = jn;
    }
})();