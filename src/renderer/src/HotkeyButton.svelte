<script lang="ts">
  import { onMount } from 'svelte'

  let open = false
  let recording = false
  let accel = ''
  let errorMsg = ''
  let current = ''

  // sichere Bridge, nie direkt window.api.* benutzen
  type HKApi = { get: () => Promise<any>, set: (s: string) => Promise<any> }
  let hk: HKApi | null = null

  function resolveHotkeyAPI(): HKApi | null {
    // @ts-ignore
    const a = (window as any)?.api?.hotkey
    // @ts-ignore
    const b = (window as any)?.electronAPI?.hotkey
    return a ?? b ?? null
  }

  onMount(async () => {
    hk = resolveHotkeyAPI()
    if (!hk) {
      console.warn('[hotkey] API nicht verfügbar – Preload noch nicht ready?')
      return
    }
    try {
      current = (await hk.get()) ?? ''
    } catch (e) {
      console.warn('[hotkey] get() fehlgeschlagen:', e)
    }
  })

  // --- Helper: nur finalisieren bei Nicht-Modifier
  function isModifier(k: string) {
    return k === 'Control' || k === 'Shift' || k === 'Alt' || k === 'Meta' || k === 'AltGraph' || k === 'Super'
  }
  function normalizeKey(k: string) {
    if (/^F\d{1,2}$/i.test(k)) return k.toUpperCase()
    if (/^[A-Z]$/i.test(k)) return k.toUpperCase()
    if (/^\d$/.test(k)) return k
    if (k === ' ') return 'Space'
    if (k === 'Escape') return 'Esc'
    return k.length === 1 ? k.toUpperCase() : k
  }
  function buildAccelFromEvent(e: KeyboardEvent) {
    const mods: string[] = []
    if (e.ctrlKey) mods.push('Control')
    if (e.shiftKey) mods.push('Shift')
    if (e.altKey) mods.push('Alt')
    if (e.metaKey) mods.push('Super')
    const key = normalizeKey(e.key)
    return mods.length ? [...mods, key].join('+') : key
  }

  async function startRecording() {
    errorMsg = ''
    recording = true
    accel = ''

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isModifier(e.key)) return
      accel = buildAccelFromEvent(e)
      recording = false
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keydown', onEsc, true)
    }

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        recording = false
        accel = ''
        window.removeEventListener('keydown', onKeyDown, true)
        window.removeEventListener('keydown', onEsc, true)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keydown', onEsc, true)
  }

  async function save() {
    errorMsg = ''
    if (!accel) { errorMsg = 'Bitte zuerst eine Kombination drücken.'; return }
    hk = hk ?? resolveHotkeyAPI()
    if (!hk) { errorMsg = 'Hotkey-API nicht verfügbar.'; return }

    try {
      const setTo = await hk.set(accel)
      current = setTo
      accel = ''
      open = false
    } catch (e: any) {
      errorMsg = e?.message ?? 'Hotkey konnte nicht gesetzt werden.'
    }
  }
</script>

<style>
  .fab {
    position: fixed;
    right: 20px;
    bottom: 20px;
    padding: 12px 16px;
    border-radius: 9999px;
    box-shadow: 0 6px 16px rgba(0,0,0,.15);
    background: #111827;
    color: white;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
    z-index: 2147483646; /* ganz vorn */
  }
  .panel {
    position: fixed;
    right: 20px;
    bottom: 76px;
    width: 320px;
    background: white;
    color: #111827;
    border-radius: 12px;
    box-shadow: 0 10px 24px rgba(0,0,0,.18);
    padding: 16px;
    z-index: 2147483647; /* über dem Button */
  }
  .row { display: flex; gap: 8px; align-items: center; }
  .kbd {
    padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  .btn {
    padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb; cursor: pointer;
  }
  .btn.primary { background: #2563eb; color: white; border-color: #2563eb; }
  .muted { color: #6b7280; font-size: 12px; }
  .error { color: #b91c1c; font-size: 13px; margin-top: 6px; }
</style>

{#if open}
  <div class="panel">
    <div class="row" style="justify-content: space-between;">
      <strong>Hotkey festlegen</strong>
      <button class="btn" on:click={() => (open=false)}>✕</button>
    </div>

    <div style="margin-top: 12px;">
      <div class="muted">Aktuell:</div>
      <div class="kbd" style="display:inline-block;margin-top:4px;">{current || '—'}</div>
    </div>

    <div style="margin-top: 12px;">
      <div class="muted">Neu aufnehmen:</div>
      <div class="row" style="margin-top:6px;">
        <button class="btn" on:click|preventDefault={startRecording}>
          {recording ? '…Taste drücken' : 'Kombination aufnehmen'}
        </button>
        <div class="kbd" style="min-width:140px; text-align:center;">
          {accel || (recording ? 'Warte…' : '—')}
        </div>
      </div>
      <div class="muted" style="margin-top:6px;">
        Tipp: z. B. <span class="kbd">Control</span> + <span class="kbd">Alt</span> + <span class="kbd">F9</span>
      </div>
      {#if errorMsg}<div class="error">{errorMsg}</div>{/if}
    </div>

    <div class="row" style="margin-top:12px; justify-content:flex-end;">
      <button class="btn" on:click={() => { accel=''; recording=false; open=false }}>Abbrechen</button>
      <button class="btn primary" on:click={save} disabled={!accel || recording}>Speichern</button>
    </div>
  </div>
{/if}

<div class="fab" on:click={() => (open = !open)}>
  ⚙️ Hotkey
</div>
