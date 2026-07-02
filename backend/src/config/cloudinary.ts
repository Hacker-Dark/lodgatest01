import dotenv from 'dotenv';
dotenv.config();

export const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  isConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
};

if (!cloudinaryConfig.isConfigured) {
  console.warn('Cloudinary Warning: Cloudinary is not configured. Fallback to robust placeholder assets.');
}

/**
 * Mock helper to simulate Cloudinary photo upload
 */
export async function uploadToCloudinary(fileBufferBase64: string): Promise<string> {
  if (!cloudinaryConfig.isConfigured) {
    // Generate a high fidelity placeholder to let the app function beautifully
    const placeholderUrlId = Math.floor(1 + Math.random() * 10);
    return `https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600&mock=${placeholderUrlId}`;
  }

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file: `data:image/jpeg;base64,${fileBufferBase64}`,
        upload_preset: 'lodga_presets'
      })
    });

    const data = await response.json();
    return data.secure_url || '';
  } catch (err) {
    console.error('Cloudinary upload failure, fallback used:', err);
    return `https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600&mock=err`;
  }
}
