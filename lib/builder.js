
const LIB = require("bash.origin.lib").forPackage(__dirname).js;


const PATH = LIB.path;
const FS = LIB.FS_EXTRA;
const LODASH = LIB.LODASH;
const MINIMIST = LIB.MINIMIST;
const CODEBLOCK = LIB.CODEBLOCK;
const GET_PORT = LIB.GET_PORT;
const BO = LIB.BASH_ORIGIN;
const GLOB = LIB.GLOB;
const RESOLVE = LIB.RESOLVE;

const DEBUG = process.env.DEBUG_WEB_EXT_BUILDER || false;


var logOrig = console.log;
console.log = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[to.pinf.org.mozilla.web-ext:builder]");
    return logOrig.apply(console, args);
}


exports.build = async function (CONFIG, ACTIVE_BRANCH) {

    // TODO: Need a vetter way to identify if a preview needs to be generated.
    let GITHUB_REF = (process.env.GITHUB_REF || '').split('/').pop() || null;
    if (GITHUB_REF) {
        if (/^v/.test(GITHUB_REF)) {
            GITHUB_REF = 'master';
        }
    }
    ACTIVE_BRANCH = ACTIVE_BRANCH || (require('git-branch').sync() || '').replace(/\//g, '_') || GITHUB_REF || 'head';

    const runConfigPath = CONFIG.runConfigPath || null;
    const port = CONFIG.port || null;

    function relativizePath (path) {
        if (!runConfigPath) {
            return path;
        }
        return PATH.relative(PATH.dirname(runConfigPath), path);
    }

    const cwdDir = CONFIG.cwd || process.cwd();

    const buildBasePath = (CONFIG.manifest.dist && PATH.resolve(cwdDir, CONFIG.manifest.dist)) || PATH.join(cwdDir, ".~rt/github.com~pinf-to~to.pinf.org.mozilla.web-ext/extension.built");
    delete CONFIG.manifest.dist;

    const templateBasePath = PATH.join(__dirname, "../tpl/default");

    if (DEBUG) console.log("buildBasePath", buildBasePath);
    if (DEBUG) console.log("templateBasePath", templateBasePath);


    var config = {};
    LODASH.merge(config, {
        "@to.pinf.org.mozilla.web-ext # builder/v0": {
            manifest: CONFIG.manifest
        }
    }, {
        "@it.pinf.org.mozilla.web-ext # runner/v0": {
            "homepage": "/",
            "extension": relativizePath(buildBasePath),
            "browserConsole": true,
            "firefoxVersion": "firefox",
//            "firefoxVersion": "firefoxdeveloperedition",
            "verbose": !!process.env.VERBOSE,
            "routes": {}
        }
    }, {
        "@it.pinf.org.mozilla.web-ext # runner/v0": CONFIG
    });

    delete config["@it.pinf.org.mozilla.web-ext # runner/v0"].manifest;


    CONFIG = null;

    if (DEBUG) console.log("config", config);


    // Remove existing
    // if (FS.existsSync(buildBasePath)) {
    //     FS.removeSync(buildBasePath);
    // }

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

    return GET_PORT().then(async function (PORT) {

        PORT = port || PORT;

        // Write manifest

        const scripts = {};
        const normalizedManifest = config['@to.pinf.org.mozilla.web-ext # builder/v0'].manifest || {};

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



        config["@it.pinf.org.mozilla.web-ext # runner/v0"].port = PORT;
        // NOTE: If we enable this, firefox will need SSL cert exception override.
        // TODO: Fix SSL cert exception override by setting config option.
        //config["@it.pinf.org.mozilla.web-ext # runner/v0"].tls = true;

        if (config['@to.pinf.org.mozilla.web-ext # builder/v0'].routes) {
            Object.keys(config['@to.pinf.org.mozilla.web-ext # builder/v0'].routes).forEach(function (route) {
                config["@it.pinf.org.mozilla.web-ext # runner/v0"].routes[route] = config['@to.pinf.org.mozilla.web-ext # builder/v0'].routes[route];
            });
        }

        if (config['@to.pinf.org.mozilla.web-ext # builder/v0'].expect) {
            config["@it.pinf.org.mozilla.web-ext # runner/v0"].expect = config['@to.pinf.org.mozilla.web-ext # builder/v0'].expect;
        }


        var scriptFilenames = {};

        function mapScript (scriptType, script) {

            if (process.env.VERBOSE) console.log("mapScript()", scriptType, script);

            var scriptFilepath = null;
            var scriptSourceFilepath = null;
            var scriptDeclarations = null;
            const additionalIncludes = [];

            if (
                typeof script === "object" &&
                Object.keys(script).length === 1
            ) {
                scriptFilepath = Object.keys(script)[0];
                scriptSourceFilepath = scriptFilepath;
                scriptDeclarations = script[scriptFilepath];
            } else
            if (
                typeof script === "object" &&
                Object.keys(script).length > 1
            ) {
                scriptFilepath = script.uri;
                scriptSourceFilepath = script.src;
            } else {
                scriptFilepath = script;
                scriptSourceFilepath = scriptFilepath;
            }

            if (process.env.VERBOSE) console.log("scriptFilepath", scriptFilepath);
            if (process.env.VERBOSE) console.log("scriptSourceFilepath", scriptSourceFilepath);
            if (process.env.VERBOSE) console.log("scriptDeclarations", scriptDeclarations);
            
            if (/\.js$/.test(scriptFilepath)) {
                if (!scriptFilenames[scriptType]) {
                    scriptFilenames[scriptType] = [];
                }

                if (scriptType === "devtools_panels") {

                    if (scriptDeclarations.icon) {
                        var sourcePath = scriptDeclarations.icon || PATH.join(templateBasePath, "skin/box.png");
                        sourcePath = /^\//.test(sourcePath) ? sourcePath : PATH.join(cwdDir, sourcePath);
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
                scriptDeclarations.include
            ) {
                Object.keys(scriptDeclarations.include).forEach(function (name) {

                    if (process.env.VERBOSE) console.log("copy include", RESOLVE.sync(scriptDeclarations.include[name], { basedir: cwdDir }), PATH.join(buildBasePath, 'dist', name));

                    FS.copySync(
                        RESOLVE.sync(scriptDeclarations.include[name], {
                            basedir: cwdDir
                        }),
                        PATH.join(buildBasePath, 'lib', name)
                    );
                    additionalIncludes.push(name);
                });
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

                    config["@it.pinf.org.mozilla.web-ext # runner/v0"]
                        .routes["/scripts/" + scriptFilepath] = scriptDeclarations;

                    Object.keys(scriptDeclarations).forEach(function (uri) {
                        // TODO: Use a namespace for these properties.
                        scriptDeclarations[uri].rootFormat = "pinf";
                        scriptDeclarations[uri].dist = PATH.relative(cwdDir, PATH.join(buildBasePath, "scripts", scriptFilepath));
                        scriptDeclarations[uri].prime = true;
                    });

                } else
                if (/^([^\s]+)\s*#\s*([^\s]+)\s*#\s*([^\s]+)$/.test(Object.keys(scriptDeclarations)[0])) {

                    config["@it.pinf.org.mozilla.web-ext # runner/v0"]
                        .routes["/scripts/" + scriptFilepath] = scriptDeclarations;

                    // Object.keys(scriptDeclarations).forEach(function (uri) {
                    //     // TODO: Use a namespace for these properties.
                    //     scriptDeclarations[uri].rootFormat = "pinf";
                    // });

                } else {
                    console.error("scriptDeclarations", scriptDeclarations);
                    throw new Error("'scriptDeclarations' format not supported!");
                }
            } else
            if (/\.js$/.test(scriptFilepath)) {

                const scriptConfig = {};
                scriptConfig[`gi0.PINF.it/build/v0 # / # /scripts/${scriptFilepath}`] = {
                    "@it.pinf.org.browserify # router/v1": {
                        basedir: buildBasePath,
                        src: PATH.join(cwdDir, scriptSourceFilepath),
                        format: "pinf",
                        "variables": {
                            "PORT": PORT
                        }
                    }
                };

                config["@it.pinf.org.mozilla.web-ext # runner/v0"].routes["/scripts/" + scriptFilepath] = scriptConfig;
            } else
            if (/\.html$/.test(scriptFilepath)) {

                // TODO: Specify 'dist' and 'prime' so we can load files using fileystem from within bundle.
                throw new Error("NYI");

    /*
                config["@it.pinf.org.mozilla.web-ext # runner/v0"].routes["/scripts/" + scriptFilepath] = new CODEBLOCK.Codeblock(`

                    const FS = require("fs");

                    return function (req, res, next) {

                        res.writeHead(200);
                        res.end(FS.readFileSync("${PATH.join(cwdDir, scriptFilepath)}", "utf8"));
                    };
                `, "javascript", [ "API" ]);
    */
            } else {
                throw new Error("Script extension not supported: " + scriptFilepath);
            }

            return {
                scriptFilepath: scriptFilepath,
                scriptSourceFilepath: scriptSourceFilepath,
                additionalIncludes: additionalIncludes
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
                        "PANEL_LOADER_SCRIPT_FILENAME": PATH.basename(info.scriptFilepath).replace(/\.js$/, ".loader.js"),
                        "ADDITIONAL_INCLUDES": info.additionalIncludes.map(function (name) {
                            if (/\.css$/.test(name)) {
                                return `<link rel="stylesheet" href="../../../lib/${name}">`;
                            } else
                            if (/\.js$/.test(name)) {
                                return `<script src="../../../lib/${name}"></script>`;
                            } else {
                                throw new Error(`Include type based on file extension for '${name}' not supported!`);
                            }
                        }).join("\n")
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

        if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
            throw new Error(`'manifest.version' format does not match '\\d.\\d.\\d'!`);
        }

        manifest.version_name = manifest.version;


        // If we are not on master we designate the build as a preview release.
        if (ACTIVE_BRANCH !== "master") {

            manifest.description = "(NOTE: This is a PREVIEW build for branch: " + ACTIVE_BRANCH + ") " + manifest.description;
            manifest.name += " [" + ACTIVE_BRANCH + "]";
            if (
                manifest.applications &&
                manifest.applications.gecko &&
                manifest.applications.gecko.id
            ) {
                manifest.applications.gecko.id = manifest.applications.gecko.id.replace(
                    /@/,
                    "_branch_" + ACTIVE_BRANCH + "@"
                );
            }

            // TODO: Do this based on git tags.
            // const commitsSinceFirstCommitInBranch = (await LIB.RUNBASH(`git log master..HEAD --oneline --reverse | wc -l`)).stdout.toString().match(/(\d+)/)[1];

            // manifest.version += `.${commitsSinceFirstCommitInBranch}`;
            manifest.version_name += ` ${ACTIVE_BRANCH}`;
        }

        // // Append git ref to pre version so we can create a unique release
        // if (/pre$/.test(manifest.version_name)) {
        //     manifest.version_name += "_" + (new Date().getTime()/1000|0);
        // }

        if (DEBUG) console.log("manifest", manifest);
        FS.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4), "utf8");


        var source = CODEBLOCK.freezeToSource(config["@it.pinf.org.mozilla.web-ext # runner/v0"]);

        source = CODEBLOCK.purifyCode(source, {
            freezeToJSON: true,
            oneline: true
        });

        const runConfig = JSON.parse(source);
        delete runConfig.runConfigPath;

        if (runConfigPath) {
            delete runConfig.cwd;
        }

        runConfig.verbose = true;

        runConfig.basedir = cwdDir;

        return runConfig;
    });
}

// if (require.main === module) {
//     try {

//         const ARGS = MINIMIST(process.argv.slice(2));

//         if (DEBUG) console.log("ARGS", ARGS);
        
//         var CONFIG = JSON.parse(ARGS._.shift());
//         var ACTIVE_BRANCH = ARGS._.shift();

//         exports.build(CONFIG, ACTIVE_BRANCH).then(function (runConfig) {

//             process.stdout.write(JSON.stringify(runConfig) + "\n");

//         }, function (err) {
//             console.error(err.stack || err);
//             process.exit(1);
//         });

//     } catch (err) {
//         console.error(err.stack || err);
//         process.exit(1);
//     }
// }
