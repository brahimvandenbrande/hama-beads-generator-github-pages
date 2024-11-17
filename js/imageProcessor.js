class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.colorMatcher = new ColorMatcher();
    }

    async processImage(imageFile, width, height, colorReduction) {
        try {
            const img = await this.loadImage(imageFile);
            
            // Create a temporary canvas for initial resize
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            // Set canvas sizes
            tempCanvas.width = width;
            tempCanvas.height = height;
            this.canvas.width = width * 10; // Make each bead 10x10 pixels
            this.canvas.height = height * 10;
            
            // Configure image smoothing
            tempCtx.imageSmoothingEnabled = false;
            this.ctx.imageSmoothingEnabled = false;
            
            // Draw and resize image
            tempCtx.drawImage(img, 0, 0, width, height);
            
            // Get image data
            const imageData = tempCtx.getImageData(0, 0, width, height);
            const { data } = imageData;
            
            // Update color matcher reduction level
            this.colorMatcher.setReductionLevel(colorReduction);
            
            // Process each pixel
            const beadPattern = [];
            const colorCounts = {};
            
            // Clear the main canvas
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            for (let y = 0; y < height; y++) {
                const row = [];
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    const color = this.colorMatcher.findClosestColor(
                        data[i],     // R
                        data[i + 1], // G
                        data[i + 2]  // B
                    );
                    
                    if (color) {
                        // Update color counts
                        colorCounts[color.name] = (colorCounts[color.name] || 0) + 1;
                        
                        // Draw a bead (circle) on the main canvas
                        this.ctx.fillStyle = `rgb(${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]})`;
                        this.ctx.beginPath();
                        const centerX = x * 10 + 5;
                        const centerY = y * 10 + 5;
                        const radius = 4;
                        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // Add a subtle border
                        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                        this.ctx.lineWidth = 1;
                        this.ctx.stroke();
                        
                        row.push(color);
                    }
                }
                beadPattern.push(row);
            }
            
            return {
                pattern: beadPattern,
                colorCounts,
                canvas: this.canvas
            };
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
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
