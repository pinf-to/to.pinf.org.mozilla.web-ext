#!/usr/bin/env bash.origin.script

echo ">>>TEST_IGNORE_LINE:port:<<<"
echo ">>>TEST_IGNORE_LINE:\[it.pinf.org.mozilla.web-ext\]<<<"

depend {
    "webext": "@com.github/pinf-to/to.pinf.org.mozilla.web-ext#s1"
}

CALL_webext run {
    "manifest": {
        "permissions": [
            "webRequest",
            "<all_urls>"
        ],
        "content_security_policy": "script-src 'self' https://jsfiddle.net; object-src 'self'; img-src 'self'",
        "devtools": {
            "panels": [
                {
                    "devtools.js": {
                        "label": "My Panel",
                        "icon": "box.png",
                        "code": {
                            "@it.pinf.org.mochajs#s1": {
                                "suite": "devtools",
                                "tests": {
                                    "01-HelloWorld": function /* CodeBlock */ () {

console.log("Hello from Devtools Panel!!");

var el = document.createElement("iframe");
el.setAttribute("width", "100%");
el.setAttribute("height", "400");
// TODO: Set correct URL to load 'frame.html' from github.
el.setAttribute("src", "./frame.html");
document.body.appendChild(el);

                                        describe('Array', function () {
                                            describe('#indexOf()', function () {

                                                it('should return -1 when the value is not present', function () {
                                                    chai.assert.equal(-1, [1,2,3].indexOf(4));
                                                });
                                            });
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        }
    },
    "routes": {
        "^/": {
            "@it.pinf.org.mochajs#s1": {
                "suite": "page",
                "tests": {
                    "01-HelloWorld": function /* CodeBlock */ () {

console.log("Hello from page!!");

                        describe('Array', function () {
                            describe('#indexOf()', function () {

                                it('should return -1 when the value is not present', function () {
                                    chai.assert.equal(-1, [1,2,3].indexOf(4));
                                });
                            });
                        });
                    }
                }
            }
        }
    },
    "files": {
        "frame.html": "./frame.html"
    },
    "expect": {
        "exit": true,
        "conditions": [
            {
                "@it.pinf.org.mochajs#s1": {
                    "suites": [
                        "devtools",
                        "page"
                    ]
                }
            }        
        ]
    }
}

echo "OK"
