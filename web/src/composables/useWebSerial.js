import { ref } from 'vue';

export function useWebSerial() {
    const port = ref(null);
    const isConnected = ref(false);

    const connect = async () => {
        if (!navigator.serial) {
            alert("Web Serial API not supported in this browser. Please use Chrome or Edge.");
            return;
        }

        try {
            port.value = await navigator.serial.requestPort();
            await port.value.open({ baudRate: 115200 });
            isConnected.value = true;
            console.log("Serial connected");
        } catch (error) {
            console.error("Serial connection failed:", error);
            // alert("Failed to connect: " + error.message);
        }
    };

    const disconnect = async () => {
        if (port.value) {
            await port.value.close();
            port.value = null;
            isConnected.value = false;
        }
    };

    const sendBinary = async (data) => {
        if (!port.value || !port.value.writable) {
            console.error("Port not writable");
            return;
        }

        const writer = port.value.writable.getWriter();
        try {
            await writer.write(data);
        } finally {
            writer.releaseLock();
        }
    };

    return {
        isConnected,
        connect,
        disconnect,
        sendBinary
    };
}
