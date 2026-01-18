<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'sendCommand']);

const activeTab = ref('wifi');
const wifiSSID = ref('');
const wifiPass = ref('');
const wifiList = ref([]);
const isScanning = ref(false);

const lat = ref(0.0);
const lon = ref(0.0);
const timezone = ref('UTC');
const tzOffset = ref(0);
const refreshInterval = ref(5);  // Default 5 minutes

onMounted(() => {
    // Load from LocalStorage if available
    const saved = localStorage.getItem('epaper_device_config');
    if (saved) {
        try {
            const conf = JSON.parse(saved);
            wifiSSID.value = conf.ssid || '';
            wifiPass.value = conf.pass || '';
            lat.value = conf.lat || 0.0;
            lon.value = conf.lon || 0.0;
            timezone.value = conf.tz || 'UTC';
            tzOffset.value = conf.tz_off ? conf.tz_off / 3600 : 0;
            refreshInterval.value = conf.refresh ? conf.refresh / 60 : 5;
        } catch (e) { console.error(e); }
    }
});

// Mock scanning for dev if not connected
const scanWifi = async () => {
    isScanning.value = true;
    emit('sendCommand', { cmd: 'scan_wifi' });
};

const saveConfig = () => {
    const config = {
        ssid: wifiSSID.value,
        pass: wifiPass.value,
        lat: lat.value,
        lon: lon.value,
        tz: timezone.value,
        tz_off: tzOffset.value * 3600,
        refresh: refreshInterval.value * 60  // Convert to seconds
    };
    
    // Persist locally
    localStorage.setItem('epaper_device_config', JSON.stringify({
        ...config,
        // Store password? Maybe risky but user wants persistence. 
        // For local app it's "okay-ish".
    }));

    emit('sendCommand', { 
        cmd: 'set_config',
        ...config
    });
    emit('close');
};

const getCurrentLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            lat.value = pos.coords.latitude;
            lon.value = pos.coords.longitude;
            // Guess timezone
            timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // Guess offset
            const offset = -new Date().getTimezoneOffset() / 60;
            tzOffset.value = offset; 
        });
    }
};

// Expose method to update list from outside
defineExpose({
    updateWifiList: (networks) => {
        wifiList.value = networks;
        isScanning.value = false;
    }
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-[500px] shadow-xl">
      <h2 class="text-xl font-bold mb-4">Device Settings</h2>
      
      <!-- Tabs -->
      <div class="flex border-b mb-4">
        <button 
            @click="activeTab = 'wifi'"
            :class="['px-4 py-2', activeTab === 'wifi' ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500']"
        >
            WiFi Network
        </button>
        <button 
            @click="activeTab = 'location'"
            :class="['px-4 py-2', activeTab === 'location' ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500']"
        >
            Location & Time
        </button>
      </div>

      <!-- WiFi Tab -->
      <div v-if="activeTab === 'wifi'" class="space-y-4">
        <div class="flex justify-between items-center">
            <h3 class="font-semibold">Available Networks</h3>
            <button @click="scanWifi" class="text-sm text-blue-600 hover:underline" :disabled="isScanning">
                {{ isScanning ? 'Scanning...' : 'Scan Now' }}
            </button>
        </div>
        
        <div class="h-40 overflow-y-auto border rounded p-2 bg-gray-50">
            <div v-if="wifiList.length === 0" class="text-gray-400 text-center py-4">
                No networks found or not scanned.
            </div>
            <div 
                v-for="net in wifiList" 
                :key="net.ssid"
                class="flex justify-between p-2 hover:bg-blue-100 cursor-pointer"
                @click="wifiSSID = net.ssid"
            >
                <span>{{ net.ssid }}</span>
                <span class="text-xs text-gray-500">{{ net.rssi }} dBm</span>
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium">SSID</label>
            <input v-model="wifiSSID" type="text" class="w-full border rounded p-2" placeholder="Network Name">
        </div>
        <div>
            <label class="block text-sm font-medium">Password</label>
            <input v-model="wifiPass" type="password" class="w-full border rounded p-2" placeholder="WiFi Password">
        </div>
      </div>

      <!-- Location Tab -->
      <div v-if="activeTab === 'location'" class="space-y-4">
        <div class="bg-blue-50 p-3 rounded text-sm text-blue-800">
            Location is used for accurate Weather data.
        </div>
        
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium">Latitude</label>
                <input v-model="lat" type="number" step="0.0001" class="w-full border rounded p-2">
            </div>
            <div>
                <label class="block text-sm font-medium">Longitude</label>
                <input v-model="lon" type="number" step="0.0001" class="w-full border rounded p-2">
            </div>
        </div>

        <button @click="getCurrentLocation" class="w-full py-2 bg-gray-200 rounded hover:bg-gray-300">
            Get from Browser
        </button>

        <div class="pt-4 border-t">
             <label class="block text-sm font-medium">Timezone Offset (Hours)</label>
             <input v-model="tzOffset" type="number" class="w-full border rounded p-2" placeholder="e.g. 8 for UTC+8">
             <p class="text-xs text-gray-500 mt-1">Example: 8 for China/Singapore, -5 for New York.</p>
        </div>
        
        <div class="pt-4 border-t">
             <label class="block text-sm font-medium">Display Refresh Interval (Minutes)</label>
             <input v-model="refreshInterval" type="number" min="1" max="60" class="w-full border rounded p-2" placeholder="5">
             <p class="text-xs text-gray-500 mt-1">How often to update the e-paper display. Recommended: 5-10 minutes.</p>
        </div>
      </div>

      <div class="mt-6 flex justify-end space-x-3">
        <button @click="$emit('close')" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
        <button @click="saveConfig" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">Save to Device</button>
      </div>
    </div>
  </div>
</template>
