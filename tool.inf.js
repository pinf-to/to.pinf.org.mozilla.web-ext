
exports['gi0.pinf.it/core/v0/tool'] = async function (workspace, LIB) {

    return async function (instance) {

        if (/\/builder\/v0$/.test(instance.kindId)) {

            const BUILDER = require('./lib/builder');

            return async function (invocation) {

                if (invocation.method === 'write') {

                    if (invocation.config.manifest.dist) {
                        LIB.logger.error(`'manifest.dist' config property may not be set!`);
                        process.exit(1);
                    }

                    const distBasePath = LIB.PATH.join(invocation.pwd, invocation.mount.path);

                    invocation.config.cwd = invocation.cwd;
                    invocation.config.manifest.dist = distBasePath;
                    invocation.config.runConfigPath = LIB.PATH.join(distBasePath, '.~', 'it.pinf.org.mozilla.web-ext', 'run.config.json');

                    const runConfig = await BUILDER.build(invocation.config);

                    await LIB.FS.outputFile(invocation.config.runConfigPath, JSON.stringify(runConfig, null, 4), 'utf8');

                    return true;
                }
            };            
        }
    };
}
