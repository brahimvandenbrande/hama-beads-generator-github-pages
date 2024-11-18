class ImageProcessor {
    constructor() {
        // Available Hama bead colors (standard set)
        this.availableBeadColors = [
            { name: 'White', r: 255, g: 255, b: 255 },
            { name: 'Cream', r: 255, g: 253, b: 208 },
            { name: 'Peach', r: 255, g: 218, b: 185 },
            { name: 'Light Pink', r: 255, g: 182, b: 193 },
            { name: 'Pink', r: 255, g: 192, b: 203 },
            { name: 'Yellow', r: 255, g: 255, b: 0 },
            { name: 'Orange', r: 255, g: 128, b: 0 },
            { name: 'Red', r: 255, g: 0, b: 0 },
            { name: 'Purple', r: 128, g: 0, b: 128 },
            { name: 'Dark Blue', r: 0, g: 0, b: 139 },
            { name: 'Blue', r: 0, g: 0, b: 255 },
            { name: 'Light Blue', r: 173, g: 216, b: 230 },
            { name: 'Green', r: 0, g: 255, b: 0 },
            { name: 'Dark Green', r: 0, g: 100, b: 0 },
            { name: 'Brown', r: 139, g: 69, b: 19 },
            { name: 'Light Brown', r: 205, g: 133, b: 63 },
            { name: 'Light Grey', r: 192, g: 192, b: 192 },
            { name: 'Grey', r: 128, g: 128, b: 128 },
            { name: 'Black', r: 0, g: 0, b: 0 }
        ];

        // Define skin tone ranges (in HSV color space)
        this.skinToneRanges = [
            // Light skin
            { hMin: 0, hMax: 50, sMin: 0.1, sMax: 0.6, vMin: 0.5, vMax: 1.0 },
            // Medium skin
            { hMin: 0, hMax: 35, sMin: 0.2, sMax: 0.7, vMin: 0.4, vMax: 0.9 },
            // Dark skin
            { hMin: 0, hMax: 40, sMin: 0.15, sMax: 0.8, vMin: 0.2, vMax: 0.8 }
        ];

        // Eye color characteristics
        this.eyeCharacteristics = {
            // Dark eyes (brown, dark blue, etc.)
            dark: {
                luminanceMax: 0.3,
                saturationMin: 0.2
            },
            // Light eyes (blue, green, etc.)
            light: {
                luminanceMin: 0.3,
                saturationMin: 0.3
            },
            // White of the eye
            sclera: {
                luminanceMin: 0.8,
                saturationMax: 0.2
            }
        };
    }

    detectEyeRegions(imageData, faceMask) {
        const { width, height } = imageData;
        const data = imageData.data;
        const eyeMask = new Uint8Array(width * height);
        
        // Only search for eyes in the upper half of face regions
        const faceTop = Math.floor(height * 0.2);
        const faceBottom = Math.floor(height * 0.5);
        
        // Sliding window parameters for eye detection
        const windowSize = Math.floor(width * 0.1); // Approximate eye size
        const stride = Math.floor(windowSize / 2);
        
        for (let y = faceTop; y < faceBottom; y += stride) {
            for (let x = 0; x < width - windowSize; x += stride) {
                if (!this.isInFaceRegion(x, y, faceMask, width)) continue;
                
                const isEye = this.analyzeWindowForEye(
                    data, 
                    x, y, 
                    windowSize, 
                    width, 
                    height
                );
                
                if (isEye) {
                    this.markEyeRegion(eyeMask, x, y, windowSize, width);
                }
            }
        }
        
        return eyeMask;
    }

    isInFaceRegion(x, y, faceMask, width) {
        const idx = y * width + x;
        return faceMask[idx] === 1;
    }

    analyzeWindowForEye(data, startX, startY, windowSize, width, height) {
        let darkPixels = 0;
        let lightPixels = 0;
        let totalPixels = 0;
        
        // Count dark and light pixels in the window
        for (let y = startY; y < Math.min(startY + windowSize, height); y++) {
            for (let x = startX; x < Math.min(startX + windowSize, width); x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                const luminance = this.getLuminance(r, g, b);
                const saturation = this.getSaturation(r, g, b);
                
                if (this.isEyePixel(luminance, saturation)) {
                    darkPixels++;
                } else if (this.isScleraPixel(luminance, saturation)) {
                    lightPixels++;
                }
                totalPixels++;
            }
        }
        
        // Check if the pattern matches eye characteristics
        const darkRatio = darkPixels / totalPixels;
        const lightRatio = lightPixels / totalPixels;
        
        return darkRatio > 0.15 && lightRatio > 0.2;
    }

    markEyeRegion(eyeMask, x, y, windowSize, width) {
        // Mark the detected eye region and a small border around it
        const border = Math.floor(windowSize * 0.2);
        for (let dy = -border; dy < windowSize + border; dy++) {
            for (let dx = -border; dx < windowSize + border; dx++) {
                const idx = (y + dy) * width + (x + dx);
                if (idx >= 0 && idx < eyeMask.length) {
                    eyeMask[idx] = 1;
                }
            }
        }
    }

    getLuminance(r, g, b) {
        // Convert RGB to relative luminance
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    getSaturation(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        return max === 0 ? 0 : (max - min) / max;
    }

    isEyePixel(luminance, saturation) {
        // Check if pixel matches eye characteristics (iris/pupil)
        return (
            (luminance <= this.eyeCharacteristics.dark.luminanceMax && 
             saturation >= this.eyeCharacteristics.dark.saturationMin) ||
            (luminance >= this.eyeCharacteristics.light.luminanceMin && 
             saturation >= this.eyeCharacteristics.light.saturationMin)
        );
    }

    isScleraPixel(luminance, saturation) {
        // Check if pixel matches sclera (white of eye) characteristics
        return (
            luminance >= this.eyeCharacteristics.sclera.luminanceMin && 
            saturation <= this.eyeCharacteristics.sclera.saturationMax
        );
    }

    createOptimizedPalette(imageData, numColors) {
        const { width, height } = imageData;
        const data = imageData.data;
        
        if (numColors === 2) {
            return ['Black', 'White'];
        }

        // Detect subject and face regions
        const edges = this.detectEdges(data, width, height);
        const subjectMask = this.identifySubject(edges, width, height);
        const { faceMask, isFace } = this.detectFaceRegion(imageData, subjectMask);
        
        // If it's a face, also detect eyes
        const eyeMask = isFace ? this.detectEyeRegions(imageData, faceMask) : null;

        const colorMap = new Map();
        const subjectColorMap = new Map();
        const faceColorMap = new Map();
        const eyeColorMap = new Map();

        // Collect colors separately for eyes, face, subject, and background
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const key = `${r},${g},${b}`;
            
            if (isFace && eyeMask && eyeMask[i/4]) {
                // Eye colors get highest weight
                eyeColorMap.set(key, (eyeColorMap.get(key) || 0) + 8);
            } else if (isFace && faceMask[i/4]) {
                // Face colors get high weight
                faceColorMap.set(key, (faceColorMap.get(key) || 0) + 5);
            } else if (subjectMask[i/4]) {
                // Subject colors get medium weight
                subjectColorMap.set(key, (subjectColorMap.get(key) || 0) + 3);
            } else {
                // Background colors get lowest weight
                colorMap.set(key, (colorMap.get(key) || 0) + 1);
            }
        }

        const mapToColors = map => Array.from(map.entries())
            .map(([key, count]) => {
                const [r, g, b] = key.split(',').map(Number);
                return { r, g, b, count };
            });

        // Convert color maps to arrays
        const eyeColors = mapToColors(eyeColorMap);
        const faceColors = mapToColors(faceColorMap);
        const subjectColors = mapToColors(subjectColorMap);
        const backgroundColors = mapToColors(colorMap);

        // Allocate colors based on content
        let eyeColorCount = 0;
        let faceColorCount = 0;
        let subjectColorCount = 0;
        let backgroundColorCount = 0;

        if (isFace && eyeColors.length > 0) {
            // If face with eyes detected, prioritize eyes
            eyeColorCount = Math.ceil(numColors * 0.3);
            faceColorCount = Math.ceil(numColors * 0.3);
            subjectColorCount = Math.ceil(numColors * 0.25);
            backgroundColorCount = numColors - eyeColorCount - faceColorCount - subjectColorCount;
        } else if (isFace) {
            // If face without clear eyes detected
            faceColorCount = Math.ceil(numColors * 0.4);
            subjectColorCount = Math.ceil(numColors * 0.4);
            backgroundColorCount = numColors - faceColorCount - subjectColorCount;
        } else {
            // Otherwise, maintain previous distribution
            subjectColorCount = Math.ceil(numColors * 0.7);
            backgroundColorCount = numColors - subjectColorCount;
        }

        // Cluster colors separately
        const eyeClusters = eyeColorCount > 0 ? this.clusterColors(eyeColors, eyeColorCount) : [];
        const faceClusters = faceColorCount > 0 ? this.clusterColors(faceColors, faceColorCount) : [];
        const subjectClusters = this.clusterColors(subjectColors, subjectColorCount);
        const backgroundClusters = this.clusterColors(backgroundColors, backgroundColorCount);

        // Combine clusters and convert to bead colors
        const allClusters = [...eyeClusters, ...faceClusters, ...subjectClusters, ...backgroundClusters];
        
        return allClusters.map(cluster => {
            const avgColor = this.getClusterAverage(cluster);
            
            // Special handling for eye colors
            if (eyeColors.length > 0 && this.isEyePixel(
                this.getLuminance(avgColor.r, avgColor.g, avgColor.b),
                this.getSaturation(avgColor.r, avgColor.g, avgColor.b)
            )) {
                return this.findClosestEyeColor(avgColor);
            }
            
            // Use perceptual matching for skin tones
            if (this.isSkinTone(avgColor.r, avgColor.g, avgColor.b)) {
                return this.findClosestSkinToneBeadColor(avgColor);
            }
            
            return this.findClosestBeadColor(avgColor);
        });
    }

    findClosestEyeColor(color) {
        const luminance = this.getLuminance(color.r, color.g, color.b);
        const saturation = this.getSaturation(color.r, color.g, color.b);
        
        // For sclera (white of eye), prefer white or cream
        if (this.isScleraPixel(luminance, saturation)) {
            const scleraColors = ['White', 'Cream'];
            return this.findClosestFromSet(color, scleraColors);
        }
        
        // For dark eyes, prefer darker colors
        if (luminance <= this.eyeCharacteristics.dark.luminanceMax) {
            const darkEyeColors = ['Black', 'Dark Blue', 'Brown', 'Dark Green'];
            return this.findClosestFromSet(color, darkEyeColors);
        }
        
        // For light eyes, prefer brighter colors
        const lightEyeColors = ['Blue', 'Light Blue', 'Green', 'Light Brown'];
        return this.findClosestFromSet(color, lightEyeColors);
    }

    findClosestFromSet(color, colorSet) {
        return this.availableBeadColors
            .filter(bead => colorSet.includes(bead.name))
            .reduce((closest, beadColor) => {
                const distance = this.colorDistance(
                    color.r, color.g, color.b,
                    beadColor.r, beadColor.g, beadColor.b
                );
                if (distance < closest.distance) {
                    return { ...beadColor, distance };
                }
                return closest;
            }, { distance: Infinity }).name;
    }

    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;

        let h = 0;
        if (diff === 0) {
            h = 0;
        } else if (max === r) {
            h = ((g - b) / diff) % 6;
        } else if (max === g) {
            h = (b - r) / diff + 2;
        } else {
            h = (r - g) / diff + 4;
        }

        h = Math.round(h * 60);
        if (h < 0) h += 360;

        const s = max === 0 ? 0 : diff / max;
        const v = max;

        return { h, s, v };
    }

    isSkinTone(r, g, b) {
        const hsv = this.rgbToHsv(r, g, b);
        return this.skinToneRanges.some(range => 
            hsv.h >= range.hMin && 
            hsv.h <= range.hMax && 
            hsv.s >= range.sMin && 
            hsv.s <= range.sMax && 
            hsv.v >= range.vMin && 
            hsv.v <= range.vMax
        );
    }

    detectFaceRegion(imageData, subjectMask) {
        const { width, height } = imageData;
        const data = imageData.data;
        const faceMask = new Uint8Array(width * height);
        
        // Count skin tone pixels in subject area
        let skinToneCount = 0;
        let totalPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
            if (subjectMask[i/4]) {
                totalPixels++;
                if (this.isSkinTone(data[i], data[i + 1], data[i + 2])) {
                    skinToneCount++;
                    faceMask[i/4] = 1;
                }
            }
        }

        // If significant portion is skin tone, consider it a face
        const skinToneRatio = skinToneCount / totalPixels;
        const isFace = skinToneRatio > 0.15; // If more than 15% is skin tone

        return { faceMask, isFace };
    }

    findClosestSkinToneBeadColor(color) {
        // Define skin tone bead colors to choose from
        const skinToneBeads = ['Peach', 'Light Pink', 'Cream', 'Light Brown', 'Brown'];
        
        return this.availableBeadColors
            .filter(bead => skinToneBeads.includes(bead.name))
            .reduce((closest, beadColor) => {
                const distance = this.colorDistance(
                    color.r, color.g, color.b,
                    beadColor.r, beadColor.g, beadColor.b
                );
                if (distance < closest.distance) {
                    return { ...beadColor, distance };
                }
                return closest;
            }, { distance: Infinity }).name;
    }

    colorDistance(r1, g1, b1, r2, g2, b2) {
        // Using CIEDE2000 color difference formula for better skin tone matching
        const lab1 = this.rgbToLab(r1, g1, b1);
        const lab2 = this.rgbToLab(r2, g2, b2);
        
        // Weighted components for better skin tone matching
        const dl = lab1.l - lab2.l;
        const da = lab1.a - lab2.a;
        const db = lab1.b - lab2.b;
        
        // Higher weight for a* (red-green) component which is important for skin tones
        return Math.sqrt(
            dl * dl * 1.0 +
            da * da * 1.5 + // Higher weight for red-green
            db * db * 1.0
        );
    }

    rgbToLab(r, g, b) {
        // Convert RGB to CIE L*a*b* color space for better perceptual matching
        r /= 255;
        g /= 255;
        b /= 255;

        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
        let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
        let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;

        x /= 95.047;
        y /= 100.000;
        z /= 108.883;

        x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
        y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
        z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

        return {
            l: (116 * y) - 16,
            a: 500 * (x - y),
            b: 200 * (y - z)
        };
    }

    async processImage(file, width, height, options = {}) {
        try {
            const img = await this.loadImage(file);
            
            // Create a temporary canvas for initial image scaling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            // Set canvas size to match desired dimensions
            tempCanvas.width = width;
            tempCanvas.height = height;
            
            // Disable image smoothing for sharp pixels
            tempCtx.imageSmoothingEnabled = false;
            tempCtx.webkitImageSmoothingEnabled = false;
            tempCtx.mozImageSmoothingEnabled = false;
            tempCtx.msImageSmoothingEnabled = false;
            
            // Draw the initial image
            tempCtx.drawImage(img, 0, 0, width, height);
            
            // Get the pixel data
            let imageData = tempCtx.getImageData(0, 0, width, height);
            
            // Apply pre-processing to simplify the image
            imageData = this.preprocessImage(imageData, options.colorReduction || 'standard');
            
            // Analyze image and create optimized palette
            const numColors = this.getNumColorsForMode(options.colorReduction || 'standard');
            const palette = this.createOptimizedPalette(imageData, numColors);
            
            // Process pixels and get color counts
            const colorCounts = this.processPixels(imageData, palette);
            
            // Create the final canvas with larger beads
            const beadSize = 20;
            const finalCanvas = document.createElement('canvas');
            const finalCtx = finalCanvas.getContext('2d');
            finalCanvas.width = width * beadSize;
            finalCanvas.height = height * beadSize;
            
            // Disable smoothing on final canvas
            finalCtx.imageSmoothingEnabled = false;
            finalCtx.webkitImageSmoothingEnabled = false;
            finalCtx.mozImageSmoothingEnabled = false;
            finalCtx.msImageSmoothingEnabled = false;
            
            // Draw each bead
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];
                    
                    const beadX = x * beadSize;
                    const beadY = y * beadSize;
                    
                    // Draw circular bead
                    finalCtx.fillStyle = `rgb(${r},${g},${b})`;
                    finalCtx.beginPath();
                    finalCtx.arc(
                        beadX + beadSize/2,
                        beadY + beadSize/2,
                        beadSize/2 - 1,
                        0,
                        Math.PI * 2
                    );
                    finalCtx.fill();
                    
                    // Add a stronger border
                    finalCtx.strokeStyle = 'rgba(0,0,0,0.3)';
                    finalCtx.lineWidth = 1;
                    finalCtx.stroke();
                    
                    // Add highlight
                    finalCtx.strokeStyle = 'rgba(255,255,255,0.2)';
                    finalCtx.beginPath();
                    finalCtx.arc(
                        beadX + beadSize/2 - beadSize/6,
                        beadY + beadSize/2 - beadSize/6,
                        beadSize/6,
                        0,
                        Math.PI * 2
                    );
                    finalCtx.stroke();
                }
            }

            return {
                canvas: finalCanvas,
                colorCounts: colorCounts
            };
        } catch (error) {
            console.error('Error in processImage:', error);
            throw error;
        }
    }

    getNumColorsForMode(mode) {
        switch (mode) {
            case 'minimal': return 4;
            case 'basic': return 8;
            case 'detailed': return 16;
            case 'bw': return 2;
            case 'standard':
            default: return 12;
        }
    }

    clusterColors(colors, numClusters) {
        if (colors.length <= numClusters) {
            return colors.map(c => [c]);
        }

        // Initialize clusters with the most frequent colors
        let clusters = colors.slice(0, numClusters).map(c => [c]);
        
        // Assign remaining colors to nearest cluster
        for (let i = numClusters; i < colors.length; i++) {
            const color = colors[i];
            let minDistance = Infinity;
            let closestCluster = 0;

            clusters.forEach((cluster, index) => {
                const centerColor = this.getClusterAverage(cluster);
                const distance = this.colorDistance(
                    color.r, color.g, color.b,
                    centerColor.r, centerColor.g, centerColor.b
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCluster = index;
                }
            });

            clusters[closestCluster].push(color);
        }

        return clusters;
    }

    getClusterAverage(cluster) {
        const total = cluster.reduce((acc, color) => {
            acc.r += color.r * color.count;
            acc.g += color.g * color.count;
            acc.b += color.b * color.count;
            acc.count += color.count;
            return acc;
        }, { r: 0, g: 0, b: 0, count: 0 });

        return {
            r: Math.round(total.r / total.count),
            g: Math.round(total.g / total.count),
            b: Math.round(total.b / total.count)
        };
    }

    findClosestBeadColor(color) {
        return this.availableBeadColors.reduce((closest, beadColor) => {
            const distance = this.colorDistance(
                color.r, color.g, color.b,
                beadColor.r, beadColor.g, beadColor.b
            );
            if (distance < closest.distance) {
                return { ...beadColor, distance };
            }
            return closest;
        }, { distance: Infinity }).name;
    }

    getColorPalette() {
        return this.availableBeadColors;
    }

    preprocessImage(imageData, mode) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data);

        // Step 1: Enhance contrast to make subject more distinct
        this.enhanceContrast(newData);

        // Step 2: Apply edge detection to identify subject boundaries
        const edges = this.detectEdges(newData, width, height);

        // Step 3: Identify main subject area using edge density
        const subjectMask = this.identifySubject(edges, width, height);

        // Step 4: Apply different processing for subject and background
        for (let i = 0; i < data.length; i += 4) {
            const isSubject = subjectMask[i/4];
            
            if (this.getNumColorsForMode(mode) === 2) {
                // For B&W mode, use different thresholds for subject vs background
                const gray = Math.round((newData[i] * 0.299 + newData[i + 1] * 0.587 + newData[i + 2] * 0.114));
                const threshold = isSubject ? 127 : 160; // Higher threshold for background
                newData[i] = newData[i + 1] = newData[i + 2] = gray > threshold ? 255 : 0;
            } else {
                // For color modes, apply stronger quantization to background
                const quantizationLevel = isSubject ? 32 : 64; // More colors for subject
                newData[i] = Math.round(newData[i] / quantizationLevel) * quantizationLevel;
                newData[i + 1] = Math.round(newData[i + 1] / quantizationLevel) * quantizationLevel;
                newData[i + 2] = Math.round(newData[i + 2] / quantizationLevel) * quantizationLevel;
            }
        }

        return new ImageData(newData, width, height);
    }

    detectEdges(data, width, height) {
        const edges = new Uint8Array(width * height);
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;

                // Apply Sobel operator
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const val = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        const kidx = (ky + 1) * 3 + (kx + 1);
                        gx += val * sobelX[kidx];
                        gy += val * sobelY[kidx];
                    }
                }

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                edges[y * width + x] = magnitude > 30 ? 255 : 0;
            }
        }

        return edges;
    }

    identifySubject(edges, width, height) {
        const mask = new Uint8Array(width * height);
        const windowSize = 5;
        const threshold = 3;

        // Calculate edge density in windows
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let edgeCount = 0;

                // Count edges in surrounding window
                for (let wy = -windowSize; wy <= windowSize; wy++) {
                    for (let wx = -windowSize; wx <= windowSize; wx++) {
                        const ny = y + wy;
                        const nx = x + wx;
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            if (edges[ny * width + nx] > 0) {
                                edgeCount++;
                            }
                        }
                    }
                }

                // Mark as subject if edge density is high enough
                mask[y * width + x] = edgeCount > threshold ? 1 : 0;
            }
        }

        // Dilate the mask to include nearby areas
        const dilatedMask = new Uint8Array(width * height);
        const dilationRadius = 3;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let isNearSubject = false;
                for (let dy = -dilationRadius; dy <= dilationRadius && !isNearSubject; dy++) {
                    for (let dx = -dilationRadius; dx <= dilationRadius && !isNearSubject; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            if (mask[ny * width + nx]) {
                                isNearSubject = true;
                            }
                        }
                    }
                }
                dilatedMask[y * width + x] = isNearSubject ? 1 : 0;
            }
        }

        return dilatedMask;
    }

    enhanceContrast(data) {
        // Find min and max values
        let min = 255, max = 0;
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            min = Math.min(min, brightness);
            max = Math.max(max, brightness);
        }

        // Apply contrast stretching
        const range = max - min;
        if (range > 0) {
            for (let i = 0; i < data.length; i += 4) {
                for (let j = 0; j < 3; j++) {
                    data[i + j] = ((data[i + j] - min) / range) * 255;
                }
            }
        }
    }

    medianFilter(data, width, height) {
        const radius = 1;
        const temp = new Uint8ClampedArray(data);

        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                const i = (y * width + x) * 4;
                const values = { r: [], g: [], b: [] };

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const ni = ((y + dy) * width + (x + dx)) * 4;
                        values.r.push(temp[ni]);
                        values.g.push(temp[ni + 1]);
                        values.b.push(temp[ni + 2]);
                    }
                }

                values.r.sort((a, b) => a - b);
                values.g.sort((a, b) => a - b);
                values.b.sort((a, b) => a - b);

                const mid = Math.floor(values.r.length / 2);
                data[i] = values.r[mid];
                data[i + 1] = values.g[mid];
                data[i + 2] = values.b[mid];
            }
        }
    }

    processPixels(imageData, palette) {
        const data = imageData.data;
        const colorCounts = {};
        
        // Initialize color counts for all available colors
        this.availableBeadColors.forEach(color => {
            colorCounts[color.name] = 0;
        });

        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            let closestColor;
            if (palette.length === 2) {
                // For black and white mode, use simple threshold
                const brightness = (r + g + b) / 3;
                closestColor = brightness > 127 ? 'White' : 'Black';
            } else {
                // For color modes, find the closest matching bead color
                closestColor = this.findClosestBeadColor({ r, g, b });
            }
            
            // Get the actual RGB values for this bead color
            const beadColor = this.availableBeadColors.find(c => c.name === closestColor);
            
            // Update pixel color
            data[i] = beadColor.r;
            data[i + 1] = beadColor.g;
            data[i + 2] = beadColor.b;
            
            // Update color count
            colorCounts[closestColor]++;
        }

        // Filter out unused colors
        return Object.fromEntries(
            Object.entries(colorCounts).filter(([_, count]) => count > 0)
        );
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }
}

export default ImageProcessor;
