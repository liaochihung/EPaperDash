import { ref } from 'vue';

export function useWebSerial() {
    const port = ref(null);
    const isConnected = ref(false);
    const reader = ref(null);
    const inputDone = ref(null);
    const outputDone = ref(null);

    // Callbacks
    const onLineReceived = ref(null); // Function(line)

    const connect = async () => {
        if (!navigator.serial) {
            alert("Web Serial API not supported. Use Chrome or Edge.");
            return;
        }

        try {
            port.value = await navigator.serial.requestPort();
            await port.value.open({ baudRate: 115200 });
            isConnected.value = true;
            console.log("Serial connected");

            // Start reading loop
            readLoop();
        } catch (error) {
            console.error("Serial connection failed:", error);
        }
    };

    const readLoop = async () => {
        const textDecoder = new TextDecoderStream();
        inputDone.value = port.value.readable.pipeTo(textDecoder.writable);
        reader.value = textDecoder.readable.getReader();

        try {
            let buffer = "";
            while (true) {
                const { value, done } = await reader.value.read();
                if (done) break;

                buffer += value;
                let lines = buffer.split('\n');

                // Process all complete lines
                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i].trim();
                    if (line.length > 0 && onLineReceived.value) {
                        try {
                            // Try basic cleanup if needed, but usually raw line is fine
                            onLineReceived.value(line);
                        } catch (e) {
                            console.error("Error in onLineReceived:", e);
                        }
                    }
                }

                // Keep the last partial line
                buffer = lines[lines.length - 1];
            }
        } catch (error) {
            console.error("Read Error:", error);
        } finally {
            reader.value.releaseLock();
        }
    };

    const disconnect = async () => {
        if (reader.value) {
            await reader.value.cancel();
            reader.value = null;
        }
        if (port.value) {
            await port.value.close();
            port.value = null;
            isConnected.value = false;
        }
    };

    const sendBinary = async (data) => {
        if (!port.value || !port.value.writable) return;
        const writer = port.value.writable.getWriter();
        try {
            await writer.write(data);
        } finally {
            writer.releaseLock();
        }
    };

    const sendJSON = async (obj) => {
        if (!port.value || !port.value.writable) return;
        const str = JSON.stringify(obj) + "\n";
        const encoder = new TextEncoder();
        const writer = port.value.writable.getWriter();
        try {
            await writer.write(encoder.encode(str));
        } finally {
            writer.releaseLock();
        }
    };

    return {
        isConnected,
        connect,
        disconnect,
        sendBinary,
        sendJSON,
        onLineReceived
    };
}
