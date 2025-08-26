// Direct unsigned upload of avatar images to Cloudinary.
// Reuses the same environment variables as evidence upload:
//   VITE_CLOUDINARY_CLOUD_NAME
//   VITE_CLOUDINARY_UPLOAD_PRESET (unsigned)
// Optional: create a distinct preset and expose VITE_CLOUDINARY_AVATAR_PRESET.

export interface AvatarUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format?: string;
}

export async function uploadAvatarFile(
  file: File,
  opts?: { onProgress?: (percent: number) => void }
): Promise<AvatarUploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
  const presetSpecific = import.meta.env.VITE_CLOUDINARY_AVATAR_PRESET as string | undefined;
  const genericPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;
  const uploadPreset = presetSpecific || genericPreset;
  if (!cloudName || !uploadPreset) throw new Error("Missing Cloudinary avatar configuration");
  if (!file.type.startsWith("image/")) throw new Error("Only image files allowed for avatar");

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);
  form.append("folder", "cms_avatars");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && opts?.onProgress) {
        const pct = Math.round((e.loaded * 100) / e.total);
        opts.onProgress(pct);
      }
    });
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText) as {
              secure_url?: string;
              public_id?: string;
              bytes?: number;
              format?: string;
            };
            if (!json.secure_url || !json.public_id) {
              reject(new Error("Cloudinary response missing secure_url/public_id"));
              return;
            }
            resolve({
              url: json.secure_url,
              publicId: json.public_id,
              bytes: json.bytes || file.size,
              format: json.format,
            });
          } catch (err) {
            reject(new Error("Failed to parse Cloudinary response"));
          }
        } else {
          reject(new Error(`Cloudinary avatar upload failed (status ${xhr.status})`));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error during avatar upload"));
    xhr.send(form);
  });
}
