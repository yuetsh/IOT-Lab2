export interface StickerImageRef {
  id: number
  filename: string
}

export function stickerImageSrc(sticker: StickerImageRef) {
  return `/api/stickers/${sticker.id}/image?v=${encodeURIComponent(sticker.filename)}`
}

export function canSaveStickerEdit(name: string, saving: boolean) {
  return name.trim().length > 0 && !saving
}
