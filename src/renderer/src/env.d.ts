/// <reference types="svelte" />
/// <reference types="vite/client" />
export { }

declare global {
    interface Window {
        electronAPI: {
            getAppInfo: () => Promise<any>
            getConfig: () => Promise<any>
            getPythonStatus: () => Promise<boolean>
            getPackageStatus: () => Promise<boolean>
            getServerInfo: () => Promise<any>
        }
        api: {
            hotkey: {
                get: () => Promise<string | null | undefined>
                set: (accelerator: string) => Promise<string>
            }
        }
    }
}