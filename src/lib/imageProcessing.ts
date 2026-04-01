type ResizeImageOptions = {
  maxSize?: number;
  quality?: number;
  preserveTransparency?: boolean;
  outputType?: "image/jpeg" | "image/png";
};

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Bild konnte nicht gelesen werden"));
    };

    reader.onerror = () => {
      reject(new Error("Bild konnte nicht gelesen werden"));
    };

    reader.readAsDataURL(blob);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    image.src = src;
  });

export const resizeImageFile = async (
  file: File,
  { maxSize = 512, quality = 0.85, preserveTransparency = false, outputType }: ResizeImageOptions = {},
) => {
  const src = await blobToDataUrl(file);
  const image = await loadImage(src);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas not available");
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const shouldUsePng =
    outputType === "image/png" ||
    (!outputType &&
      preserveTransparency &&
      (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")));

  const mimeType = shouldUsePng ? "image/png" : "image/jpeg";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Bild konnte nicht verarbeitet werden"));
          return;
        }

        resolve(blob);
      },
      mimeType,
      mimeType === "image/png" ? undefined : quality,
    );
  });
};
