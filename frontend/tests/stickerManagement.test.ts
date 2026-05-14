import { describe, expect, test } from 'bun:test'
import { canSaveStickerEdit, stickerImageSrc } from '../src/pages/admin/stickerManagement'

describe('sticker management helpers', () => {
  test('builds a cache-busting image URL from the current filename', () => {
    expect(stickerImageSrc({ id: 7, filename: 'device icon.webp' })).toBe('/api/stickers/7/image?v=device%20icon.webp')
  })

  test('allows saving when the edited name is not blank', () => {
    expect(canSaveStickerEdit('  树莓派  ', false)).toBe(true)
    expect(canSaveStickerEdit('   ', false)).toBe(false)
    expect(canSaveStickerEdit('树莓派', true)).toBe(false)
  })
})
