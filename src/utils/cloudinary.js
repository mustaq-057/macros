export const CLOUDINARY_CONFIG = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CLOUDINARY_API_KEY) || '',
  apiSecret: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CLOUDINARY_API_SECRET) || '',
  defaultCloudName: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) || '',
};

export function getCloudName() {
  return localStorage.getItem('jazz_cloudinary_cloud_name') || CLOUDINARY_CONFIG.defaultCloudName;
}

export function setCloudName(name) {
  if (name) {
    localStorage.setItem('jazz_cloudinary_cloud_name', name.trim());
  }
}

/**
 * Upload an image (base64 data URL or File) to Cloudinary using browser WebCrypto SHA-1 signature
 */
export async function uploadImageToCloudinary(fileOrBase64, customCloudName) {
  const cloudName = customCloudName || getCloudName();
  const timestamp = Math.round(Date.now() / 1000);

  // Generate SHA-1 signature: timestamp=<ts><apiSecret>
  const strToSign = `timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(strToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const signature = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const formData = new FormData();
  formData.append('file', fileOrBase64);
  formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (json.secure_url) {
    return json.secure_url;
  }
  throw new Error(json.error?.message || 'Cloudinary upload failed');
}
