#!/usr/bin/env bash.origin.script

depend {
    "webext": "@com.github/pinf-to/to.pinf.org.mozilla.web-ext#s1"
}

CALL_webext run {
    "manifest": {
        "permissions": [
            "webRequest",
            "<all_urls>"
        ],
        "background": {
            "scripts": [
                "bg-worker1.js",
                "bg-worker2.js"
            ]
        }
    },
    "routes": {
        "^/$": function /* CodeBlock */ (API) {

            return function (req, res, next) {
                res.end(`
                    <html>
                        <body>OK!</body>
                        <script>
                            window.fetch('/.result', {
                                method: 'post',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    suite: "page",
                                    result: "all good"
                                })
                            });
                        </script>
                    </html>
                `);
            };
        },
        "^/.result$": function /* CodeBlock */ (API) {

            const results = {
                "page": null,
                "bg-worker1": null,
                "bg-worker2": null
            };
            var allResultsIn = false;
            function recordResult (name, value) {
                results[name] = value;
                if (
                    Object.keys(results).filter(function (suite) {
                        return (!results[suite]);
                    }).length === 0 &&
                    !allResultsIn
                ) {
                    allResultsIn = true;
                    console.log("RESULTS:", JSON.stringify(results, null, 4))

                    if (!process.env.BO_TEST_FLAG_DEV) {
                        API.stop();
                    }
                }
            }

            return function (req, res, next) {

                recordResult(req.body.suite, req.body.result);

                res.writeHead(200, {
                    "Content-Type": "application/json"
                });
                res.end('{}');
            };
        }
    }
}

echo "OK"
