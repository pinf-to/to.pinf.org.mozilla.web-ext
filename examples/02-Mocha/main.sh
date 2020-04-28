#!/usr/bin/env bash.origin.script

[ ! -e ".~" ] || rm -Rf .~*
[ ! -e ".extension.built/.~" ] || rm -Rf .extension.built/.~*

echo "TEST_MATCH_IGNORE>>>"

pinf.it .

echo "<<<TEST_MATCH_IGNORE"

echo "OK"
