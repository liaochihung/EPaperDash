import { ref } from 'vue';
import {
    dataURLtoImageData,
    floydSteinbergDithering,
    pack1Bit,
    pack3Color,
    pack4Bit,
    generateEPDPacket
} from '../utils/imageProcessing';
import { paletteMap } from '../constants/displays';

export function useFirmwareUpload(sendBinary, isConnected) {
    const isUploading = ref(false);

    const uploadToScreen = async (canvasEditor, selectedDisplay, selectedColorMode) => {
        if (!isConnected.value) {
            alert("Please connect to the device first.");
            return;
        }

        if (!canvasEditor) return;

        isUploading.value = true;
        try {
            console.log("Generating image...");
            const dataURL = canvasEditor.getDataURL();

            console.log("Converting to ImageData...");
            const imageData = await dataURLtoImageData(dataURL);
            console.log(`ImageData size: ${imageData.width}x${imageData.height}`);

            if (selectedColorMode.id !== '3c') {
                console.log("Applying dithering (1-bit mode only)...");
                floydSteinbergDithering(imageData);
            }

            console.log("Packing bits for mode: " + selectedColorMode.id);
            let rawBody;
            let modeId = 0; // Default 1-bit

            if (selectedColorMode.id === '3c') {
                rawBody = pack3Color(imageData);
                modeId = 1;
            } else if (selectedColorMode.id === '4c' || selectedColorMode.id === '7c') {
                rawBody = pack4Bit(imageData, paletteMap[selectedColorMode.id]);
                modeId = 2; // 4-bit Palette mode
            } else {
                rawBody = pack1Bit(imageData);
                modeId = 0;
            }

            // Wrap in protocol packet
            const binaryData = generateEPDPacket(selectedDisplay.width, selectedDisplay.height, modeId, rawBody);

            console.log("Sending " + binaryData.length + " bytes (Header + Payload)...");

            await sendBinary(binaryData);
            console.log("Upload complete!");
            alert("Upload Complete!");
        } catch (e) {
            console.error("Upload failed", e);
            alert("Upload Failed: " + e.message);
        } finally {
            isUploading.value = false;
        }
    };

    return {
        isUploading,
        uploadToScreen
    };
}
