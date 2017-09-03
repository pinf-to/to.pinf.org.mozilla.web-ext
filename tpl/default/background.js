
const WINDOW = window;

%%%BACKGROUND_SCRIPTS%%%.forEach(function (script) {

    const url = "scripts/" + script;

    WINDOW.PINF.sandbox(url, function (sandbox) {

        sandbox.main();

    }, console.error);

});
