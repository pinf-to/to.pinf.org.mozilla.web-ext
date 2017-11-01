
const WINDOW = window;
const BROWSER = browser;

var index = 0;
function fetchURL (url) {

    return new Promise(function (resolve, reject) {

        var rIndex = ++index;

        // TODO: Timeout
        var listener = function (message) {
            if (
                message.to === "content-script" &&
                message.id == rIndex
            ) {
                BROWSER.runtime.onMessage.removeListener(listener);

                if (message.error) {
                    return reject(new Error(message.error));
                }
                return resolve(message.response);
            }
        };
        BROWSER.runtime.onMessage.addListener(listener);

        BROWSER.runtime.sendMessage({
            to: "fetch.url",
            from: "content-script",
            id: rIndex,
            url: url
        }).then(function (message) {
            return null;
        }).catch(function (err) {
            err.message += "(while loading url '" + url + "')";
            err.stack += "\n(while loading url '" + url + "')";
            return reject(err);
        });
    });
}

window.addEventListener("message", function(event) {
    if (
        event.source == window &&
        event.data &&
        event.data.from === "page-script" &&
        event.data.to === "content-script:__postJSON"
    ) {
        BROWSER.runtime.sendMessage({
            to: "postJSON",
            from: "content-script",
            url: event.data.url,
            data: event.data.data
        }).then(function (message) {
            return null;
        }).catch(function (err) {
            err.message += "(while loading url '" + url + "')";
            err.stack += "\n(while loading url '" + url + "')";
            throw err;
        });
    }
});

%%%CONTENT_SCRIPTS%%%.forEach(function (script) {

    const url = "scripts/" + script;

    fetchURL(".lib/github.com~pinf~pinf-for-mozilla-web-ext/scripts/pinf-loader.js").then(function (code1) {
        return fetchURL(".lib/github.com~pinf~pinf-for-mozilla-web-ext/scripts/loader.js").then(function (code2) {
            return fetchURL(url).then(function (code) {
                
                WINDOW.eval([
                    code1,
                    code2,
                    'window.__postJSON = function (url, data) {',
                        'window.postMessage({',
                        '    to: "content-script:__postJSON",',
                        '    from: "page-script",',
                        '    url: url,',
                        '    data: JSON.stringify(data)',
                        '}, "*");',
                    '}',
                    'var implementation = function () {',
                    code,
                    '}',
                    'window.PINF.sandbox(implementation, function (sandbox) {',
                        'sandbox.main();',
                    '}, console.error);'    
                ].join("\n"));
            });
        });
    });
});
