
exports['gi0.PINF.it/build/v0'] = async function (LIB, CLASSES) {

    const BUILDER = require('../../lib/builder');

    class BuildStep extends CLASSES.BuildStep {

        async onBuild (result, build, target, instance, home, workspace) {
            
// console.log("MOZILLA BUILD:", build, target, instance, home);

            const config = JSON.parse(JSON.stringify(build.config));

            if (config.manifest.dist) {
                LIB.console.error(`'manifest.dist' config property may not be set!`);
                process.exit(1);
            }

            config.cwd = build.path;
            config.manifest.dist = target.path;

            if (config.manifest.version === '${version}') {

                const descriptorPath = LIB.PATH.join(workspace.path, 'package.json');
                if (!(await LIB.FS.exists(descriptorPath))) {
                    throw new Error(`Could not find package descriptor at path '${descriptorPath}' needed to resolve manifest.version ''${version}'!`);
                }
                const descriptor = await LIB.FS.readJSON(descriptorPath);
                config.manifest.version = descriptor.version;
            }

            const runConfig = await BUILDER.build(config);

            const runConfigPath = LIB.PATH.join(target.path, 'run.config.json');

            await LIB.FS.outputFile(runConfigPath, JSON.stringify(runConfig, null, 4), 'utf8');

            return {};
        }
    }

    return BuildStep;    
}