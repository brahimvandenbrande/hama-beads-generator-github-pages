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

            const { width, height } = getBoardDimensions();
            const result = await imageProcessor.processImage(
                file,
                width,
                height,
                colorReduction.value
            );

            // Display original image
            const originalImg = document.createElement('img');
            originalImg.src = URL.createObjectURL(file);
            originalImg.className = 'w-full h-full object-contain rounded-lg';
            originalImg.alt = 'Original uploaded image';
            originalPreview.innerHTML = '';
            originalPreview.appendChild(originalImg);

            // Display processed image
            const processedImg = document.createElement('img');
            processedImg.src = result.canvas.toDataURL();
            processedImg.className = 'w-full h-full object-contain rounded-lg';
            processedImg.alt = 'Processed bead pattern';
            beadPreview.innerHTML = '';
            beadPreview.appendChild(processedImg);

            // Update color counts
            updateColorCount(result.colorCounts);
            
            // Animate elements
            animateElement(originalImg);
            animateElement(processedImg, 0.2);
            
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
        console.error(error);
        announceToScreenReader(`Error: ${error.message}`);
        // Show error state in UI
        showErrorMessage(error.message);
    }

    // Theme toggle functionality with accessibility
    function initThemeToggle() {
        const themeToggleBtn = document.getElementById('themeToggle');
        const html = document.documentElement;

        // Default to dark mode
        if (!localStorage.getItem('theme')) {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }

        // Initialize button state
        updateThemeToggleState();

        // Toggle theme on button click
        themeToggleBtn.addEventListener('click', () => {
            html.classList.toggle('dark');
            const isDark = html.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Update ARIA state
            themeToggleBtn.setAttribute('aria-checked', isDark.toString());
            announceToScreenReader(`Switched to ${isDark ? 'dark' : 'light'} mode`);

            // Add animation
            gsap.from(themeToggleBtn, {
                rotate: 360,
                duration: 0.6,
                ease: "power2.out"
            });

            updateThemeToggleState();
        });

        // Handle keyboard navigation
        themeToggleBtn.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                themeToggleBtn.click();
            }
        });
    }

    function updateThemeToggleState() {
        const themeToggleBtn = document.getElementById('themeToggle');
        const isDark = document.documentElement.classList.contains('dark');
        themeToggleBtn.setAttribute('aria-checked', isDark.toString());
        themeToggleBtn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    }

    // Update color count display with accessibility
    function updateColorCount(colorCounts) {
        const colorCountList = document.getElementById('colorCountList');
        colorCountList.innerHTML = '';
        
        Object.entries(colorCounts).forEach(([color, count]) => {
            const colorItem = document.createElement('div');
            colorItem.className = 'flex items-center justify-between p-2 rounded-lg bg-gray-700/50';
            colorItem.setAttribute('role', 'listitem');
            
            const colorSwatch = document.createElement('div');
            colorSwatch.className = 'w-4 h-4 rounded-full mr-2 flex-shrink-0';
            colorSwatch.style.backgroundColor = color;
            colorSwatch.setAttribute('aria-label', `Color swatch for ${color}`);
            
            const colorName = document.createElement('div');
            colorName.className = 'flex-1 text-gray-200 truncate mr-2';
            colorName.textContent = color;
            
            const countText = document.createElement('div');
            countText.className = 'text-gray-300 text-right flex-shrink-0';
            countText.textContent = count;
            
            colorItem.appendChild(colorSwatch);
            colorItem.appendChild(colorName);
            colorItem.appendChild(countText);
            colorCountList.appendChild(colorItem);
            
            // Add tooltip for accessibility
            colorItem.setAttribute('title', `${color}: ${count} beads`);
        });
        
        announceToScreenReader('Color count updated');
    }

    // Initialize UI with accessibility
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
