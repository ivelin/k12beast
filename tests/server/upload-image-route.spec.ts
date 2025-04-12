// tests/server/upload-image-route.spec.ts
import { POST } from '@/app/api/upload-image/route';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Debug: Log environment variables to ensure they're loaded
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY);

// Initialize a Supabase client for cleanup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('POST /api/upload-image', () => {
  let uploadedFileNames: string[] = [];

  afterEach(async () => {
    // Clean up uploaded files after each test
    if (uploadedFileNames.length > 0) {
      const { error } = await supabase.storage
        .from('problems')
        .remove(uploadedFileNames);
      if (error) {
        console.error('Failed to clean up test files:', error.message);
      }
      uploadedFileNames = [];
    }
  });

  it('should upload images and return their public URLs', async () => {
    // Mock the form data with multiple files
    const formData = new FormData();
    const file1 = new File(['dummy content 1'], 'image1.png', { type: 'image/png' });
    const file2 = new File(['dummy content 2'], 'image2.png', { type: 'image/png' });
    formData.append('files', file1);
    formData.append('files', file2);

    // Create request with form data
    const request = new NextRequest('http://localhost:3000/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    // Call the route
    const response = await POST(request);
    const json = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      files: expect.arrayContaining([
        { name: 'image1.png', url: expect.stringMatching(/^https:\/\/.*\.supabase\.co\/.*image1\.png$/) },
        { name: 'image2.png', url: expect.stringMatching(/^https:\/\/.*\.supabase\.co\/.*image2\.png$/) },
      ]),
    });

    // Store uploaded file names for cleanup (extract file names from URLs)
    uploadedFileNames = json.files.map((file: { url: string }) => {
      const urlParts = file.url.split('/');
      return urlParts[urlParts.length - 1];
    });
  });

  it('should return 400 if no files are provided', async () => {
    // Mock an empty form data
    const formData = new FormData();

    // Create request with empty form data
    const request = new NextRequest('http://localhost:3000/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    // Call the route
    const response = await POST(request);
    const json = await response.json();

    // Assertions
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'No files provided' });
  });

  it('should return 400 if too many files are uploaded', async () => {
    // Mock form data with more than 5 files
    const formData = new FormData();
    for (let i = 0; i < 6; i++) {
      const file = new File(['dummy content'], `image${i}.png`, { type: 'image/png' });
      formData.append('files', file);
    }

    // Create request with form data
    const request = new NextRequest('http://localhost:3000/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    // Call the route
    const response = await POST(request);
    const json = await response.json();

    // Assertions
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'You can only upload a maximum of 5 images' });
  });

  it('should return 400 if a file exceeds the size limit', async () => {
    // Mock a file that exceeds the 5MB limit
    const largeFileContent = new ArrayBuffer(6 * 1024 * 1024); // 6MB
    const file = new File([largeFileContent], 'large-image.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('files', file);

    // Create request with form data
    const request = new NextRequest('http://localhost:3000/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    // Call the route
    const response = await POST(request);
    const json = await response.json();

    // Assertions
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'Some files exceed the 5MB size limit' });
  });
});