export async function dataURLtoImageData(dataURL) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(ctx.getImageData(0, 0, img.width, img.height));
        };
        img.onerror = reject;
        img.src = dataURL;
    });
}

// Floyd-Steinberg Dithering
// Converts RGBA to 1-bit Monochrome (Black/White)
export function floydSteinbergDithering(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data; // RGBA, 0-255 linear array

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const oldR = data[i];
            const oldG = data[i + 1];
            const oldB = data[i + 2];

            // 1. Convert to Grayscale (Luminance)
            const gray = (oldR * 0.299 + oldG * 0.587 + oldB * 0.114);

            // 2. Threshold (Quantize to 0 or 255)
            const newColor = gray < 128 ? 0 : 255;

            // 3. Calculate Error
            const error = gray - newColor;

            // 4. Update Current Pixel
            data[i] = newColor;
            data[i + 1] = newColor;
            data[i + 2] = newColor;
            // Alpha remains 255 (assumed opaque)

            // 5. Distribute Error to Neighbors
            // Right (7/16)
            if (x + 1 < width) {
                distributeError(data, (y * width + (x + 1)) * 4, error * 7 / 16);
            }
            // Bottom-Left (3/16)
            if (x - 1 >= 0 && y + 1 < height) {
                distributeError(data, ((y + 1) * width + (x - 1)) * 4, error * 3 / 16);
            }
            // Bottom (5/16)
            if (y + 1 < height) {
                distributeError(data, ((y + 1) * width + x) * 4, error * 5 / 16);
            }
            // Bottom-Right (1/16)
            if (x + 1 < width && y + 1 < height) {
                distributeError(data, ((y + 1) * width + (x + 1)) * 4, error * 1 / 16);
            }
        }
    }
    return imageData;
}

function distributeError(data, index, amount) {
    // Apply error to RGB channels
    data[index] = Math.max(0, Math.min(255, data[index] + amount));
    data[index + 1] = Math.max(0, Math.min(255, data[index + 1] + amount));
    data[index + 2] = Math.max(0, Math.min(255, data[index + 2] + amount));
}

// Convert Dithered ImageData to 1-bit packed ByteArray
// White (255) = 1, Black (0) = 0
// MSB First
export function pack1Bit(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const rowBytes = Math.ceil(width / 8);
    const buffer = new Uint8Array(rowBytes * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const isWhite = data[i] > 127; // 255 is white

            if (isWhite) {
                // Set bit
                const byteIndex = y * rowBytes + Math.floor(x / 8);
                const bitIndex = 7 - (x % 8); // MSB first
                buffer[byteIndex] |= (1 << bitIndex);
            }
            // By default buffer is 0 (Black), so we only need to write 1s
        }
    }
    return buffer;
}
