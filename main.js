/* Image Combiner Pro - main.js
 * Version: 1.0.5
 * Author: skoki
 * GitHub: https://github.com/skokivPr
 */

// Initialize global variables
let images = [];
let currentTheme = localStorage.getItem('theme') || 'light';
let currentScale = 1;
let initialTouchDistance = null;
let resultImageUrl = '';
let draggedItem = null;

// Mobile-specific variables
let touchStartX = 0;
let touchStartY = 0;
let touchTimeout = null;
let selectedItem = null;
let isTouchMoving = false;
let longPressTimer = null;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const combineBtn = document.getElementById('combineBtn');
const clearBtn = document.getElementById('clearBtn');
const resultContainer = document.getElementById('resultContainer');
const themeToggle = document.getElementById('themeToggle');
const mobilePinchZoom = document.getElementById('mobilePinchZoom');
const zoomImage = document.getElementById('zoomImage');

// Initialize theme
document.documentElement.setAttribute('data-theme', 'dark');
themeToggle.innerHTML = `<i class="fas fa-${currentTheme === 'light' ? 'moon' : 'sun'}"></i>`;

// Check if device is mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
    document.body.classList.add('mobile-device');
    if (!localStorage.getItem('mobileHintShown')) {
        showMobileGestureHint();
        localStorage.setItem('mobileHintShown', 'true');
    }
}

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => e.preventDefault());
dropZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
combineBtn.addEventListener('click', combineImages);
clearBtn.addEventListener('click', clearImages);
downloadBtn.addEventListener('click', downloadResult);
themeToggle.addEventListener('click', toggleTheme);

// Mobile event listeners
if (isMobile) {
    mobilePinchZoom.addEventListener('touchstart', handlePinchStart, { passive: false });
    mobilePinchZoom.addEventListener('touchmove', handlePinchMove, { passive: false });
    mobilePinchZoom.addEventListener('touchend', handlePinchEnd);
    document.getElementById('closePinchZoom').addEventListener('click', () => {
        mobilePinchZoom.style.display = 'none';
    });
}

function handleTouchStart(e) {
    if (!isMobile) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    selectedItem = e.target.closest('.preview-item');
    isTouchMoving = false;

    if (e.touches.length === 2) {
        handlePinchStart(e);
        return;
    }

    if (selectedItem) {
        e.preventDefault();
        longPressTimer = setTimeout(() => {
            if (!isTouchMoving) {
                selectedItem.classList.add('mobile-selection');
                showMobileContextMenu(e);
            }
        }, 500);
    }
}

function handleTouchMove(e) {
    if (!isMobile || !selectedItem) return;

    if (e.touches.length === 2) {
        handlePinchMove(e);
        return;
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isTouchMoving = true;
        clearTimeout(longPressTimer);
        selectedItem.classList.remove('mobile-selection');

        e.preventDefault();
        selectedItem.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        selectedItem.style.zIndex = '1000';

        const elementsUnderTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
        const targetItem = elementsUnderTouch.find(el =>
            el.classList.contains('preview-item') && el !== selectedItem
        );

        if (targetItem) {
            const items = Array.from(imagePreview.children);
            const fromIndex = items.indexOf(selectedItem);
            const toIndex = items.indexOf(targetItem);

            if (fromIndex !== -1 && toIndex !== -1) {
                reorderImages(fromIndex, toIndex);
            }
        }
    }
}

function handleTouchEnd(e) {
    if (!isMobile || !selectedItem) return;

    clearTimeout(longPressTimer);
    selectedItem.classList.remove('mobile-selection');
    selectedItem.style.transform = '';
    selectedItem.style.zIndex = '';

    if (isTouchMoving) {
        updateImagePreview();
    }

    isTouchMoving = false;
    selectedItem = null;
    initialTouchDistance = null;
}

function showMobileContextMenu(e) {
    const contextMenu = document.createElement('div');
    contextMenu.className = 'mobile-context-menu';
    contextMenu.innerHTML = `
                <div class="mobile-context-menu-item" onclick="handleMobileAction('preview', ${selectedItem.dataset.index})">
                    <i class="fas fa-eye"></i> Podgląd
                </div>
                <div class="mobile-context-menu-item" onclick="handleMobileAction('delete', ${selectedItem.dataset.index})">
                    <i class="fas fa-trash"></i> Usuń
                </div>
            `;

    document.body.appendChild(contextMenu);

    const touch = e.touches[0];
    const rect = contextMenu.getBoundingClientRect();

    contextMenu.style.left = `${Math.min(touch.clientX, window.innerWidth - rect.width)}px`;
    contextMenu.style.top = `${Math.min(touch.clientY, window.innerHeight - rect.height)}px`;

    // Close menu when clicking outside
    setTimeout(() => {
        const hideMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.remove();
                document.removeEventListener('touchstart', hideMenu);
            }
        };
        document.addEventListener('touchstart', hideMenu);
    }, 0);
}

function handleMobileAction(action, index) {
    const contextMenu = document.querySelector('.mobile-context-menu');
    if (contextMenu) {
        contextMenu.remove();
    }

    switch (action) {
        case 'preview':
            showPinchZoom(images[index].src);
            break;
        case 'delete':
            removeImage(index);
            break;
    }
}

function showMobileGestureHint() {
    const hint = document.createElement('div');
    hint.className = 'mobile-gesture-hint';
    hint.innerHTML = `
                <i class="fas fa-hand-pointer"></i>
                <p>Przytrzymaj aby przenieść lub usunąć obraz</p>
            `;
    document.body.appendChild(hint);

    setTimeout(() => {
        hint.remove();
    }, 3000);
}

function closeWelcomeModal() {
    welcomeModal.style.display = 'none';
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    processFiles(files);
}

function handleDrop(event) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
}

function processFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
        alert('Proszę wybrać pliki obrazów');
        return;
    }

    imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = function () {
                const imageObj = {
                    src: e.target.result,
                    width: this.naturalWidth,
                    height: this.naturalHeight,
                    description: '',
                    element: this
                };
                images.push(imageObj);
                updateImagePreview();
                updateButtons();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function updateImagePreview() {
    const imageList = imagePreview.querySelector('ul');
    if (!imageList) {
        imagePreview.innerHTML = '<ul class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@s" uk-sortable="handle: .preview-item" uk-grid></ul>';
    }
    const list = imagePreview.querySelector('ul');

    list.innerHTML = images.map((image, index) => {
        return `
                    <li>
                        <div class="preview-item" data-index="${index}">
                            <span class="position-number">${index + 1}</span>
                            <img 
                                src="${image.src}" 
                                alt="Preview ${index + 1}" 
                                onclick="showPinchZoom('${image.src}')"
                            />
                            <button class="remove-btn" onclick="removeImage(${index})">
                                <i class="fas fa-times"></i>
                            </button>
                            <input 
                                type="text" 
                                placeholder="Dodaj opis..." 
                                value="${image.description}"
                                onchange="updateDescription(${index}, this.value)" 
                                class="image-description"
                            />
                        </div>
                    </li>
                `;
    }).join('');

    // Initialize UIkit sortable
    UIkit.util.on(list, 'moved', function (e) {
        const fromIndex = e.detail[0].oldIndex;
        const toIndex = e.detail[0].newIndex;
        const items = Array.from(list.children);

        // Create new array based on current order
        const newImages = items.map(item => {
            const index = parseInt(item.querySelector('.preview-item').dataset.index);
            return images[index];
        });

        // Update images array
        images = newImages;

        // Update position numbers and data-index attributes
        items.forEach((item, idx) => {
            const previewItem = item.querySelector('.preview-item');
            previewItem.dataset.index = idx;
            previewItem.querySelector('.position-number').textContent = idx + 1;
        });
    });

    // Initialize mobile handlers if needed
    if (isMobile) {
        initializeMobileHandlers();
    }
}

function updateButtons() {
    const hasImages = images.length > 0;
    combineBtn.disabled = !hasImages;
    clearBtn.disabled = !hasImages;

    // Update controls visibility
    const controls = document.querySelector('.controls');
    if (!hasImages) {
        controls.classList.remove('visible');
        downloadBtn.style.display = 'none';
        resultContainer.style.display = 'none';
        resultImageUrl = '';
    } else {
        controls.classList.add('visible');
    }
}

function removeImage(index) {
    images.splice(index, 1);
    updateImagePreview();
    updateButtons();
}

function updateDescription(index, description) {
    images[index].description = description;
}

async function combineImages() {
    if (images.length === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    try {
        // Load all images first
        const loadedImages = await Promise.all(images.map(img => {
            if (!img || !img.src) {
                console.error('Invalid image object:', img);
                return Promise.reject(new Error('Invalid image object'));
            }
            return new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('Failed to load image'));
                image.src = img.src;
            });
        }));

        // Calculate dimensions
        const maxWidth = Math.max(...loadedImages.map(img => img.naturalWidth));
        const totalHeight = loadedImages.reduce((sum, img) => {
            const scale = maxWidth / img.naturalWidth;
            return sum + (img.naturalHeight * scale);
        }, 0);

        canvas.width = maxWidth;
        canvas.height = totalHeight;

        let currentY = 0;

        // Draw images
        for (const img of loadedImages) {
            const scale = maxWidth / img.naturalWidth;
            const scaledHeight = img.naturalHeight * scale;
            ctx.drawImage(img, 0, currentY, maxWidth, scaledHeight);
            currentY += scaledHeight;
        }

        resultImageUrl = canvas.toDataURL('image/png');
        resultImage.src = resultImageUrl;
        resultContainer.style.display = 'block';
        downloadBtn.style.display = 'inline-flex';
    } catch (error) {
        console.error('Error combining images:', error);
        alert('Wystąpił błąd podczas łączenia obrazów. Spróbuj ponownie.');
    }
}

function downloadResult() {
    if (!resultImageUrl) return;

    const link = document.createElement('a');
    link.href = resultImageUrl;
    link.download = 'combined-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function clearImages() {
    images = [];
    updateImagePreview();
    updateButtons();
    resultContainer.style.display = 'none';
    resultImageUrl = '';
}

function toggleTheme() {
    // Funkcja usunięta - zawsze ciemny motyw
}

function showPinchZoom(src) {
    zoomImage.src = src;
    mobilePinchZoom.style.display = 'flex';
    currentScale = 1;
    zoomImage.style.transform = `scale(${currentScale})`;

    // Add click handler for background
    mobilePinchZoom.onclick = (e) => {
        if (e.target === mobilePinchZoom) {
            closePinchZoom();
        }
    };

    // Prevent image click from closing
    zoomImage.onclick = (e) => {
        e.stopPropagation();
    };
}

function closePinchZoom() {
    mobilePinchZoom.style.display = 'none';
    currentScale = 1;
    zoomImage.style.transform = 'scale(1)';
}

function handlePinchStart(event) {
    if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        initialTouchDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
    }
}

function handlePinchMove(event) {
    if (event.touches.length === 2 && initialTouchDistance !== null) {
        event.preventDefault();
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );

        const scale = currentDistance / initialTouchDistance;
        currentScale = Math.min(Math.max(scale, 0.5), 3);
        zoomImage.style.transform = `scale(${currentScale})`;
    }
}

function handlePinchEnd() {
    initialTouchDistance = null;
}

// Reorder images array
function initializeMobileHandlers() {
    const previewItems = document.querySelectorAll('.preview-item');
    previewItems.forEach(item => {
        item.addEventListener('touchstart', handleTouchStart, { passive: false });
        item.addEventListener('touchmove', handleTouchMove, { passive: false });
        item.addEventListener('touchend', handleTouchEnd);
    });
}