import { ref } from 'vue';
import {
    dataURLtoImageData,
    floydSteinbergDithering,
    pack1Bit,
    pack3Color,
    pack4Bit,
    generateEPDPacket,
    generatePartialEPDPacket
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
            // 1. Extract and Send Layout Config (Dynamic Nodes)
            console.log("Extracting Layout...");
            const state = JSON.parse(canvasEditor.exportState());
            const dynamicNodes = state
                .filter(n => n.attrs.nodeType && ['time', 'date', 'weather'].includes(n.attrs.nodeType))
                .map(n => ({
                    id: n.attrs.id,
                    type: n.attrs.nodeType,
                    x: Math.round(n.attrs.x),
                    y: Math.round(n.attrs.y),
                    w: Math.round(n.attrs.width || 0), // Text width varies, but might be useful
                    h: Math.round(n.attrs.height || 0),
                    fontSize: n.attrs.fontSize,
                    fmt: n.attrs.text // For date/time format string potentially
                }));

            if (dynamicNodes.length > 0) {
                console.log("Sending Layout Config:", dynamicNodes);
                // We need sendJSON here. Since it wasn't passed initially, we assume it's passed now or attached to the object
                // To avoid breaking change, let's assume `sendBinary.sendJSON` or we change the signature
                // Actually, best to just pass it in App.vue. 
                // For now, let's assume the first arg `sendBinary` is actually an object or we use a new argument?
                // Let's rely on the caller passing `sendJSON` as a second arg to this composable factory?
                // No, `useFirmwareUpload(sendBinary, isConnected)` is the factory.
                // We will update the factory signature.
            }

            // 2. Generate Background Image (Excluding Dynamic Nodes)
            console.log("Generating Clean Background...");
            const dataURL = canvasEditor.getDataURL({ excludeDynamic: true });

            console.log("Converting to ImageData...");
            const imageData = await dataURLtoImageData(dataURL);

            if (selectedColorMode.id !== '3c') {
                floydSteinbergDithering(imageData);
            }

            console.log("Packing bits...");
            let rawBody;
            let modeId = 0;

            if (selectedColorMode.id === '3c') {
                rawBody = pack3Color(imageData);
                modeId = 1;
            } else if (selectedColorMode.id === '4c' || selectedColorMode.id === '7c') {
                rawBody = pack4Bit(imageData, paletteMap[selectedColorMode.id]);
                modeId = 2;
            } else {
                rawBody = pack1Bit(imageData);
                modeId = 0;
            }

            const binaryData = generateEPDPacket(selectedDisplay.width, selectedDisplay.height, modeId, rawBody);

            // Send Layout First if available
            if (dynamicNodes.length > 0 && sendBinary.sendJSON) {
                await sendBinary.sendJSON({
                    cmd: "set_layout",
                    widgets: dynamicNodes
                });
                // Small delay to let ESP sync
                await new Promise(r => setTimeout(r, 500));
            }

            console.log("Sending Image...");
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

    const uploadPartialUpdate = async (canvasEditor, x, y, width, height, selectedColorMode) => {
        if (!isConnected.value) {
            console.warn("Not connected, skipping partial update");
            return;
        }

        if (!canvasEditor) return;

        try {
            console.log(`Partial update: ${x},${y} ${width}x${height}`);
            const dataURL = canvasEditor.getPartialDataURL(x, y, width, height);

            const imageData = await dataURLtoImageData(dataURL);

            if (selectedColorMode.id !== '3c') {
                floydSteinbergDithering(imageData);
            }

            let rawBody;
            let modeId = 10; // Partial 1-bit

            if (selectedColorMode.id === '3c') {
                rawBody = pack3Color(imageData);
                modeId = 11; // Partial 3-color
            } else {
                rawBody = pack1Bit(imageData);
                modeId = 10;
            }

            const binaryData = generatePartialEPDPacket(x, y, width, height, modeId, rawBody);
            await sendBinary(binaryData);
            console.log("Partial update sent");
        } catch (e) {
            console.error("Partial update failed", e);
        }
    };

    return {
        isUploading,
        uploadToScreen,
        uploadPartialUpdate
    };
}
