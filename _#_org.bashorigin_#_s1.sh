#!/usr/bin/env bash.origin.script

depend {
    "webext_it": "@com.github/pinf-it/it.pinf.org.mozilla.web-ext#s1",
    "git": "@com.github/bash-origin/bash.origin.gitscm#s1"    
}


function EXPORTS_run {
    local runConfig=$(BO_run_recent_node "$__DIRNAME__/lib/builder.js" "$1" "$(CALL_git get_branch)")

    BO_log "$VERBOSE" "[to.pinf.org.mozilla.web-ext] runConfig: $runConfig"

    CALL_webext_it run "$runConfig" "${*:2}"
}

function EXPORTS_sign {
    CALL_webext_it sign "$@"
}
