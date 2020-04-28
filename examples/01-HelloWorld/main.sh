#!/usr/bin/env bash.origin.script

[ ! -e ".~" ] || rm -Rf .~*

echo "TEST_MATCH_IGNORE>>>"

pinf.it .

echo "<<<TEST_MATCH_IGNORE"

echo "OK"
