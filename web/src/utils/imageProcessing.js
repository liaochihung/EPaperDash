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
// We'll use 1 = Color, 0 = White/Transparency for use with drawBitmap
export function pack1Bit(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const rowBytes = Math.ceil(width / 8);
    const buffer = new Uint8Array(rowBytes * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            // Luminance threshold
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            const isBlack = gray < 128;

            if (isBlack) {
                // Set bit (1 = Black)
                const byteIndex = y * rowBytes + Math.floor(x / 8);
                const bitIndex = 7 - (x % 8); // MSB first
                buffer[byteIndex] |= (1 << bitIndex);
            }
        }
    }
    return buffer;
}

// For 3-Color (BWR) displays: Black/White/Red
// Returns a single buffer containing [BlackPlane][RedPlane]
export function pack3Color(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const planeSize = Math.ceil(width / 8) * height;
    const buffer = new Uint8Array(planeSize * 2);

    const blackPlane = buffer.subarray(0, planeSize);
    const redPlane = buffer.subarray(planeSize, planeSize * 2);
    const rowBytes = Math.ceil(width / 8);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const byteIndex = y * rowBytes + Math.floor(x / 8);
            const bitIndex = 7 - (x % 8);

            // Red detection: R is dominant and G,B are low
            // Or near-red colors
            const isRed = (r > 120 && g < 100 && b < 100);
            // Black detection: all components are low
            const isBlack = (r < 60 && g < 60 && b < 60);

            if (isRed) {
                redPlane[byteIndex] |= (1 << bitIndex);
            } else if (isBlack) {
                blackPlane[byteIndex] |= (1 << bitIndex);
            }
        }
    }
    return buffer;
}

/**
 * For 7-Color (ACeP) displays: Black, White, Green, Blue, Red, Yellow, Orange
 * Packed as 4 bits per pixel (nibbles).
 * Palette matches App.vue: ['#000000', '#ffffff', '#00ff00', '#0000ff', '#ff0000', '#ffff00', '#ffa500']
 */
export function pack4Bit(imageData, palette) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const buffer = new Uint8Array((width * height) / 2); // 2 pixels per byte

    // Pre-calculate RGB for palette
    const paletteRGB = palette.map(hex => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    });

    for (let i = 0; i < width * height; i++) {
        const px = i * 4;
        const r = data[px];
        const g = data[px + 1];
        const b = data[px + 2];

        // Find nearest color in palette
        let bestIndex = 0;
        let minDist = Infinity;
        for (let j = 0; j < paletteRGB.length; j++) {
            const dist = Math.pow(r - paletteRGB[j].r, 2) +
                Math.pow(g - paletteRGB[j].g, 2) +
                Math.pow(b - paletteRGB[j].b, 2);
            if (dist < minDist) {
                minDist = dist;
                bestIndex = j;
            }
        }

        // Pack into nibbles (4 bits each)
        const byteIdx = Math.floor(i / 2);
        if (i % 2 === 0) {
            // First pixel -> High nibble
            buffer[byteIdx] = (bestIndex & 0x0F) << 4;
        } else {
            // Second pixel -> Low nibble
            buffer[byteIdx] |= (bestIndex & 0x0F);
        }
    }
    return buffer;
}

/**
 * Protocol Header:
 * [Magic: EPD] (3 bytes)
 * [Width] (2 bytes, Big Endian)
 * [Height] (2 bytes, Big Endian)
 * [Mode] (1 byte) -> 0: 1-bit, 1: 3-color (2 planes), 2: 4-bit Palette
 */
export function generateEPDPacket(width, height, mode, body) {
    const header = new Uint8Array(8);
    header[0] = 0x45; // 'E'
    header[1] = 0x50; // 'P'
    header[2] = 0x44; // 'D'

    header[3] = (width >> 8) & 0xFF;
    header[4] = width & 0xFF;
    header[5] = (height >> 8) & 0xFF;
    header[6] = height & 0xFF;
    header[7] = mode;

    const packet = new Uint8Array(header.length + body.length);
    packet.set(header);
    packet.set(body, header.length);
    return packet;
}
