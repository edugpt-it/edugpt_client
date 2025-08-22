import { app, clipboard, type NativeImage } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import crypto from 'crypto'

const SAVE_DIR = path.join(app.getPath('pictures'), 'openweb_images')

export function ensureSaveDir() {
    if (!fs.existsSync(SAVE_DIR)) {
        fs.mkdirSync(SAVE_DIR, { recursive: true })
    }
    return SAVE_DIR
}
export function getClipboardImageHash(): string | null {
    const img = clipboard.readImage()
    if (img.isEmpty()) return null
    const buf = img.toPNG()
    return crypto.createHash('sha256').update(buf).digest('hex')
}
export async function waitForNewClipboardImage(
    baselineHash: string | null,
    timeoutMs = 30000,
    intervalMs = 250
) {
    const start = Date.now()
    return await new Promise<NativeImage>((resolve, reject) => {
        const timer = setInterval(() => {
            try {
                const img = clipboard.readImage()
                if (!img.isEmpty()) {
                    const curHash = crypto.createHash('sha256').update(img.toPNG()).digest('hex')
                    if (curHash !== baselineHash) {
                        clearInterval(timer)
                        return resolve(img)
                    }
                }
                if (Date.now() - start > timeoutMs) {
                    clearInterval(timer)
                    return reject(new Error('Timeout: Kein neues Bild in der Zwischenablage gefunden.'))
                }
            } catch (e) {
                clearInterval(timer)
                reject(e)
            }
        }, intervalMs)
    })
}

export function openSnippingTool(): Promise<void> {
    return new Promise((resolve, reject) => {
        // 1) Moderner URI via cmd/start (häufig am stabilsten)
        exec('cmd /c start "" ms-screenclip:', (e1) => {
            if (!e1) {
                console.log('[snip] ms-screenclip gestartet (cmd /c start)')
                return resolve()
            }
            console.warn('[snip] ms-screenclip via cmd/start fehlgeschlagen:', e1?.message)

            // 2) Moderner URI via PowerShell
            exec('powershell -NoProfile -WindowStyle Hidden -Command "Start-Process ms-screenclip:"', (e2) => {
                if (!e2) {
                    console.log('[snip] ms-screenclip gestartet (PowerShell Start-Process)')
                    return resolve()
                }
                console.warn('[snip] ms-screenclip via PowerShell fehlgeschlagen:', e2?.message)

                // 3) Windows 11: direkt in den Clip-Modus
                exec('snippingtool /clip', (e3) => {
                    if (!e3) {
                        console.log('[snip] snippingtool /clip gestartet')
                        return resolve()
                    }
                    console.warn('[snip] snippingtool /clip fehlgeschlagen:', e3?.message)

                    // 4) Absolute Pfade (32/64-Bit Edgecases)
                    exec('C:\\Windows\\System32\\SnippingTool.exe /clip', (e4) => {
                        if (!e4) {
                            console.log('[snip] System32\\SnippingTool.exe /clip gestartet')
                            return resolve()
                        }
                        console.warn('[snip] System32\\SnippingTool.exe /clip fehlgeschlagen:', e4?.message)

                        exec('C:\\Windows\\Sysnative\\SnippingTool.exe /clip', (e5) => {
                            if (!e5) {
                                console.log('[snip] Sysnative\\SnippingTool.exe /clip gestartet')
                                return resolve()
                            }
                            console.warn('[snip] Sysnative\\SnippingTool.exe /clip fehlgeschlagen:', e5?.message)

                            // 5) UWP-App direkt starten (öffnet volles SnippingTool-Fenster)
                            exec('powershell -NoProfile -WindowStyle Hidden -Command "Start-Process shell:AppsFolder\\\\Microsoft.ScreenSketch_8wekyb3d8bbwe!App"', (e6) => {
                                if (!e6) {
                                    console.log('[snip] ScreenSketch App gestartet')
                                    return resolve()
                                }
                                console.error('[snip] alle Versuche fehlgeschlagen:', e6?.message)
                                reject(new Error('Konnte kein Snipping-Tool starten'))
                            })
                        })
                    })
                })
            })
        })
    })
}



export async function waitForClipboardImage(
    timeoutMs = 30000,
    intervalMs = 250
): Promise<NativeImage> {
    const start = Date.now()
    return await new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            try {
                const img = clipboard.readImage()
                if (!img.isEmpty()) {
                    clearInterval(timer)
                    resolve(img)
                } else if (Date.now() - start > timeoutMs) {
                    clearInterval(timer)
                    reject(new Error('Timeout: Kein Bild in der Zwischenablage gefunden.'))
                }
            } catch (e) {
                clearInterval(timer)
                reject(e)
            }
        }, intervalMs)
    })
}

export function saveImage(img: NativeImage) {
    ensureSaveDir()
    const file = path.join(SAVE_DIR, `snip_${Date.now()}.png`)
    fs.writeFileSync(file, img.toPNG())
    return file
}

export async function handleHotkey() {
    console.log('🚀 handleHotkey ausgelöst → Snipping Tool öffnen …')

    const baselineHash = getClipboardImageHash()
    await openSnippingTool()

    try {
        await new Promise(r => setTimeout(r, 300))
        const img = await waitForNewClipboardImage(baselineHash, 30000, 250)
        const file = saveImage(img)
        console.log('✅ Screenshot gespeichert:', file)
    } catch (err) {
        console.warn('⚠️ Kein neues Snip gefunden:', (err as Error)?.message)
    }
}