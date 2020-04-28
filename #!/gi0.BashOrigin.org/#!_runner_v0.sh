#!/usr/bin/env bash.origin.script

depend {
    "webext_it": "it.pinf.org.mozilla.web-ext # runner/v0"
    # "git": "bash.origin.gitscm # helpers/v0"
}

# function EXPORTS_run {

#     local runConfig=$(node "$__DIRNAME__/../../lib/builder.js" "$1" "$(CALL_git get_branch)")

#     BO_log "$VERBOSE" "[to.pinf.org.mozilla.web-ext] runConfig: $runConfig"

# #node --eval 'process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]), null, 4) + "\n");' "$runConfig"

#     CALL_webext_it run "$runConfig" "${*:2}"
# }

function EXPORTS_sign {
    CALL_webext_it sign "$@"
}

