

const PATH = require("path");
const FS = require("fs-extra");
const LODASH = require("lodash");
const MINIMIST = require("minimist");
const CODEBLOCK = require("codeblock");


const DEBUG = process.env.DEBUG_WEB_EXT_BUILDER || false;


var logOrig = console.log;
console.log = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[to.pinf.org.mozilla.web-ext:builder]");
    return logOrig.apply(console, args);
}


const ARGS = MINIMIST(process.argv.slice(2));

if (DEBUG) console.log("ARGS", ARGS);


const CONFIG = JSON.parse(ARGS._.shift());

const buildBasePath = PATH.join(process.cwd(), ".rt/github.com~pinf-to~to.pinf.org.mozilla.web-ext/extension.built");
const templateBasePath = PATH.join(__dirname, "../tpl/default");

if (DEBUG) console.log("buildBasePath", buildBasePath);


var config = {};
LODASH.merge(config, {
    "@github.com~pinf-to~to.pinf.org.mozilla.web-ext": CONFIG
}, {
    "@github.com~pinf-it~it.pinf.org.mozilla.web-ext": {
        "homepage": "/",
        "extension": buildBasePath,
        "browserConsole": true,
        "firefoxVersion": "firefoxdeveloperedition",
        "verbose": true,
        "routes": {
            "/": function (API) {
                return function (req, res, next) {
                    res.end('OK');
                };
            }
        }
    }
});

if (DEBUG) console.log("config", config);


// Remove existing

if (FS.existsSync(buildBasePath)) {
    FS.removeSync(buildBasePath);
}

// Copy base template
// TODO: Only copy what is needed.

FS.copySync(templateBasePath, buildBasePath);

// Copy dependencies

FS.copySync(
    PATH.join(require.resolve("pinf-for-mozilla-web-ext/package.json"), '../scripts'),
    PATH.join(buildBasePath, ".lib/github.com~pinf~pinf-for-mozilla-web-ext/scripts"),
    {
        dereference: true
    }
);


// Write manifest

const scripts = {};
const normalizedManifest = config['@github.com~pinf-to~to.pinf.org.mozilla.web-ext'].manifest || {};
if (
    normalizedManifest.background &&
    normalizedManifest.background.scripts
) {
    scripts.background = LODASH.cloneDeep(normalizedManifest.background.scripts);
    delete normalizedManifest.background.scripts;
}

const manifestPath = PATH.join(buildBasePath, "manifest.json");
const manifest = LODASH.merge(FS.readJSONSync(manifestPath), normalizedManifest);
if (DEBUG) console.log("manifest", manifest);
FS.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4), "utf8");


function replaceInFile (path, variables) {
    var code = FS.readFileSync(path, "utf8");
    Object.keys(variables).forEach(function (name) {
        if (DEBUG) console.log("Replace", "%%%" + name + "%%%", "in", path, "with", variables[name]);
        code = code.replace(new RegExp("%%%" + name + "%%%", "g"), variables[name]);
    });
    FS.writeFileSync(path, code, "utf8");
}

if (DEBUG) console.log("scripts", scripts);


replaceInFile(PATH.join(buildBasePath, "background.js"), {
    "BACKGROUND_SCRIPTS": JSON.stringify(scripts.background || [])
});


var source = CODEBLOCK.freezeToSource(config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"]);

var source = CODEBLOCK.purifyCode(source, {
    freezeToJSON: true,
    oneline: true
});

source = JSON.stringify(JSON.parse(source));

process.stdout.write(source + "\n");
