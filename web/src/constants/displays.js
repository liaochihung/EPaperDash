export const displayOptions = [
    // 1.02" to 1.54"
    { id: 'GxEPD2_102', name: '1.02" (80x128) - GDEW0102T4', width: 80, height: 128 },
    { id: 'GxEPD2_150_BN', name: '1.50" (200x200) - DEPG0150BN', width: 200, height: 200 },
    { id: 'GxEPD2_154', name: '1.54" (200x200) - GDEP015OC1/D67/GDEY', width: 200, height: 200 },
    { id: 'GxEPD2_154_T8', name: '1.54" (152x152) - GDEW0154T8/M10', width: 152, height: 152 },

    // 2.13"
    { id: 'GxEPD2_213', name: '2.13" (122x250) - GDE0213B1/B72/B73/B74/BN', width: 122, height: 250 },
    { id: 'GxEPD2_213_flex', name: '2.13" (104x212) - GDEW0213I5F/M21/T5D', width: 104, height: 212 },

    // 2.6" to 2.9"
    { id: 'GxEPD2_260', name: '2.60" (152x296) - GDEW026T0/M01', width: 152, height: 296 },
    { id: 'GxEPD2_266_BN', name: '2.66" (152x296) - DEPG0266BN/GDEY', width: 152, height: 296 },
    { id: 'GxEPD2_270', name: '2.70" (176x264) - GDEW027W3/GDEY', width: 176, height: 264 },
    { id: 'GxEPD2_290', name: '2.90" (128x296) - GDEH029A1/T5/T5D/T94', width: 128, height: 296 },
    { id: 'GxEPD2_290_GDEY029T71H', name: '2.90" (168x384) - GDEY029T71H', width: 168, height: 384 },
    { id: 'GxEPD2_300c', name: '3.00" (400x300) - Waveshare 3.0"', width: 400, height: 300 },

    // 3.7" +
    { id: 'GxEPD2_370', name: '3.70" (240x416) - GDEY037T03/W7', width: 240, height: 416 },
    { id: 'GxEPD2_370_TC1', name: '3.70" (280x480) - ED037TC1', width: 280, height: 480 },
    { id: 'GxEPD2_397', name: '3.97" (480x800) - GDEM0397T81', width: 480, height: 800 },
    { id: 'GxEPD2_420', name: '4.20" (400x300) - GDEW042T2/M01/GDEY', width: 400, height: 300 },
    { id: 'GxEPD2_426', name: '4.26" (480x800) - GDEQ0426T82', width: 480, height: 800 },

    // 5.83" +
    { id: 'GxEPD2_579', name: '5.79" (792x272) - GDEY0579T93', width: 792, height: 272 },
    { id: 'GxEPD2_583', name: '5.83" (600x448) - GDEW0583T7', width: 600, height: 448 },
    { id: 'GxEPD2_583_T8', name: '5.83" (648x480) - GDEW0583T8/T31/Z83', width: 648, height: 480 },

    // 7.5" +
    { id: 'GxEPD2_750', name: '7.50" (640x384) - GDEW075T8', width: 640, height: 384 },
    { id: 'GxEPD2_750_T7', name: '7.50" (800x480) - GDEW075T7', width: 800, height: 480 },
    { id: 'GxEPD2_750c_Z90', name: '7.50" (880x528) - GDEH075Z90', width: 880, height: 528 },

    // Large
    { id: 'GxEPD2_1020', name: '10.2" (960x640) - GDEM102T91', width: 960, height: 640 },
    { id: 'GxEPD2_1160', name: '11.6" (960x640) - GDEH116T91', width: 960, height: 640 },
    { id: 'GxEPD2_1248', name: '12.48" (1304x984) - GDEW1248T3', width: 1304, height: 984 },
    { id: 'GxEPD2_1330', name: '13.3" (960x680) - GDEM133T91', width: 960, height: 680 },
];

export const colorModes = [
    { id: '1bit', name: 'BW (1-bit)' },
    { id: '3c', name: 'BWR (3-Color)' },
    { id: '4c', name: '4-Color' },
    { id: '7c', name: '7-Color' },
];

export const paletteMap = {
    '1bit': ['#000000', '#ffffff'],
    '3c': ['#000000', '#ffffff', '#ff0000'],
    '4c': ['#000000', '#ffffff', '#ff0000', '#ffff00'],
    '7c': ['#000000', '#ffffff', '#00ff00', '#0000ff', '#ff0000', '#ffff00', '#ffa500']
};
