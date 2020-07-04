
(function (WINDOW) {

    const BROWSER = (typeof browser != "undefined") ? browser : chrome;
    const IS_FIREFOX = (typeof browser !== "undefined");

    function promisify (method, instance) {
        return function (args) {
            return new Promise (function (resolve, reject) {
                try {
                    args = Array.from(args);
                    args.push(function (err, result) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(result);
                    });
                    method.apply(instance, args);
                } catch (err) {
                    reject(err);
                }
            });
        }
    }

    function promisifyNoErr (method, instance) {
        return function (args) {
            return new Promise (function (resolve, reject) {
                try {
                    args = Array.from(args);
                    args.push(function (result) {
                        resolve(result);
                    });
                    method.apply(instance, args);
                } catch (err) {
                    reject(err);
                }
            });
        }
    }

    function map () {

        WINDOW.crossbrowser = WINDOW.crossbrowser || {};

        WINDOW.crossbrowser.browserType = IS_FIREFOX ? 'firefox' : 'chrome';

        WINDOW.crossbrowser.runtime = {
            getURL: BROWSER.runtime.getURL,
            onMessage: BROWSER.runtime.onMessage,
            sendMessage: async function () {
                if (IS_FIREFOX) {
                    return BROWSER.runtime.sendMessage.apply(BROWSER.runtime, arguments);
                }
                const result = await promisifyNoErr(BROWSER.runtime.sendMessage, BROWSER.runtime)(arguments);
                if (!result) {
                    throw new Error(BROWSER.runtime.lastError.message || BROWSER.runtime.lastError);
                }
                return result;
            },
            getManifest: function () {
                return BROWSER.runtime.getManifest();
            }
        };

        if (BROWSER.permissions) {
            WINDOW.crossbrowser.permissions = BROWSER.permissions;
        }
        if (BROWSER.pageAction) {
            WINDOW.crossbrowser.pageAction = {
                show: async function () {
                    if (IS_FIREFOX) {
                        return BROWSER.pageAction.show.apply(BROWSER.pageAction, arguments);
                    }
                    return promisifyNoErr(BROWSER.pageAction.show, BROWSER.pageAction)(arguments);
                },
                hide: async function () {
                    if (IS_FIREFOX) {
                        return BROWSER.pageAction.hide.apply(BROWSER.pageAction, arguments);
                    }
                    return promisifyNoErr(BROWSER.pageAction.hide, BROWSER.pageAction)(arguments);
                },
                setIcon: async function () {
                    if (IS_FIREFOX) {
                        return BROWSER.pageAction.setIcon.apply(BROWSER.pageAction, arguments);
                    }
                    return promisifyNoErr(BROWSER.pageAction.setIcon, BROWSER.pageAction)(arguments);
                },
            }
        }

        if (BROWSER.webRequest) {
            WINDOW.crossbrowser.webRequest = {
                onBeforeSendHeaders: BROWSER.webRequest.onBeforeSendHeaders,
                onHeadersReceived: BROWSER.webRequest.onHeadersReceived,
                handlerBehaviorChanged: BROWSER.webRequest.handlerBehaviorChanged
            };
        }

        if (BROWSER.devtools) {
            WINDOW.crossbrowser.devtools = {
                inspectedWindow: {},
                panels: {
                    create: async function () {
                        if (IS_FIREFOX) {
                            return BROWSER.devtools.panels.create.apply(BROWSER.devtools.panels, arguments);
                        }
                        return promisifyNoErr(BROWSER.devtools.panels.create, BROWSER.devtools.panels)(arguments);
                    }
                }
            };
            Object.defineProperty(WINDOW.crossbrowser.devtools.inspectedWindow, 'tabId', {
                get: function() {
                    return BROWSER.devtools.inspectedWindow.tabId;
                }
            });
        }

        if (BROWSER.tabs) {
            WINDOW.crossbrowser.tabs = {
                getCurrent: function () {
                    return BROWSER.tabs.getCurrent.apply(BROWSER.tabs, arguments);
                },
                query: async function () {
                    if (IS_FIREFOX) {
                        return BROWSER.tabs.query.apply(BROWSER.tabs, arguments);
                    }
                    return promisifyNoErr(BROWSER.tabs.query, BROWSER.tabs)(arguments);
                },
                sendMessage: async function () {
                    if (IS_FIREFOX) {
                        return BROWSER.tabs.sendMessage.apply(BROWSER.tabs, arguments);
                    }
                    return promisifyNoErr(BROWSER.tabs.sendMessage, BROWSER.tabs)(arguments);
                },
                reload: async function () {
                    if (IS_FIREFOX) {
                        return BROWSER.tabs.reload.apply(BROWSER.tabs, arguments);
                    }
                    return promisifyNoErr(BROWSER.tabs.reload, BROWSER.tabs)(arguments);
                },
                onUpdated: {
                    addListener: function () {
                        return BROWSER.tabs.onUpdated.addListener.apply(BROWSER.tabs.onUpdated, arguments);
                    }
                },
                onActivated: {
                    addListener: function () {
                        return BROWSER.tabs.onActivated.addListener.apply(BROWSER.tabs.onActivated, arguments);
                    }
                },
                onRemoved: {
                    addListener: function () {
                        return BROWSER.tabs.onRemoved.addListener.apply(BROWSER.tabs.onRemoved, arguments);
                    }
                }
            };
        }

        if (BROWSER.storage) {
            WINDOW.crossbrowser.storage = {
                onChanged: BROWSER.storage.onChanged,
                local: {
                    get: async function () {
                        if (IS_FIREFOX) {
                            return BROWSER.storage.local.get.apply(BROWSER.storage.local, arguments);
                        }
                        return promisifyNoErr(BROWSER.storage.local.get, BROWSER.storage.local)(arguments);
                    },
                    set: async function () {
                        if (IS_FIREFOX) {
                            return BROWSER.storage.local.set.apply(BROWSER.storage.local, arguments);
                        }
                        return promisifyNoErr(BROWSER.storage.local.set, BROWSER.storage.local)(arguments);
                    }
                }
            };
        };

        WINDOW.crossbrowser.remap = map;
    }

    map();

})(window);
