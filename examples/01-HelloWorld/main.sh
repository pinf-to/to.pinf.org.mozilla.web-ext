#!/usr/bin/env bash

[ ! -e ".~" ] || rm -Rf .~*

echo "TEST_MATCH_IGNORE>>>"

pinf.it .

echo "<<<TEST_MATCH_IGNORE"

echo "OK"
