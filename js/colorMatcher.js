// LAB color conversion functions
function rgbToLab(r, g, blue) {
    // First, convert RGB to XYZ
    r = r / 255;
    g = g / 255;
    blue = blue / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    blue = blue > 0.04045 ? Math.pow((blue + 0.055) / 1.055, 2.4) : blue / 12.92;

    const x = (r * 0.4124 + g * 0.3576 + blue * 0.1805) * 100;
    const y = (r * 0.2126 + g * 0.7152 + blue * 0.0722) * 100;
    const z = (r * 0.0193 + g * 0.1192 + blue * 0.9505) * 100;

    // Then XYZ to LAB
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    const xx = x / xn;
    const yy = y / yn;
    const zz = z / zn;

    const fx = xx > 0.008856 ? Math.pow(xx, 1/3) : (7.787 * xx) + 16/116;
    const fy = yy > 0.008856 ? Math.pow(yy, 1/3) : (7.787 * yy) + 16/116;
    const fz = zz > 0.008856 ? Math.pow(zz, 1/3) : (7.787 * zz) + 16/116;

    const L = (116 * fy) - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);

    return [L, a, b];
}

// Fine-tuned Hama bead colors (adjusted for better real-world matching)
const HAMA_COLORS = {
    'White': [255, 255, 255],      // Pure white
    'Cream': [238, 232, 215],      // Slightly warmer
    'Yellow': [255, 215, 0],       // More vibrant
    'Orange': [255, 102, 0],       // More saturated
    'Red': [230, 40, 40],          // Slightly brighter
    'Pink': [255, 155, 180],       // More saturated
    'Purple': [147, 80, 158],      // Slightly more vibrant
    'Blue': [45, 110, 200],        // More saturated
    'Light Blue': [100, 180, 210], // Adjusted tone
    'Green': [90, 170, 80],        // More natural
    'Light Green': [150, 200, 120],// More distinct
    'Brown': [139, 90, 60],        // Warmer tone
    'Grey': [145, 145, 145],       // Neutral grey
    'Black': [35, 35, 35],         // Rich black
    'Clear': [230, 230, 230],      // Slightly darker
    'Gold': [212, 175, 85],        // More metallic
};

class ColorMatcher {
    constructor(reductionLevel = 'medium') {
        this.currentLevel = reductionLevel;
        // Pre-calculate LAB values for all colors
        this.labCache = {};
        for (const [name, rgb] of Object.entries(HAMA_COLORS)) {
            this.labCache[name] = rgbToLab(...rgb);
        }
        // Strict thresholds for color matching
        this.thresholds = {
            high: 15,    // Very strict - only very close matches
            medium: 25,  // Moderate - good balance
            low: 35,     // More lenient but still maintains distinction
            none: 45     // Most lenient
        };
        this.setReductionLevel(reductionLevel);
    }

    setReductionLevel(level) {
        this.currentLevel = level;
        const colors = Object.entries(HAMA_COLORS);
        switch (level) {
            case 'high':
                this.palette = Object.fromEntries(colors.slice(0, 8));
                break;
            case 'medium':
                this.palette = Object.fromEntries(colors.slice(0, 12));
                break;
            case 'low':
                this.palette = Object.fromEntries(colors.slice(0, 16));
                break;
            default:
                this.palette = HAMA_COLORS;
        }
    }

    findClosestColor(r, g, b) {
        try {
            const labInput = rgbToLab(r, g, b);
            let minDistance = Infinity;
            let closestColor = null;
            const threshold = this.thresholds[this.currentLevel];

            for (const [name, rgb] of Object.entries(this.palette)) {
                const labColor = this.labCache[name];
                
                // Calculate color difference using CIEDE2000 formula (simplified)
                const dL = labInput[0] - labColor[0];
                const da = labInput[1] - labColor[1];
                const db = labInput[2] - labColor[2];
                
                // Stricter color matching with higher weights for better distinction
                const distance = Math.sqrt(
                    Math.pow(dL * 1.5, 2) +   // Increased lightness weight
                    Math.pow(da * 1.8, 2) +   // Increased red-green weight
                    Math.pow(db * 1.2, 2)     // Increased blue-yellow weight
                );

                // Only accept colors within threshold
                if (distance < minDistance && distance < threshold) {
                    minDistance = distance;
                    closestColor = { name, rgb };
                }
            }

            // If no color is close enough, default to the most contrasting option
            if (!closestColor) {
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                closestColor = brightness > 128 
                    ? { name: 'White', rgb: HAMA_COLORS['White'] }
                    : { name: 'Black', rgb: HAMA_COLORS['Black'] };
            }

            return closestColor;
        } catch (error) {
            console.error('Error finding closest color:', error);
            return { name: 'White', rgb: HAMA_COLORS['White'] }; // Default fallback
        }
    }
}
