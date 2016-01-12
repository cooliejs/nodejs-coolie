/**
 * replace html link
 * @author ydr.me
 * @create 2015-12-17 11:14
 */


'use strict';

var fse = require('fs-extra');
var dato = require('ydr-utils').dato;
var path = require('ydr-utils').path;
var debug = require('ydr-utils').debug;
var typeis = require('ydr-utils').typeis;
var encryption = require('ydr-utils').encryption;

var htmlAttr = require('../utils/html-attr.js');
var pathURI = require('../utils/path-uri.js');
var copy = require('../utils/copy.js');
var sign = require('../utils/sign.js');
var reader = require('../utils/reader.js');
var minifyCSS = require('../minify/css.js');
var parseHTML = require('../parse/html.js');


var COOLIE_IGNORE = 'coolieignore';
var CSS_RELS = {
    'stylesheet': true
};
var REG_LINK = /<link\b[\s\S]*?>/ig;
var minifyPathmap = {};
var minifyCSSmap = {};
var resourceMap = {};
var defaults = {
    code: '',
    srcDirname: null,
    destDirname: null,
    destHost: '/',
    destCSSDirname: null,
    destResourceDirname: null,
    versionLength: 32,
    minifyCSS: true,
    cleanCSSOptions: null,
    signCSS: false
};


/**
 * 替换 html script
 * @param file {String} 文件
 * @param options {Object} 配置
 * @param options.code {String} 代码
 * @param options.srcDirname {String} 构建根目录
 * @param options.destDirname {String} 目标根目录
 * @param options.destHost {String} 目标根域
 * @param options.destCSSDirname {String} 目标 CSS 目录
 * @param options.destResourceDirname {String} 目标资源目录
 * @param options.versionLength {Number} 版本号长度
 * @param [options.minifyCSS] {Boolean} 是否压缩 CSS
 * @param [options.minifyResource] {Boolean} 是否压缩静态资源
 * @param [options.cleanCSSOptions] {Object} clean-css 配置
 * @param [options.signCSS] {Boolean} 是否签名 CSS 文件
 * @returns {{code: String, cssList: Array}}
 */
module.exports = function (file, options) {
    options = dato.extend({}, defaults, options);
    var code = options.code;
    var resList = [];
    var cssList = [];

    code = parseHTML(code)
        .use(function (tree) {
            tree.match({
                tag: 'link',
                rel: 'stylesheet'
            }, function (node) {
                if(!node.attrs || !node.attrs.href){
                    return node;
                }

                if(node.attrs.hasOwnProperty(COOLIE_IGNORE)){
                    node.attrs[COOLIE_IGNORE] = null;
                    return node;
                }

                var href = node.attrs.href;

                var srcPath = pathURI.toAbsoluteFile(href, file, options.srcDirname);
                var destPath = minifyPathmap[srcPath];
                var destURI = minifyCSSmap[srcPath];
                resList = resourceMap[srcPath];

                if (!destURI) {
                    var srcCode = reader(srcPath, 'utf8');
                    var destCode = srcCode;

                    if (options.minifyCSS) {
                        var minifyCSSRet = minifyCSS(srcPath, {
                            code: srcCode,
                            cleanCSSOptions: options.cleanCSSOptions,
                            versionLength: options.versionLength,
                            srcDirname: options.srcDirname,
                            destDirname: options.destDirname,
                            destHost: options.destHost,
                            destResourceDirname: options.destResourceDirname,
                            minifyResource: options.minifyResource,
                            replaceCSSResource: true
                        });
                        destCode = minifyCSSRet.code;
                        resList = minifyCSSRet.resList;
                    }

                    var destVersion = encryption.md5(destCode).slice(0, options.versionLength);

                    destPath = path.join(options.destCSSDirname, destVersion + '.css');
                    destURI = pathURI.toRootURL(destPath, options.destDirname);
                    destURI = pathURI.joinURI(options.destHost, destURI);

                    if (options.signCSS) {
                        destCode = sign('css') + '\n' + destCode;
                    }

                    try {
                        fse.outputFileSync(destPath, destCode, 'utf8');
                        minifyPathmap[srcPath] = destPath;
                        minifyCSSmap[srcPath] = destURI;
                        resourceMap[srcPath] = resList;
                        debug.success('√', pathURI.toRootURL(srcPath, options.srcDirname));
                    } catch (err) {
                        debug.error('write file', path.toSystem(destPath));
                        debug.error('write file', err.message);
                        return process.exit(1);
                    }
                }

                cssList.push({
                    destPath: destPath,
                    dependencies: [{
                        srcPath: srcPath,
                        resList: resList
                    }]
                });

                node.attrs.href = destURI;
            });
        })
        .get();

    code = code.replace(REG_LINK, function (source) {
        var ignore = htmlAttr.get(source, COOLIE_IGNORE);

        if (ignore) {
            source = htmlAttr.remove(source, COOLIE_IGNORE);
            return source;
        }

        var rel = htmlAttr.get(source, 'rel');
        var href = htmlAttr.get(source, 'href');

        if (rel === true || !rel) {
            rel = 'stylesheet';
        }

        if (href === true) {
            href = '';
        }

        var isCSSlink = CSS_RELS[rel];

        if (isCSSlink && href) {
            var isRelatived = pathURI.isRelatived(href);

            if (!isRelatived) {
                return source;
            }

            var srcPath = pathURI.toAbsoluteFile(href, file, options.srcDirname);
            var destPath = minifyPathmap[srcPath];
            var destURI = minifyCSSmap[srcPath];
            resList = resourceMap[srcPath];

            if (!destURI) {
                var srcCode = reader(srcPath, 'utf8');
                var destCode = srcCode;

                if (options.minifyCSS) {
                    var minifyCSSRet = minifyCSS(srcPath, {
                        code: srcCode,
                        cleanCSSOptions: options.cleanCSSOptions,
                        versionLength: options.versionLength,
                        srcDirname: options.srcDirname,
                        destDirname: options.destDirname,
                        destHost: options.destHost,
                        destResourceDirname: options.destResourceDirname,
                        minifyResource: options.minifyResource,
                        replaceCSSResource: true
                    });
                    destCode = minifyCSSRet.code;
                    resList = minifyCSSRet.resList;
                }

                var destVersion = encryption.md5(destCode).slice(0, options.versionLength);

                destPath = path.join(options.destCSSDirname, destVersion + '.css');
                destURI = pathURI.toRootURL(destPath, options.destDirname);
                destURI = pathURI.joinURI(options.destHost, destURI);

                if (options.signCSS) {
                    destCode = sign('css') + '\n' + destCode;
                }

                try {
                    fse.outputFileSync(destPath, destCode, 'utf8');
                    minifyPathmap[srcPath] = destPath;
                    minifyCSSmap[srcPath] = destURI;
                    resourceMap[srcPath] = resList;
                    debug.success('√', pathURI.toRootURL(srcPath, options.srcDirname));
                } catch (err) {
                    debug.error('write file', path.toSystem(destPath));
                    debug.error('write file', err.message);
                    return process.exit(1);
                }
            }

            cssList.push({
                destPath: destPath,
                dependencies: [{
                    srcPath: srcPath,
                    resList: resList
                }]
            });

            source = htmlAttr.set(source, 'href', destURI);
            return source;
        }

        return source;
    });

    return {
        code: code,
        cssList: cssList
    };
};


