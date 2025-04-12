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

  // Supabase expects File objects to be compatible with Blob
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

describe('POST /api/upload-image', () => {
  const bucketName = 'problems'; // Match the bucket name used in the route handler

  beforeAll(async () => {
    // Create the bucket if it doesn't exist
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    if (!buckets.some(bucket => bucket.name === bucketName)) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }
  });

  afterEach(async () => {
    // Clean up uploaded files
    const { data: files, error } = await supabase.storage.from(bucketName).list();
    if (error) throw error;
    if (files && files.length > 0) {
      const paths = files.map(file => file.name);
      await supabase.storage.from(bucketName).remove(paths);
    }
  });

  afterAll(async () => {
    // Optionally delete the bucket (commented out for debugging)
    // await supabase.storage.deleteBucket(bucketName);
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
        get: jest.fn().mockImplementation((name) => {
          return { value: name === 'supabase-auth-token' ? 'mock-token' : undefined };
        }),
      },
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      files: [
        { name: 'image1.png', url: expect.stringMatching(/https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/problems\/.*image1\.png/) },
        { name: 'image2.png', url: expect.stringMatching(/https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/problems\/.*image2\.png/) },
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
        get: jest.fn().mockImplementation((name) => {
          return { value: name === 'supabase-auth-token' ? 'mock-token' : undefined };
        }),
      },
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(formData.getAll('files').length).toBe(6); // Debug: Ensure 6 files are in formData
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'You can only upload a maximum of 5 images' });
  });

  it('should return 400 if a file exceeds the size limit', async () => {
    const largeFileContent = new ArrayBuffer(6 * 1024 * 1024); // 6MB
    const file = new File([largeFileContent], 'large-image.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('files', file);

    const req = {
      formData: jest.fn().mockResolvedValue(formData),
      cookies: {
        get: jest.fn().mockImplementation((name) => {
          return { value: name === 'supabase-auth-token' ? 'mock-token' : undefined };
        }),
      },
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(file.size).toBe(6 * 1024 * 1024); // Debug: Ensure file size is correct
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'Some files exceed the 5MB size limit' }); // Updated to match route handler
  });

  it('should return 401 if no auth token is provided', async () => {
    const formData = new FormData();
    const file = new File(['dummy content'], 'image.png', { type: 'image/png' });
    formData.append('files', file);

    const req = {
      formData: jest.fn().mockResolvedValue(formData),
      cookies: {
        get: jest.fn().mockReturnValue(undefined), // No auth token
      },
    } as any;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: 'You must be logged in to upload images. Please log in and try again.' });
  });
});