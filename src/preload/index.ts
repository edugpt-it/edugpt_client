import { ipcRenderer, contextBridge } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

const isLocalSource = () => {
    // Check if the execution environment is local
    const origin = window.location.origin;

    // Allow local sources: file protocol, localhost, or 0.0.0.0
    return (
        origin.startsWith("file://") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("0.0.0.0")
    );
};

window.addEventListener("DOMContentLoaded", () => {
    // Listen for messages from the main process
    ipcRenderer.on("main:data", (event, data) => {
        // Forward the message to the renderer using window.postMessage
        window.postMessage(
            {
                ...data,
                type: `electron:${data.type}`,
            },
            window.location.origin
        );
    });
});

// Custom APIs for renderer
const api = {
    onLog: (callback: (message: string) => void) => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        ipcRenderer.on("main:log", (_, message: string) => callback(message));
    },

    send: async ({ type, data }: { type: string; data?: any }) => {
        return await ipcRenderer.invoke("renderer:data", { type, data });
    },

    openInBrowser: async (url: string) => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        await ipcRenderer.invoke("open:browser", { url });
    },

    getAppInfo: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("app:info");
    },

    getVersion: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("get:version");
    },

    getConfig: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("get:config");
    },

    setConfig: async (config: Record<string, any>) => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("set:config", config);
    },

    installPython: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("install:python");
    },

    installPackage: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("install:package");
    },

    getPythonStatus: async () => {
        return await ipcRenderer.invoke("status:python");
    },

    getPackageStatus: async () => {
        return await ipcRenderer.invoke("status:package");
    },

    getServerStatus: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("status:server");
    },

    getServerInfo: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("server:info");
    },

    resetApp: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("app:reset");
    },

    startServer: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("server:start");
    },

    stopServer: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("server:stop");
    },

    restartServer: async () => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("server:restart");
    },

    getServerUrl: async () => {
        return await ipcRenderer.invoke("server:url");
    },

    notification: async (title: string, body: string) => {
        if (!isLocalSource()) {
            throw new Error(
                "Access restricted: This operation is only allowed in a local environment."
            );
        }

        return await ipcRenderer.invoke("notification", { title, body });
    },
};

const hotkeyAPI = {
    get: () => {
        if (typeof (ipcRenderer as any).invoke === 'function') {
            return ipcRenderer.invoke('hotkey:get')
        }
        return new Promise((resolve) => {
            ipcRenderer.once('hotkey:get:reply', (_e, val) => resolve(val))
            ipcRenderer.send('hotkey:get')
        })
    },
    set: (accel: string) => {
        if (typeof (ipcRenderer as any).invoke === 'function') {
            return ipcRenderer.invoke('hotkey:set', accel)
        }
        return new Promise((resolve, reject) => {
            ipcRenderer.once('hotkey:set:reply', (_e, res) => {
                if (res?.ok) resolve(res.value)
                else reject(new Error(res?.error || 'Hotkey konnte nicht gesetzt werden'))
            })
            ipcRenderer.send('hotkey:set', accel)
        })
    }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        // bestehende Exports
        contextBridge.exposeInMainWorld("electron", electronAPI)
        contextBridge.exposeInMainWorld("electronAPI", { ...api, hotkey: hotkeyAPI })

        // zusätzlicher Kurz-Schlüssel "api" (nur Hotkey)
        contextBridge.exposeInMainWorld("api", { hotkey: hotkeyAPI })
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore
    window.electron = electronAPI
    // @ts-ignore
    window.electronAPI = { ...api, hotkey: hotkeyAPI }  // ⬅️ hotkey hier anhängen
    // @ts-ignore
    window.api = { hotkey: hotkeyAPI }                  // ⬅️ und auch "api" setzen
}