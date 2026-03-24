import { describe, expect, it } from 'vitest';
import { api } from './api';

describe('admin api client', () => {
  it('uses JSON content type and default base URL', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
    expect(api.defaults.baseURL).toBe('/api');
  });
});
