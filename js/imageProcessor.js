class ImageProcessor {
    constructor() {
        // Available Hama bead colors (standard set)
        this.availableBeadColors = [
            { name: 'White', r: 255, g: 255, b: 255 },
            { name: 'Cream', r: 255, g: 253, b: 208 },
            { name: 'Yellow', r: 255, g: 255, b: 0 },
            { name: 'Orange', r: 255, g: 128, b: 0 },
            { name: 'Red', r: 255, g: 0, b: 0 },
            { name: 'Pink', r: 255, g: 192, b: 203 },
            { name: 'Purple', r: 128, g: 0, b: 128 },
            { name: 'Dark Blue', r: 0, g: 0, b: 139 },
            { name: 'Blue', r: 0, g: 0, b: 255 },
            { name: 'Light Blue', r: 173, g: 216, b: 230 },
            { name: 'Green', r: 0, g: 255, b: 0 },
            { name: 'Dark Green', r: 0, g: 100, b: 0 },
            { name: 'Brown', r: 139, g: 69, b: 19 },
            { name: 'Light Grey', r: 192, g: 192, b: 192 },
            { name: 'Grey', r: 128, g: 128, b: 128 },
            { name: 'Black', r: 0, g: 0, b: 0 }
        ];
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

    createOptimizedPalette(imageData, numColors) {
        const { width, height } = imageData;
        const data = imageData.data;
        
        // Special handling for black and white mode
        if (numColors === 2) {
            return ['Black', 'White'];
        }

        // Detect subject area
        const edges = this.detectEdges(data, width, height);
        const subjectMask = this.identifySubject(edges, width, height);

        const colorMap = new Map();
        const subjectColorMap = new Map();

        // Collect colors separately for subject and background
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const key = `${r},${g},${b}`;
            
            if (subjectMask[i/4]) {
                // Subject colors get higher weight
                subjectColorMap.set(key, (subjectColorMap.get(key) || 0) + 3);
            } else {
                colorMap.set(key, (colorMap.get(key) || 0) + 1);
            }
        }

        // Combine colors, giving priority to subject colors
        const subjectColors = Array.from(subjectColorMap.entries())
            .map(([key, count]) => {
                const [r, g, b] = key.split(',').map(Number);
                return { r, g, b, count };
            });

        const backgroundColors = Array.from(colorMap.entries())
            .map(([key, count]) => {
                const [r, g, b] = key.split(',').map(Number);
                return { r, g, b, count };
            });

        // Allocate more colors to the subject
        const subjectColorCount = Math.ceil(numColors * 0.7);
        const backgroundColorCount = numColors - subjectColorCount;

        // Cluster colors separately for subject and background
        const subjectClusters = this.clusterColors(subjectColors, subjectColorCount);
        const backgroundClusters = this.clusterColors(backgroundColors, backgroundColorCount);

        // Combine and convert to bead colors
        const allClusters = [...subjectClusters, ...backgroundClusters];
        return allClusters.map(cluster => {
            const avgColor = this.getClusterAverage(cluster);
            return this.findClosestBeadColor(avgColor);
        });
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

    colorDistance(r1, g1, b1, r2, g2, b2) {
        // Using weighted Euclidean distance for better perceptual color matching
        const rMean = (r1 + r2) / 2;
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        
        // Weights based on human perception
        const weightR = 2 + rMean / 256;
        const weightG = 4.0;
        const weightB = 2 + (255 - rMean) / 256;
        
        return Math.sqrt(
            weightR * dr * dr +
            weightG * dg * dg +
            weightB * db * db
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
