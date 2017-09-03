

const PATH = require("path");
const FS = require("fs-extra");
const LODASH = require("lodash");
const MINIMIST = require("minimist");
const CODEBLOCK = require("codeblock");
const GET_PORT = require("get-port");
const BO = require("bash.origin");


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
            "^/": function (API) {
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

GET_PORT().then(function (PORT) {

    // Write manifest

    const scripts = {};
    const normalizedManifest = config['@github.com~pinf-to~to.pinf.org.mozilla.web-ext'].manifest || {};
    if (
        normalizedManifest.background &&
        normalizedManifest.background.scripts
    ) {
        scripts.background = LODASH.cloneDeep(normalizedManifest.background.scripts);
        delete normalizedManifest.background;
    }

    /*
    if (normalizedManifest["content_security_policy"]) {
        throw new Error("Merge custom content_security_policy!");
    } else {
        normalizedManifest["content_security_policy"] = "script-src 'self' https://localhost:" + PORT + " 'unsafe-eval'; object-src 'self';";
    }
    */



    function replaceInFile (path, variables) {
        var code = FS.readFileSync(path, "utf8");
        Object.keys(variables).forEach(function (name) {
            if (DEBUG) console.log("Replace", "%%%" + name + "%%%", "in", path, "with", variables[name]);
            code = code.replace(new RegExp("%%%" + name + "%%%", "g"), variables[name]);
        });
        FS.writeFileSync(path, code, "utf8");
    }

    if (DEBUG) console.log("scripts", scripts);



    config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"].port = PORT;
    // NOTE: If we enable this, firefox will need SSL cert exception override.
    // TODO: Fix SSL cert exception override by setting config option.
    //config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"].tls = true;

    if (config['@github.com~pinf-to~to.pinf.org.mozilla.web-ext'].routes) {
        Object.keys(config['@github.com~pinf-to~to.pinf.org.mozilla.web-ext'].routes).forEach(function (route) {
            config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"].routes[route] = config['@github.com~pinf-to~to.pinf.org.mozilla.web-ext'].routes[route];
        });
    }

    if (config['@github.com~pinf-to~to.pinf.org.mozilla.web-ext'].expect) {
        config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"].expect = config['@github.com~pinf-to~to.pinf.org.mozilla.web-ext'].expect;
    }


    var scriptFilenames = [];
    scripts.background.forEach(function (script) {

        var scriptFilepath = null;
        var scriptDeclarations = null;
        if (
            typeof script === "object" &&
            Object.keys(script).length === 1
        ) {
            scriptFilepath = Object.keys(script)[0];
            scriptDeclarations = script[scriptFilepath];
        } else {
           scriptFilepath = script;
        }

        if (/\.js$/.test(scriptFilepath)) {
            scriptFilenames.push(scriptFilepath);
        }
        
        if (
            scriptDeclarations &&
            typeof scriptDeclarations === "object" &&
            Object.keys(scriptDeclarations).length === 1
        ) {
            if (/^@/.test(Object.keys(scriptDeclarations)[0])) {

                config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"]
                    .routes["/scripts/" + scriptFilepath] = scriptDeclarations;

                Object.keys(scriptDeclarations).forEach(function (uri) {
                    scriptDeclarations[uri].rootFormat = "pinf";
                    scriptDeclarations[uri].dist = PATH.join(buildBasePath, "scripts", scriptFilepath);
                    scriptDeclarations[uri].prime = true;
                });

            } else {
                console.error("scriptDeclarations", scriptDeclarations);
                throw new Error("'scriptDeclarations' format not supported!");
            }
        } else
        if (/\.js$/.test(scriptFilepath)) {

            config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"].routes["/scripts/" + scriptFilepath] = {
                "@it.pinf.org.browserify#s1": {
                    src: PATH.join(process.cwd(), scriptFilepath),
                    dist: PATH.join(buildBasePath, "scripts", scriptFilepath),
                    format: "pinf",
                    prime: true
                }
            }
        } else
        if (/\.html$/.test(scriptFilepath)) {

            // TODO: Specify 'dist' and 'prime' so we can load files using fileystem from within bundle.
            throw new Error("NYI");

/*
            config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"].routes["/scripts/" + scriptFilepath] = new CODEBLOCK.Codeblock(`

                const FS = require("fs");

                return function (req, res, next) {

                    res.writeHead(200);
                    res.end(FS.readFileSync("${PATH.join(process.cwd(), scriptFilepath)}", "utf8"));
                };
            `, "javascript", [ "API" ]);
*/
        } else {
            throw new Error("Script extension not supported: " + scriptFilepath);
        }
    });


    if (scriptFilenames.length > 0) {
        normalizedManifest.background = {
            "page": "background.html"
        };

        replaceInFile(PATH.join(buildBasePath, "background.js"), {
            "BACKGROUND_SCRIPTS": JSON.stringify(scriptFilenames),
            "RUN_SERVER_HOST": "localhost:" + PORT
        });
    }

    const manifestPath = PATH.join(buildBasePath, "manifest.json");
    const manifest = LODASH.merge(FS.readJSONSync(manifestPath), normalizedManifest);
    if (DEBUG) console.log("manifest", manifest);
    FS.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4), "utf8");


    var source = CODEBLOCK.freezeToSource(config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"]);

    source = CODEBLOCK.purifyCode(source, {
        freezeToJSON: true,
        oneline: true
    });

    source = JSON.stringify(JSON.parse(source));

    process.stdout.write(source + "\n");

}).catch(function (err) {
    console.error(err.stack);
    process.exit(1);
});
