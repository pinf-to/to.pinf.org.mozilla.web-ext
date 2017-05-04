#!/usr/bin/env bash.origin.script

depend {
    "webext": "@../..#s1"
}

CALL_webext run {
    "manifest": {
        "permissions": [
            "webRequest",
            "<all_urls>"
        ],
        "background": {
            "scripts": [
                "background.js"
            ]
        }
    }
}

echo "OK"
