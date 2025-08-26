// Utility for uploading evidence files to Cloudinary.
// Requires environment variables:
//   VITE_CLOUDINARY_CLOUD_NAME
//   VITE_CLOUDINARY_UPLOAD_PRESET (an unsigned upload preset)
// Optional (configure in preset): allowed formats, size limits, etc.
// Supports progress via onProgress callback.

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format?: string;
  originalFilename?: string;
}

export async function uploadEvidenceFile(
  file: File,
  opts?: { onProgress?: (percent: number) => void; folder?: string }
): Promise<CloudinaryUploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as
    | string
    | undefined;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as
    | string
    | undefined;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Missing Cloudinary configuration (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET)."
    );
  }

  // Use the 'auto' resource type so images / pdf / docx all work if allowed by preset
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);
  form.append("folder", opts?.folder || "complaints_evidence");

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
              original_filename?: string;
            };
            if (!json.secure_url || !json.public_id) {
              reject(new Error("Cloudinary response missing secure_url / public_id"));
              return;
            }
            resolve({
              url: json.secure_url,
              publicId: json.public_id,
              bytes: json.bytes || file.size,
              format: json.format,
              originalFilename: json.original_filename,
            });
          } catch (err) {
            reject(new Error("Failed to parse Cloudinary response"));
          }
        } else {
          reject(new Error(`Cloudinary upload failed (status ${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}
