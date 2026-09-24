import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '#@/platform/storage/StorageService.js';
import { LocalStorageProvider } from '#@/platform/storage/providers/LocalStorageProvider.js';
import { SupabaseStorageProvider } from '#@/platform/storage/providers/SupabaseStorageProvider.js';
import { STORAGE_CONFIG } from '#@/platform/storage/config.js';

// Mock dependencies
vi.mock('#@/platform/storage/providers/LocalStorageProvider.js');
vi.mock('#@/platform/storage/providers/SupabaseStorageProvider.js');
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => '1234-abcd-5678')
}));

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with LocalStorageProvider when config is local', () => {
    const originalProvider = STORAGE_CONFIG.PROVIDER;
    STORAGE_CONFIG.PROVIDER = 'local';
    
    const service = new StorageService();
    
    expect(LocalStorageProvider).toHaveBeenCalled();
    expect(service.providerName).toBe('local');
    
    STORAGE_CONFIG.PROVIDER = originalProvider;
  });

  it('should initialize with SupabaseStorageProvider when config is supabase', () => {
    const originalProvider = STORAGE_CONFIG.PROVIDER;
    STORAGE_CONFIG.PROVIDER = 'supabase';
    
    const service = new StorageService();
    
    expect(SupabaseStorageProvider).toHaveBeenCalled();
    expect(service.providerName).toBe('supabase');
    
    STORAGE_CONFIG.PROVIDER = originalProvider;
  });

  it('upload should generate secure path and call provider upload', async () => {
    const originalProvider = STORAGE_CONFIG.PROVIDER;
    STORAGE_CONFIG.PROVIDER = 'local';
    
    const service = new StorageService();
    
    // Mock the upload method of the underlying provider
    service.provider.upload = vi.fn().mockResolvedValue({
      path: 'development/1234-abcd-5678',
      size: 1024,
      mimeType: 'image/png'
    });
    
    const file = { buffer: Buffer.from('test'), size: 1024, mimetype: 'image/png' };
    const result = await service.upload(file, { category: 'development' });
    
    expect(service.provider.upload).toHaveBeenCalledWith(file, { path: 'development/1234-abcd-5678' });
    expect(result.path).toBe('development/1234-abcd-5678');
    expect(result.uploaded).toBe(true);
    
    STORAGE_CONFIG.PROVIDER = originalProvider;
  });
});
