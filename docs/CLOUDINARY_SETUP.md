# Cloudinary setup (cloud `iok4ild8`)

## Status

Unsigned upload preset **`bazarbd_unsigned`** has been created on cloud `iok4ild8` via Admin API.

## Env vars (Render / local)

```
VITE_CLOUDINARY_CLOUD_NAME=iok4ild8
VITE_CLOUDINARY_API_KEY=477828215824789
VITE_CLOUDINARY_UPLOAD_PRESET=bazarbd_unsigned
VITE_CLOUDINARY_FOLDER=bazarbd
```

The app defaults to these values if env is missing (except you should still set them on Render for clarity).

## Recreate preset (if deleted)

```bash
export CLOUDINARY_API_SECRET=...   # never put in VITE_*
python3 scripts/create_cloudinary_preset.py
```

## Never put the API Secret in Vite

The **API Secret** is only for server-side Admin API. Browser uploads use the **unsigned** preset only.
