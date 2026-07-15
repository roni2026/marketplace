# Cloudinary setup (cloud `iok4ild8`)

You do **not** get a preset automatically — you create one once.

## Create the unsigned upload preset (2 minutes)

1. Open [https://console.cloudinary.com](https://console.cloudinary.com) and select cloud **iok4ild8**.
2. Click the **gear icon** (Settings) in the left sidebar (or top-right).
3. Open the **Upload** tab.
4. Scroll to **Upload presets**.
5. Click **Add upload preset**.
6. Set:
   - **Preset name:** `bazarbd_unsigned` (must match exactly)
   - **Signing Mode:** **Unsigned** (important — Signed will fail from the browser)
   - **Folder** (optional): `bazarbd`
   - **Use filename** / unique filename: leave defaults
7. Click **Save**.

You should now see `bazarbd_unsigned` in the Upload presets list. That name **is** the preset name.

## Env vars (Render / local)

```
VITE_CLOUDINARY_CLOUD_NAME=iok4ild8
VITE_CLOUDINARY_API_KEY=477828215824789
VITE_CLOUDINARY_UPLOAD_PRESET=bazarbd_unsigned
VITE_CLOUDINARY_FOLDER=bazarbd
```

The app already defaults cloud name, API key, and preset name `bazarbd_unsigned`.
After you create the preset, redeploy (or set the env vars and redeploy).

## Cannot find “Upload presets”?

- Product: **Programmable Media** (not MediaFlows only).
- Settings → **Upload** (not “Security” or “Product environment settings” only).
- On some accounts: **Settings → Product Environment Settings → Upload**.
- Mobile/narrow UI: open full desktop console.

## Never put the API Secret in Vite

The **API Secret** is only for server-side signed uploads. Browser uploads use the **unsigned** preset only.
