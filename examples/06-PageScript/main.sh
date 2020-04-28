#!/usr/bin/env bash.origin.script

echo "WARNING: Work in progress."

echo ">>>SKIP_TEST<<<"

exit 1

[ ! -e ".~" ] || rm -Rf .~*
[ ! -e ".extension.built/.~" ] || rm -Rf .extension.built/.~*

echo "TEST_MATCH_IGNORE>>>"

pinf.it .

echo "<<<TEST_MATCH_IGNORE"

echo "OK"
