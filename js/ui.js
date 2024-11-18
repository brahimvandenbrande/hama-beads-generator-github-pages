import ImageProcessor from './imageProcessor.js';

// Initialize all UI elements and event listeners
document.addEventListener('DOMContentLoaded', () => {
    const imageProcessor = new ImageProcessor();
    
    // Get UI elements
    const imageInput = document.getElementById('imageInput');
    const boardSize = document.getElementById('boardSize');
    const originalPreview = document.getElementById('originalPreview');
    const beadPreview = document.getElementById('beadPreview');
    const colorCountList = document.getElementById('colorCountList');
    const themeToggleBtn = document.getElementById('themeToggle');
    const colorReduction = document.getElementById('colorReduction');
    let currentFile = null;

    // Set initial preview messages
    originalPreview.innerHTML = `
        <div class="text-center">
            <p class="text-gray-400 text-lg mb-2">Get started by uploading an image!</p>
            <p class="text-gray-500 text-sm">We support JPG, PNG, and GIF formats.</p>
        </div>
    `;
    
    beadPreview.innerHTML = `
        <div class="text-center">
            <p class="text-gray-400 text-lg mb-2">Your bead pattern will appear here!</p>
            <p class="text-gray-500 text-sm">Once an image is processed, we'll display your pattern.</p>
        </div>
    `;

    function getBoardDimensions() {
        const size = boardSize.value.split('x').map(Number);
        return { width: size[0], height: size[1] };
    }

    async function processAndDisplayImage(file) {
        if (!file) {
            console.error('No file provided');
            return;
        }

        try {
            console.log('Processing image...');
            // Show loading state
            beadPreview.innerHTML = `
                <div class="flex items-center justify-center h-full">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
            `;

            // Display original image
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    originalPreview.innerHTML = '';
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '100%';
                    originalPreview.appendChild(img);

                    try {
                        // Get current board dimensions and color reduction mode
                        const { width, height } = getBoardDimensions();
                        const reduction = colorReduction.value;
                        
                        console.log('Processing with:', {
                            dimensions: `${width}x${height}`,
                            colorReduction: reduction
                        });

                        // Process the image
                        const result = await imageProcessor.processImage(file, width, height, {
                            colorReduction: reduction
                        });

                        // Display processed image
                        beadPreview.innerHTML = '';
                        result.canvas.className = 'max-w-full max-h-full object-contain';
                        beadPreview.appendChild(result.canvas);

                        // Update color counts
                        updateColorCount(result.colorCounts);
                    } catch (error) {
                        console.error('Error during image processing:', error);
                        beadPreview.innerHTML = `
                            <div class="flex items-center justify-center h-full text-red-500">
                                <p>Error processing image: ${error.message}</p>
                            </div>
                        `;
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Error in processAndDisplayImage:', error);
            beadPreview.innerHTML = `
                <div class="flex items-center justify-center h-full text-red-500">
                    <p>Error processing image</p>
                </div>
            `;
        }
    }

    function updateColorCount(colorCounts) {
        colorCountList.innerHTML = '';
        
        // Calculate total beads
        const totalBeads = Object.values(colorCounts).reduce((sum, count) => sum + count, 0);
        
        // Add total count
        const totalItem = document.createElement('div');
        totalItem.className = 'flex items-center justify-between text-sm font-semibold mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded';
        totalItem.innerHTML = `
            <span class="text-gray-700 dark:text-gray-300">Total Beads</span>
            <span class="text-gray-500 dark:text-gray-400">${totalBeads}</span>
        `;
        colorCountList.appendChild(totalItem);
        
        // Add individual color counts
        Object.entries(colorCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([color, count]) => {
                const percentage = ((count / totalBeads) * 100).toFixed(1);
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200';
                
                // Get the color RGB values from the ImageProcessor's color palette
                const colorInfo = imageProcessor.getColorPalette()
                    .find(c => c.name === color);
                
                item.innerHTML = `
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-full" style="background-color: rgb(${colorInfo?.r || 0}, ${colorInfo?.g || 0}, ${colorInfo?.b || 0})"></div>
                        <span class="text-gray-700 dark:text-gray-300">${color}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-gray-500 dark:text-gray-400">${count}</span>
                        <span class="text-gray-400 dark:text-gray-500 text-xs">(${percentage}%)</span>
                    </div>
                `;
                colorCountList.appendChild(item);
            });
    }

    // Event Listeners
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            currentFile = file;
            processAndDisplayImage(file);
        }
    });

    boardSize.addEventListener('change', () => {
        if (currentFile) {
            processAndDisplayImage(currentFile);
        }
    });

    colorReduction.addEventListener('change', () => {
        if (currentFile) {
            processAndDisplayImage(currentFile);
        }
    });

    // Theme toggle functionality
    function initThemeToggle() {
        function isDarkMode() {
            return document.documentElement.classList.contains('dark');
        }

        function updateTheme(darkMode) {
            if (darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            localStorage.theme = darkMode ? 'dark' : 'light';
        }

        // Set initial theme
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            updateTheme(true);
        } else {
            updateTheme(false);
        }

        // Toggle theme on button click
        themeToggleBtn.addEventListener('click', () => {
            const newTheme = !isDarkMode();
            updateTheme(newTheme);
        });
    }

    initThemeToggle();
});
