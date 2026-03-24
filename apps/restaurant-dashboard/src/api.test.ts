import { describe, expect, it, vi } from 'vitest';
import { api, uploadFileToUrl, uploadMenuItemImage } from './api';

describe('restaurant dashboard api client', () => {
  it('uses JSON content type and default base URL', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
    expect(api.defaults.baseURL).toBe('/api');
  });

  it('throws when upload PUT request fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', mockFetch);
    await expect(uploadFileToUrl(new File(['x'], 'x.png', { type: 'image/png' }), 'https://u')).rejects.toThrow(
      'Upload failed: 500'
    );
    vi.unstubAllGlobals();
  });

  it('returns public url after presigned upload', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { uploadUrl: 'https://upload', publicUrl: 'https://public/file.png' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const url = await uploadMenuItemImage(new File(['x'], 'f.png', { type: 'image/png' }));
    expect(url).toBe('https://public/file.png');
    vi.unstubAllGlobals();
  });
});
