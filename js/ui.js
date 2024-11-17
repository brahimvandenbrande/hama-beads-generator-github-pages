// Initialize all UI elements and event listeners
document.addEventListener('DOMContentLoaded', () => {
    const imageProcessor = new ImageProcessor();
    const imageInput = document.getElementById('imageInput');
    const randomImageBtn = document.getElementById('randomImage');
    const boardSize = document.getElementById('boardSize');
    const colorReduction = document.getElementById('colorReduction');
    const originalPreview = document.getElementById('originalPreview');
    const beadPreview = document.getElementById('beadPreview');
    const colorCountList = document.getElementById('colorCountList');
    const themeToggleBtn = document.getElementById('themeToggle');

    // Initialize GSAP
    gsap.registerPlugin(ScrollTrigger);

    // Set initial preview messages
    originalPreview.innerHTML = `
        <div class="text-center">
            <p class="text-gray-400 text-lg mb-2">Get started by uploading or generating an image!</p>
            <p class="text-gray-500 text-sm">We support JPG, PNG, and GIF formats.</p>
            <p class="text-gray-500 text-sm">Drag and drop or click to select a file.</p>
        </div>
    `;
    
    beadPreview.innerHTML = `
        <div class="text-center">
            <p class="text-gray-400 text-lg mb-2">Your custom bead pattern will appear here!</p>
            <p class="text-gray-500 text-sm">Once an image is processed, we'll display your unique bead design.</p>
        </div>
    `;

    // Animation for elements appearing
    function animateElement(element, delay = 0) {
        gsap.from(element, {
            duration: 0.5,
            opacity: 0,
            y: 20,
            delay: delay,
            ease: "power2.out"
        });
    }

    function getBoardDimensions() {
        const [width, height] = boardSize.value.split('x').map(Number);
        return { width, height };
    }

    async function fetchRandomImage() {
        const UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY'; // Replace with your key
        try {
            updateLoadingState(true);
            originalPreview.innerHTML = '<p class="text-gray-500">Loading random image...</p>';
            originalPreview.classList.add('loading');

            const response = await fetch(`https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}`);
            const data = await response.json();
            
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = data.urls.regular;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            originalPreview.classList.remove('loading');
            processAndDisplayImage(await imageToFile(img));
        } catch (error) {
            handleError(error);
        } finally {
            updateLoadingState(false);
        }
    }

    async function imageToFile(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(new File([blob], 'random-image.jpg', { type: 'image/jpeg' }));
            }, 'image/jpeg');
        });
    }

    async function processAndDisplayImage(file) {
        try {
            updateLoadingState(true);
            announceToScreenReader('Processing image, please wait...');

            // Display original image
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'max-w-full max-h-full object-contain rounded-lg';
            img.alt = 'Original uploaded image';
            img.style.opacity = '0';
            
            const container = document.getElementById('originalPreview');
            container.innerHTML = '';
            container.appendChild(img);
            
            // Animate image appearance
            gsap.to(img, {
                opacity: 1,
                duration: 0.5,
                ease: "power2.out"
            });

            // Process the image
            const { width, height } = getBoardDimensions();
            const result = await imageProcessor.processImage(
                file,
                width,
                height,
                colorReduction.value
            );

            // Display processed image
            const beadPreview = document.getElementById('beadPreview');
            beadPreview.innerHTML = '';
            result.canvas.className = 'max-w-full max-h-full object-contain rounded-lg';
            result.canvas.style.opacity = '0';
            beadPreview.appendChild(result.canvas);

            // Animate processed image appearance
            gsap.to(result.canvas, {
                opacity: 1,
                duration: 0.5,
                ease: "power2.out"
            });

            // Update color counts
            updateColorCount(result.colorCounts);
            
            updateLoadingState(false);
            announceToScreenReader('Image processing complete');
        } catch (error) {
            handleError(error);
        }
    }

    // Accessibility helper functions
    function announceToScreenReader(message) {
        const statusElement = document.getElementById('status-messages');
        statusElement.textContent = message;
    }

    function showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-500/10 text-red-500 p-4 rounded-lg text-center';
        errorDiv.textContent = message;

        // Show error in both preview areas
        originalPreview.innerHTML = '';
        originalPreview.appendChild(errorDiv.cloneNode(true));
        beadPreview.innerHTML = '';
        beadPreview.appendChild(errorDiv);

        // Animate error message
        gsap.from([originalPreview.firstChild, beadPreview.firstChild], {
            opacity: 0,
            y: 20,
            duration: 0.3,
            stagger: 0.1,
            ease: "power2.out"
        });
    }

    function showLoadingState() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'flex items-center justify-center space-x-2';
        loadingDiv.innerHTML = `
            <div class="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
            <div class="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        `;
        return loadingDiv;
    }

    function updateLoadingState(isLoading) {
        const originalPreview = document.getElementById('originalPreview');
        const beadPreview = document.getElementById('beadPreview');
        
        if (isLoading) {
            originalPreview.innerHTML = '';
            beadPreview.innerHTML = '';
            originalPreview.appendChild(showLoadingState());
            beadPreview.appendChild(showLoadingState().cloneNode(true));
            
            originalPreview.classList.add('loading');
            beadPreview.classList.add('loading');
            originalPreview.setAttribute('aria-busy', 'true');
            beadPreview.setAttribute('aria-busy', 'true');
            announceToScreenReader('Processing image, please wait...');
        } else {
            originalPreview.classList.remove('loading');
            beadPreview.classList.remove('loading');
            originalPreview.setAttribute('aria-busy', 'false');
            beadPreview.setAttribute('aria-busy', 'false');
            announceToScreenReader('Image processing complete');
        }
    }

    function handleError(error) {
        console.error('Error:', error);
        updateLoadingState(false);
        announceToScreenReader('Error processing image: ' + error.message);
    }

    // Update color count display
    function updateColorCount(colorCounts) {
        const colorCountList = document.getElementById('colorCountList');
        colorCountList.innerHTML = ''; // Clear existing content
        
        // Sort colors by count in descending order
        const sortedColors = Object.entries(colorCounts)
            .sort(([, a], [, b]) => b - a);

        sortedColors.forEach(([colorName, count]) => {
            const color = HAMA_COLORS.find(c => c.name === colorName);
            if (!color) return;

            const listItem = document.createElement('li');
            listItem.className = 'flex items-center justify-between p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200';
            
            const colorSwatch = document.createElement('div');
            colorSwatch.className = 'flex items-center gap-2';
            
            const swatch = document.createElement('div');
            swatch.className = 'w-6 h-6 rounded border border-gray-300 dark:border-gray-600';
            swatch.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = colorName;
            nameSpan.className = 'text-sm text-gray-700 dark:text-gray-300';
            
            const countSpan = document.createElement('span');
            countSpan.textContent = count;
            countSpan.className = 'text-sm font-light text-gray-600 dark:text-gray-400';
            
            colorSwatch.appendChild(swatch);
            colorSwatch.appendChild(nameSpan);
            listItem.appendChild(colorSwatch);
            listItem.appendChild(countSpan);
            colorCountList.appendChild(listItem);
        });

        // Announce color count to screen readers
        const totalColors = sortedColors.length;
        announceToScreenReader(`Image processed with ${totalColors} different colors`);
    }

    // Theme toggle functionality
    function initThemeToggle() {
        const themeToggleBtn = document.getElementById('themeToggle');
        
        // Check if dark mode is enabled
        function isDarkMode() {
            return document.documentElement.classList.contains('dark');
        }

        // Update the UI to match the current theme
        function updateTheme(darkMode) {
            if (darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            localStorage.theme = darkMode ? 'dark' : 'light';
            console.log('Theme updated:', darkMode ? 'dark' : 'light'); // Debug log
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
            console.log('Theme toggled:', newTheme ? 'dark' : 'light'); // Debug log
        });
    }

    initThemeToggle();

    // Add keyboard support for file input
    const fileButton = document.querySelector('button[onclick]');
    fileButton.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            imageInput.click();
        }
    });

    // Event listeners
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                handleError(new Error('Please select an image file'));
                return;
            }
            processAndDisplayImage(file);
        }
    });

    randomImageBtn.addEventListener('click', fetchRandomImage);

    // Handle board size and color reduction changes
    boardSize.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) {
            processAndDisplayImage(file);
        }
    });

    colorReduction.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) {
            processAndDisplayImage(file);
        }
    });

    // Initial animations
    gsap.from('header', { duration: 0.5, y: -50, opacity: 0, ease: "power2.out" });
    gsap.from('main > div', { 
        duration: 0.5, 
        opacity: 0, 
        y: 30, 
        stagger: 0.2, 
        ease: "power2.out"
    });
});
