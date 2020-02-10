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
        "devtools": {
            "page": {
                "devtools.js": {
                    "@it.pinf.org.mochajs#s1": {
                        "suite": "devtools",
                        "tests": {
                            "01-HelloWorld": function /* CodeBlock */ () {

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
    },
    "routes": {
        "^/": {
            "@it.pinf.org.mochajs#s1": {
                "suite": "page",
                "tests": {
                    "01-HelloWorld": function /* CodeBlock */ () {

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
