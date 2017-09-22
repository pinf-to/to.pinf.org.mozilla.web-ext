
const WINDOW = window;

const panels = new EventEmitter();
panels.on("set", function (name, value) {
    panels[name] = value;
});


%%%DEVTOOLS_SCRIPTS%%%.forEach(function (script) {

    const url = "scripts/" + script;

    WINDOW.PINF.sandbox(url, function (sandbox) {

        sandbox.main({
            panels: panels
        });

    }, console.error);

});

%%%DEVTOOLS_PANELS%%%.forEach(function (panel) {

    const url = "scripts/" + panel.filename;
    
    browser.devtools.panels.create(
        panel.label || undefined,
        panel.icon || undefined,
        url
    ).then((panel) => {

        panels.emit("set", panel.name, panel);

        panel.onShown.addListener(function () {
    
console.log("INIT PANEL", url);
        });
    
        panel.onHidden.addListener(function () {
    
console.log("CLOSE PANEL", url);
        });
    });

});
