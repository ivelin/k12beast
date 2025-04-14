// tests/server/upload-image-route.spec.ts
import { POST } from '@/app/api/upload-image/route';
import supabase from '@/supabase/serverClient';

// Mock the File API
class MockFile {
  name: string;
  type: string;
  size: number;
  content: any;

  constructor(parts: any[], name: string, options: { type: string }) {
    this.name = name;
    this.type = options.type;
    // Calculate size based on content length (in bytes)
    this.size = parts.reduce((size: number, part: any) => {
      if (typeof part === 'string') {
        return size + Buffer.from(part).length;
      } else if (part instanceof ArrayBuffer) {
        return size + part.byteLength;
      }
      return size;
    }, 0);
    this.content = parts;
  }

  arrayBuffer() {
    return Promise.resolve(
      typeof this.content[0] === 'string'
        ? Buffer.from(this.content[0])
        : this.content[0]
    );
  }
}

// Mock the FormData API
class MockFormData {
  private data: Map<string, any[]> = new Map();

  append(key: string, value: any) {
    const existing = this.data.get(key) || [];
    this.data.set(key, [...existing, value]);
  }

  get(key: string) {
    const values = this.data.get(key);
    return values && values.length > 0 ? values[0] : null;
  }

  getAll(key: string) {
    return this.data.get(key) || [];
  }
}

global.File = MockFile as any;
global.FormData = MockFormData as any;

// Mock Supabase client to include both auth and storage
jest.mock('@/supabase/serverClient', () => {
  const mockStorageFrom = {
    list: jest.fn().mockResolvedValue({ data: [], error: null }),
    remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    upload: jest.fn().mockImplementation((path, file) => ({
      data: { path },
      error: null,
    })),
    getPublicUrl: jest.fn().mockImplementation((path) => ({
      data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/problems/${path}` },
      error: null,
    })),
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    storage: {
      listBuckets: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      createBucket: jest.fn().mockResolvedValue({
        data: { name: 'problems' },
        error: null,
      }),
      from: jest.fn().mockReturnValue(mockStorageFrom),
    },
  };
});

describe('POST /api/upload-image', () => {
  const bucketName = 'problems';

  beforeAll(async () => {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    if (!buckets.some(bucket => bucket.name === bucketName)) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }
  });

  afterEach(async () => {
    const { data: files, error } = await supabase.storage.from(bucketName).list();
    if (error) throw error;
    if (files && files.length > 0) {
      const paths = files.map(file => file.name);
      await supabase.storage.from(bucketName).remove(paths);
    }
  });

  it('should upload images and return their public URLs', async () => {
    const formData = new FormData();
    const file1 = new File(['dummy content 1'], 'image1.png', { type: 'image/png' });
    const file2 = new File(['dummy content 2'], 'image2.png', { type: 'image/png' });
    formData.append('files', file1);
    formData.append('files', file2);

    const req = {
      formData: jest.fn().mockResolvedValue(formData),
      cookies: {
        get: jest.fn().mockImplementation((name) => ({
          value: name === 'supabase-auth-token' ? 'mock-token' : undefined,
        })),
      },
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      files: [
        { name: 'image1.png', url: expect.stringMatching(/https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/problems\/test-user-id\/[0-9a-f-]+\.png/) },
        { name: 'image2.png', url: expect.stringMatching(/https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/problems\/test-user-id\/[0-9a-f-]+\.png/) },
      ],
    });
  });

  it('should return 400 if too many files are uploaded', async () => {
    const formData = new FormData();
    for (let i = 0; i < 6; i++) {
      const file = new File([`dummy content ${i}`], `image${i}.png`, { type: 'image/png' });
      formData.append('files', file);
    }

    const req = {
      formData: jest.fn().mockResolvedValue(formData),
      cookies: {
        get: jest.fn().mockImplementation((name) => ({
          value: name === 'supabase-auth-token' ? 'mock-token' : undefined,
        })),
      },
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(formData.getAll('files').length).toBe(6);
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: expect.stringContaining('maximum of 5 images') });
  });

  it('should return 400 if a file exceeds the size limit', async () => {
    const largeFileContent = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeFileContent], 'large-image.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('files', file);

    const req = {
      formData: jest.fn().mockResolvedValue(formData),
      cookies: {
        get: jest.fn().mockImplementation((name) => ({
          value: name === 'supabase-auth-token' ? 'mock-token' : undefined,
        })),
      },
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(file.size).toBe(6 * 1024 * 1024);
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: expect.stringContaining('exceed') });
  });

  it('should return 401 if no auth token is provided', async () => {
    const formData = new FormData();
    const file = new File(['dummy content'], 'image.png', { type: 'image/png' });
    formData.append('files', file);

    const req = {
      formData: jest.fn().mockResolvedValue(formData),
      cookies: {
        get: jest.fn().mockReturnValue(undefined),
      },
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: 'You must be logged in to upload images. Please log in and try again.' });
  });
});