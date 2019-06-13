
const LIB = require("bash.origin.lib").forPackage(__dirname).js;


const PATH = LIB.path;
const FS = LIB.FS_EXTRA;
const LODASH = LIB.LODASH;
const MINIMIST = LIB.MINIMIST;
const CODEBLOCK = LIB.CODEBLOCK;
const GET_PORT = LIB.GET_PORT;
const BO = LIB.BASH_ORIGIN;


const DEBUG = process.env.DEBUG_WEB_EXT_BUILDER || false;


var logOrig = console.log;
console.log = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[to.pinf.org.mozilla.web-ext:builder]");
    return logOrig.apply(console, args);
}


const ARGS = MINIMIST(process.argv.slice(2));

if (DEBUG) console.log("ARGS", ARGS);


var CONFIG = JSON.parse(ARGS._.shift());
var ACTIVE_BRANCH = ARGS._.shift();


const buildBasePath = CONFIG.manifest.dist || PATH.join(process.cwd(), ".~rt/github.com~pinf-to~to.pinf.org.mozilla.web-ext/extension.built");
delete CONFIG.manifest.dist;

const templateBasePath = PATH.join(__dirname, "../tpl/default");

if (DEBUG) console.log("buildBasePath", buildBasePath);
if (DEBUG) console.log("templateBasePath", templateBasePath);


var config = {};
LODASH.merge(config, {
    "@github.com~pinf-to~to.pinf.org.mozilla.web-ext": {
        manifest: CONFIG.manifest
    }
}, {
    "@github.com~pinf-it~it.pinf.org.mozilla.web-ext": {
        "homepage": "/",
        "extension": buildBasePath,
        "browserConsole": true,
        "firefoxVersion": "firefox",
//        "firefoxVersion": "firefoxdeveloperedition",
        "verbose": true,
        "routes": {}
    }
}, {
    "@github.com~pinf-it~it.pinf.org.mozilla.web-ext": CONFIG
});

delete config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"].manifest;


CONFIG = null;

if (DEBUG) console.log("config", config);



// Remove existing

if (FS.existsSync(buildBasePath)) {
    FS.removeSync(buildBasePath);
}

// Copy base template
// TODO: Only copy what is needed.

FS.copySync(templateBasePath, buildBasePath);
FS.unlinkSync(PATH.join(buildBasePath, "scripts/devtools-panel.html"));
FS.unlinkSync(PATH.join(buildBasePath, "scripts/devtools-panel.js"));

// Copy dependencies

FS.copySync(
    PATH.join(LIB.resolve("pinf-for-mozilla-web-ext/package.json"), '../scripts'),
    PATH.join(buildBasePath, "lib/github.com~pinf~pinf-for-mozilla-web-ext/scripts"),
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

    if (
        normalizedManifest.content &&
        normalizedManifest.content.scripts
    ) {
        scripts.content = LODASH.cloneDeep(normalizedManifest.content.scripts);
        delete normalizedManifest.content;
    }

    if (normalizedManifest.devtools) {
        scripts.devtools = LODASH.cloneDeep(normalizedManifest.devtools);
        delete normalizedManifest.devtools;
    }

    /*
    if (normalizedManifest["content_security_policy"]) {
        throw new Error("Merge custom content_security_policy!");
    } else {
        normalizedManifest["content_security_policy"] = "script-src 'self' https://localhost:" + PORT + " 'unsafe-eval'; object-src 'self';";
    }
    */
    if (normalizedManifest["content_security_policy"]) {
        normalizedManifest["content_security_policy"] = normalizedManifest["content_security_policy"].replace(/%%%PORT%%%/g, PORT);
    }


    if (normalizedManifest.icons) {
        Object.keys(normalizedManifest.icons).forEach(function (size) {
            var path = "skin/__icon_" + size + "." + normalizedManifest.icons[size].split(".").pop();
            FS.copySync(normalizedManifest.icons[size], PATH.join(buildBasePath, path));
            normalizedManifest.icons[size] = path;
        });
    }


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


    var scriptFilenames = {};

    function mapScript (scriptType, script) {

        if (process.env.VERBOSE) console.log("mapScript()", scriptType, script);

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

        if (process.env.VERBOSE) console.log("scriptFilepath", scriptFilepath);
        if (process.env.VERBOSE) console.log("scriptDeclarations", scriptDeclarations);
        
        if (/\.js$/.test(scriptFilepath)) {
            if (!scriptFilenames[scriptType]) {
                scriptFilenames[scriptType] = [];
            }

            if (scriptType === "devtools_panels") {

                if (scriptDeclarations.icon) {
                    var sourcePath = scriptDeclarations.icon || PATH.join(templateBasePath, "skin/box.png");
                    sourcePath = /^\//.test(sourcePath) ? sourcePath : PATH.join(process.cwd(), sourcePath);
                    // TODO: Make this more unique
                    scriptDeclarations.icon = "skin/__icon_devtools_panel_" + PATH.basename(sourcePath);
                    var targetPath = PATH.join(buildBasePath, scriptDeclarations.icon);

                    FS.copySync(
                        sourcePath,
                        targetPath
                    );
                }

                scriptFilenames[scriptType].push({
                    label: scriptDeclarations.label || "My Panel",
                    icon: scriptDeclarations.icon,
                    filename: scriptFilepath.replace(/\.js$/, ".html")
                });

            } else {
                scriptFilenames[scriptType].push(scriptFilepath);                
            }
        }

        if (
            scriptDeclarations &&
            scriptDeclarations.code
        ) {
            scriptDeclarations = scriptDeclarations.code;

            scriptDeclarations = JSON.parse(
                JSON.stringify(scriptDeclarations)
                    .replace(/%%%PORT%%%/g, PORT)
            );
        }

        if (process.env.VERBOSE) console.log("scriptFilenames[scriptType]", scriptFilenames[scriptType]);

        if (
            scriptDeclarations &&
            typeof scriptDeclarations === "object" &&
            Object.keys(scriptDeclarations).length === 1
        ) {
                        
            if (/^@/.test(Object.keys(scriptDeclarations)[0])) {

                config["@github.com~pinf-it~it.pinf.org.mozilla.web-ext"]
                    .routes["/scripts/" + scriptFilepath] = scriptDeclarations;

                Object.keys(scriptDeclarations).forEach(function (uri) {
                    // TODO: Use a namespace for these properties.
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

        return {
            scriptFilepath: scriptFilepath
        };
    }


    if (scripts.devtools) {

        if (scripts.devtools.page) {
            mapScript("devtools_page", scripts.devtools.page);
        }

        if (scripts.devtools.panels) {
            scripts.devtools.panels.forEach(function (panel) {

                var info = mapScript("devtools_panels", panel);

                FS.copySync(
                    PATH.join(templateBasePath, "scripts/devtools-panel.html"),
                    PATH.join(buildBasePath, "scripts", info.scriptFilepath.replace(/\.js/, ".html"))
                );

                replaceInFile(PATH.join(buildBasePath, "scripts", info.scriptFilepath.replace(/\.js/, ".html")), {
                    "PANEL_SCRIPT_NAME": info.scriptFilepath.replace(/\.js$/, ""),
                    "PANEL_LOADER_SCRIPT_FILENAME": PATH.basename(info.scriptFilepath).replace(/\.js$/, ".loader.js")
                });

                FS.copySync(
                    PATH.join(templateBasePath, "scripts/devtools-panel.js"),
                    PATH.join(buildBasePath, "scripts", info.scriptFilepath.replace(/\.js/, ".loader.js"))
                );

                replaceInFile(PATH.join(buildBasePath, "scripts", info.scriptFilepath.replace(/\.js/, ".loader.js")), {
                    "PANEL_SCRIPT_FILENAME": PATH.basename(info.scriptFilepath)
                });
            });
        }

        normalizedManifest.devtools_page = "devtools-page.html";
        //replaceInFile(PATH.join(buildBasePath, "devtools-page.html"), {
        //    "PANEL_SCRIPT_NAME": info.scriptFilepath.replace(/\.js$/, "")
        //});

        replaceInFile(PATH.join(buildBasePath, "devtools-page.js"), {
            "DEVTOOLS_SCRIPTS": JSON.stringify(scriptFilenames["devtools_page"] || []),
            "DEVTOOLS_PANELS": JSON.stringify(scriptFilenames["devtools_panels"] || []),
            "RUN_SERVER_HOST": "localhost:" + PORT
        });
    } else {
        FS.unlinkSync(PATH.join(buildBasePath, "devtools-page.html"));
        FS.unlinkSync(PATH.join(buildBasePath, "devtools-page.js"));                        
    }
    
    if (scripts.content) {
        
        var matches = [];
        scripts.content.forEach(function (script) {
            matches = matches.concat(script.matches);
            mapScript("content", script.js);
        });

        normalizedManifest.content_scripts = [
            {
                "matches": matches,
                "js": [
                    "lib/github.com~pinf~pinf-for-mozilla-web-ext/scripts/lib/babel-regenerator-runtime.js",
                    "lib/github.com~pinf~pinf-for-mozilla-web-ext/scripts/lib/pinf-loader-full.browser.js",
                    "lib/github.com~pinf~pinf-for-mozilla-web-ext/scripts/loader.js",
                    "content-script.js"
                ]
            }
        ];

        replaceInFile(PATH.join(buildBasePath, "content-script.js"), {
            "CONTENT_SCRIPTS": JSON.stringify(scriptFilenames["content"]),
            // TODO: Add variable for 'matches' so we can load content scripts accordingly.
            "RUN_SERVER_HOST": "localhost:" + PORT
        });

        if (!scripts.background) {
            scripts.background = [];
        }
    }    

    if (scripts.background) {
        scripts.background.forEach(function (script) {
            mapScript("background", script);
        });

        normalizedManifest.background = {
            "page": "background.html"
        };
    }
    replaceInFile(PATH.join(buildBasePath, "background.js"), {
        "BACKGROUND_SCRIPTS": JSON.stringify(scriptFilenames["background"] || []),
        "RUN_SERVER_HOST": "localhost:" + PORT
    });

    if (!normalizedManifest.background) {
        FS.removeSync(PATH.join(buildBasePath, "background.html"));
        FS.removeSync(PATH.join(buildBasePath, "background.js"));
    }
    if (!normalizedManifest.content_scripts) {
        FS.removeSync(PATH.join(buildBasePath, "content-script.js"));
    }


    // Rewrite manifest

    const manifestPath = PATH.join(buildBasePath, "manifest.json");
    const manifest = LODASH.merge(FS.readJSONSync(manifestPath), normalizedManifest);

    // If we are not on master we designate the build as a preview release.
    if (ACTIVE_BRANCH !== "master") {
        manifest.description = "(NOTE: This is a PREVIEW build for branch: " + ACTIVE_BRANCH + ") " + manifest.description;
        manifest.name += " (branch: " + ACTIVE_BRANCH + ")";
        manifest.applications.gecko.id = manifest.applications.gecko.id.replace(
            /@/,
            "_branch_" + ACTIVE_BRANCH + "@"
        );
        manifest.version += "pre";
    }

    // Append git ref to pre version so we can create a unique release
    if (/pre$/.test(manifest.version)) {
        manifest.version += "_" + (new Date().getTime()/1000|0);
    }

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
