
const WINDOW = window;

const url = "./%%%PANEL_SCRIPT_FILENAME%%%";

WINDOW.PINF.sandbox(url, function (sandbox) {

    sandbox.main();

}, console.error);
