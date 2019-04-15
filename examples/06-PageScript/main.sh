#!/usr/bin/env bash.origin.script

depend {
    "webext": "@com.github/pinf-to/to.pinf.org.mozilla.web-ext#s1"
}

echo "WARNING: Work in progress."

CALL_webext run {
    "manifest": {
        "content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self';",
        "permissions": [
            "webRequest",
            "<all_urls>"
        ],
        "page": {
            "scripts": [
                {
                    "matches": [
                        "<all_urls>"
                    ],
                    "js": {
                        "page-script.js": {
                            "@it.pinf.org.mochajs#s1": {
                                "suite": "page-script",
                                "tests": {
                                    "01-HelloWorld": function /* CodeBlock */ () {

                                        describe('Array', function () {
                                            describe('#indexOf()', function () {

                                                it('should return -1 when the value is not present [page-script]', function () {
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

                        describe('Array', function () {
                            describe('#indexOf()', function () {

                                it('should return -1 when the value is not present [page]', function () {
                                    chai.assert.equal(-1, [1,2,3].indexOf(4));
                                });
                            });
                        });
                    }
                }
            }
        }
    },
    "expect": {
        "exit": true,
        "conditions": [
            {
                "@it.pinf.org.mochajs#s1": {
                    "suites": [
                        "page-script",
                        "page"
                    ]
                }
            }        
        ]
    }
}

echo "OK"
