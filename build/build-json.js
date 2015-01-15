/*!
 * build-json
 * @author ydr.me
 * @create 2014-10-23 19:36
 */

"use strict";


var fs = require("fs-extra");
var path = require("path");
var log = require("../libs/log.js");
var ydrUtil = require("ydr-util");
var nextStep = require("../libs/next-step.js");
var RE_CLEAN = /[\r\n\t\v"']/g;
var RE_SPACE = /\s+/g;

require("colors");

module.exports = function (basedir) {
    var steps = [];
    var writeFile = path.join(basedir, "./coolie.json");
    var isExist = ydrUtil.typeis.file(writeFile);
    var json = {};
    var jsonString = '';
    var continueStep = function () {
        json.js = {};
        log("1/10", "请输入 JS 入口模块的目录，支持通配符，多个目录使用空格分开，默认为空。", "success");
    };

    // 0
    steps.push(function () {
        log("coolie", "coolie 苦力 builder", "help");
        log("tips", "以下操作留空回车表示同意默认配置。", "warning");
        log("write file", ydrUtil.dato.fixPath(writeFile), "error");
        log("warning", "如果上述目录不正确，请按`ctrl+C`退出后重新指定。", "warning");

        if (isExist) {
            log("warning", "该文件已存在，是否覆盖？（y/[n]）", "warning");
        } else {
            continueStep();
        }
    });

    if (isExist) {
        steps.push(function (data) {
            if (data.toLowerCase().indexOf("y") === -1) {
                process.exit();
            } else {
                continueStep();
            }
        });
    }

    // js.main
    steps.push(function (data) {
        json.js.main = _getVal(data, '', true);

        log("2/10", "请输入发布后 JS 文件所在的域，通常发布线上的 CDN 环境，默认为空。", "success");
    });

    // js.host
    steps.push(function (data) {
        json.js.host = _getVal(data, '', false);

        log("3/10", "请输入生成 CSS 文件的存放目录。", "success");
    });

    // css path
    steps.push(function (data) {
        json.css = {};
        json.css.path = _getVal(data, './static/css/', false);

        log("4/10", "请输入发布后 CSS 文件所在的域，通常发布线上的 CDN 环境，默认为空。", "success");
    });

    // css host
    steps.push(function (data) {
        json.css.host = _getVal(data, '', false);

        log("5/10", "请输入 HTML 文件的目录，支持通配符，多个文件使用空格分开。", "success");

    });

    // html
    steps.push(function (data) {
        json.html = _getVal(data, '', true);

        log("6/10", "请输入 resource 文件的目录，支持通配符，多个文件使用空格分开。", "success");
    });

    // html
    steps.push(function (data) {
        json.res = _getVal(data, '', true);

        log("7/10", "请输入构建的目标目录，默认为“../dest/”。", "success");
    });

    // dest
    steps.push(function (data) {
        json.dest = _getVal(data, '../dest/', false);

        log("8/10", "请输入`coolie.js`的路径，默认为“./static/js/coolie.js”：" +
        "\n`coolie.js`是模块加载器的主文件。", "success");
    });

    // coolie.js
    steps.push(function (data) {
        json['coolie.js'] = _getVal(data, './static/js/coolie.js', false);

        log("9/10", "请输入`coolie-config.js`的路径，默认为“./static/js/coolie-config.js”：" +
        "\n`coolie-config.js`是模块入口及版本号的配置文件。", "success");
    });

    // coolie-config.js
    steps.push(function (data) {
        json['coolie-config.js'] = _getVal(data, './static/js/coolie-config.js', false);

        log("10/10", "请输入构建时需要原样复制的文件目录，支持通配符，多个入口使用空格分开，默认为复制所有文件。", "success");
    });

    // copy
    steps.push(function (data) {
        json.copy = _getVal(data, './**/*.*', true);
        jsonString = JSON.stringify(json, null, 4);

        log("confirm", "文件内容为：", "success");
        log('coolie.json', jsonString, 'success');
        log("confirm", "确认文件内容正确并生成文件？（[y]/n）", "warning");
    });

    // write
    steps.push(function (data) {
        if (data.trim().toLocaleLowerCase().indexOf("n") === -1) {
            fs.outputFile(writeFile, jsonString, "utf-8", function (err) {
                if (err) {
                    log("write", ydrUtil.dato.fixPath(writeFile), "error");
                    return process.exit();
                }

                log("write", ydrUtil.dato.fixPath(writeFile), "success");
                process.exit();
            });
        } else {
            process.exit();
        }
    });

    nextStep(steps);
};


/**
 * 获取输入内容
 * @param data
 * @param dft
 * @param isArray
 * @returns {Array|string|*}
 * @private
 */
function _getVal(data, dft, isArray) {
    var input = data.replace(RE_CLEAN, "").trim() || dft;

    return isArray ? input.split(RE_SPACE) : input;
}

