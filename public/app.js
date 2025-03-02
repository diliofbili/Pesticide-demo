// Pesticide Calculator Application
let selectedItems = [];
let pesticideData = [];
let lastScrollPosition = 0;
let isCartFloating = false;

// Initialize the application
function init() {
    // Set up event listeners
    document.getElementById('search-input').addEventListener('input', handleSearch);
    document.getElementById('toggle-list-btn').addEventListener('click', toggleItemsList);
    document.getElementById('clear-cart-btn').addEventListener('click', clearCart);
    
    // Add scroll event listener for floating cart
    window.addEventListener('scroll', handleScroll);
    
    // Set up cart click handler for modal view
    setupCartClickHandler();
    
    // Fetch data
    fetchPesticideData();
}

// Set up cart click handler for modal view
function setupCartClickHandler() {
    const selectedItemsContainer = document.querySelector('.selected-items-container');
    
    // Add click event to open modal cart
    selectedItemsContainer.addEventListener('click', function(e) {
        // Don't open modal if clicking on buttons or controls
        if (e.target.tagName === 'BUTTON' || e.target.closest('button') || 
            e.target.classList.contains('cart-quantity')) {
            return;
        }
        
        // Only open if there are items in the cart
        if (selectedItems.length > 0) {
            showModalCart();
        }
    });
}

// Handle scrolling to show/hide floating cart
function handleScroll() {
    const scrollPosition = window.scrollY;
    const selectedItemsContainer = document.querySelector('.selected-items-container');
    const cartThreshold = 100; // How far you need to scroll before cart floats
    
    // Determine if we're scrolling down or up
    const isScrollingDown = scrollPosition > lastScrollPosition;
    
    // Save current position for next comparison
    lastScrollPosition = scrollPosition;
    
    if (isScrollingDown && scrollPosition > cartThreshold && !isCartFloating && selectedItems.length > 0) {
        // Scrolling down past threshold - make cart float
        selectedItemsContainer.classList.add('floating-cart');
        isCartFloating = true;
    } else if ((!isScrollingDown && scrollPosition < cartThreshold) || selectedItems.length === 0) {
        // Scrolling up to top or cart is empty - restore normal position
        selectedItemsContainer.classList.remove('floating-cart');
        isCartFloating = false;
    }
}

// Fetch data from our backend server
function fetchPesticideData() {
    // Show loading indicator
    document.getElementById('loading-indicator').style.display = 'block';
    document.getElementById('items-list').innerHTML = '';
    
    fetch('/api/pesticides')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // IMPORTANT: Hide loading indicator
            document.getElementById('loading-indicator').style.display = 'none';
            
            pesticideData = data;
            renderItemsList(pesticideData);
        })
        .catch(error => {
            // Hide loading, show error
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('items-list').innerHTML = 
                `<div class="error-message">Failed to load data: ${error.message}</div>`;
            console.error("Error fetching data:", error);
        });
}

// Render the list of items
function renderItemsList(items) {
    const itemsList = document.getElementById('items-list');
    itemsList.innerHTML = '';
    
    items.forEach((item, index) => {
        // Check if this is a salt category (price = 0)
        if (item.price === 0) {
            // Create a salt category heading
            const saltHeading = document.createElement('div');
            saltHeading.className = 'salt-category';
            saltHeading.textContent = item.name + (item.saltComposition ? ` / ${item.saltComposition}` : '');
            itemsList.appendChild(saltHeading);
        } else {
            // Create a regular item
            const itemElement = document.createElement('div');
            itemElement.className = 'item';
            itemElement.setAttribute('data-index', index); 
            itemElement.innerHTML = `
                <div class="item-info">
                    <div class="item-name">
                        ${item.name} 
                        <div class="price-container">
                            <span class="item-price">₹${item.price}</span>
                            <button class="edit-price-btn" data-index="${index}" title="Edit price">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                        </div>
                        <span class="item-company">${item.company}</span>
                    </div>
                    <div class="item-composition">${item.saltComposition}</div>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn decrease" data-index="${index}">-</button>
                    <span class="quantity-display" id="quantity-${index}">0</span>
                    <button class="quantity-btn increase" data-index="${index}">+</button>
                </div>
            `;
            
            itemsList.appendChild(itemElement);
            
            // Add event listeners for quantity adjustment buttons
            itemElement.querySelector('.increase').addEventListener('click', () => {
                increaseQuantity(index);
                showFloatingCartOnAdd(); // Show floating cart when adding item
            });
            itemElement.querySelector('.decrease').addEventListener('click', () => decreaseQuantity(index));
            itemElement.querySelector('.edit-price-btn').addEventListener('click', () => editPrice(index));
        }
    });
}

// Show floating cart when item added
function showFloatingCartOnAdd() {
    const selectedItemsContainer = document.querySelector('.selected-items-container');
    
    // Only show floating cart if we've scrolled down enough
    if (window.scrollY > 100 && selectedItems.length > 0) {
        selectedItemsContainer.classList.add('floating-cart');
        isCartFloating = true;
        
        // Hide floating cart after 5 seconds if no more items added
        clearTimeout(window.floatingCartTimeout);
        window.floatingCartTimeout = setTimeout(() => {
            if (isCartFloating && !document.querySelector('.selected-items-container:hover')) {
                selectedItemsContainer.classList.add('floating-cart-fade');
                
                setTimeout(() => {
                    selectedItemsContainer.classList.remove('floating-cart');
                    selectedItemsContainer.classList.remove('floating-cart-fade');
                    isCartFloating = false;
                }, 500);
            }
        }, 5000);
    }
}

// Increase item quantity
function increaseQuantity(index) {
    const item = pesticideData[index];
    
    // Don't process if it's a salt category
    if (item.price === 0) return;
    
    const quantityDisplay = document.getElementById(`quantity-${index}`);
    const currentQuantity = parseInt(quantityDisplay.textContent);
    const newQuantity = currentQuantity + 1;
    
    quantityDisplay.textContent = newQuantity;
    
    // Update selected items
    const existingItem = selectedItems.find(i => i.index === index);
    if (existingItem) {
        existingItem.quantity = newQuantity;
    } else {
        selectedItems.push({
            index: index,
            name: item.name,
            company: item.company,
            price: item.price,
            quantity: newQuantity
        });
    }
    
    updateSelectedItemsList();
    updateModalCartItems(); // Update modal cart if open
}

// Decrease item quantity
function decreaseQuantity(index) {
    const item = pesticideData[index];
    
    // Don't process if it's a salt category
    if (item.price === 0) return;
    
    const quantityDisplay = document.getElementById(`quantity-${index}`);
    const currentQuantity = parseInt(quantityDisplay.textContent);
    
    if (currentQuantity > 0) {
        const newQuantity = currentQuantity - 1;
        quantityDisplay.textContent = newQuantity;
        
        // Update selected items
        const itemIndex = selectedItems.findIndex(i => i.index === index);
        if (itemIndex !== -1) {
            if (newQuantity === 0) {
                // Remove item if quantity becomes zero
                selectedItems.splice(itemIndex, 1);
            } else {
                selectedItems[itemIndex].quantity = newQuantity;
            }
        }
        
        updateSelectedItemsList();
        updateModalCartItems(); // Update modal cart if open
    }
}

// Remove item completely from cart
function removeItem(index) {
    // Find the item in selected items
    const itemIndex = selectedItems.findIndex(i => i.index === index);
    if (itemIndex !== -1) {
        // Reset quantity display in the main list
        const quantityDisplay = document.getElementById(`quantity-${index}`);
        if (quantityDisplay) {
            quantityDisplay.textContent = "0";
        }
        
        // Remove from selected items
        selectedItems.splice(itemIndex, 1);
        updateSelectedItemsList();
        updateModalCartItems(); // Update modal cart if open
        
        // If no more items, remove floating cart
        if (selectedItems.length === 0 && isCartFloating) {
            const selectedItemsContainer = document.querySelector('.selected-items-container');
            selectedItemsContainer.classList.remove('floating-cart');
            isCartFloating = false;
        }
    }
}

// Clear the entire cart
function clearCart() {
    // Reset all quantities in the main list
    selectedItems.forEach(item => {
        const quantityDisplay = document.getElementById(`quantity-${item.index}`);
        if (quantityDisplay) {
            quantityDisplay.textContent = "0";
        }
    });
    
    // Clear selected items array
    selectedItems = [];
    updateSelectedItemsList();
    updateModalCartItems(); // Update modal cart if open
    
    // Remove floating cart
    if (isCartFloating) {
        const selectedItemsContainer = document.querySelector('.selected-items-container');
        selectedItemsContainer.classList.remove('floating-cart');
        isCartFloating = false;
    }
    
    // Hide the modal cart if it's open
    if (document.querySelector('.cart-modal-overlay.active')) {
        hideModalCart();
    }
}

// Update the selected items list
function updateSelectedItemsList() {
    const selectedItemsList = document.getElementById('selected-items-list');
    selectedItemsList.innerHTML = '';
    
    let grandTotal = 0;
    
    // Check if there are any items
    if (selectedItems.length === 0) {
        selectedItemsList.innerHTML = '<p class="no-items">No items selected</p>';
        document.getElementById('grand-total-value').textContent = '0';
        
        // Remove floating cart if it's empty
        if (isCartFloating) {
            const selectedItemsContainer = document.querySelector('.selected-items-container');
            selectedItemsContainer.classList.remove('floating-cart');
            isCartFloating = false;
        }
        return;
    }
    
    // Loop through all selected items
    selectedItems.forEach((item, idx) => {
        const total = item.price * item.quantity;
        grandTotal += total;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'selected-item';
        
        // Ultra compact single-line layout
        itemElement.innerHTML = `
            <span class="selected-item-name">${idx + 1}) ${item.name}</span>
            <div class="selected-item-controls">
                <button class="quantity-btn decrease-selected" data-index="${item.index}">-</button>
                <span class="cart-quantity" data-index="${item.index}">${item.quantity}</span>
                <button class="quantity-btn increase-selected" data-index="${item.index}">+</button>
                <span class="item-price-display">×${item.price}</span>
            </div>
            <div class="selected-item-actions">
                <span class="selected-item-total">₹${total}</span>
                <button class="remove-item-btn" data-index="${item.index}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        selectedItemsList.appendChild(itemElement);
        
        // Add event listeners with stopPropagation to prevent modal from opening
        const increaseBtn = itemElement.querySelector('.increase-selected');
        const decreaseBtn = itemElement.querySelector('.decrease-selected');
        const removeBtn = itemElement.querySelector('.remove-item-btn');
        const qtyDisplay = itemElement.querySelector('.cart-quantity');
        
        increaseBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent cart modal from opening
            increaseQuantity(item.index);
        });
        
        decreaseBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent cart modal from opening
            decreaseQuantity(item.index);
        });
        
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent cart modal from opening
            removeItem(item.index);
        });
        
        qtyDisplay.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent cart modal from opening
            editQuantity(item.index);
        });
    });
    
    // Update grand total
    document.getElementById('grand-total-value').textContent = grandTotal;
}

// Handle search functionality
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredItems = pesticideData.filter(item => {
        const matchesSearch = 
            item.name.toLowerCase().includes(searchTerm) || 
            (item.company && item.company.toLowerCase().includes(searchTerm)) ||
            (item.saltComposition && item.saltComposition.toLowerCase().includes(searchTerm));
        
        return matchesSearch;
    });
    
    renderItemsList(filteredItems);
}

// Toggle items list visibility
function toggleItemsList() {
    const itemsContainer = document.getElementById('all-items-container');
    const toggleButton = document.getElementById('toggle-list-btn');
    
    if (itemsContainer.classList.contains('hidden')) {
        itemsContainer.classList.remove('hidden');
        toggleButton.textContent = 'Hide List';
    } else {
        itemsContainer.classList.add('hidden');
        toggleButton.textContent = 'Show List';
    }
}

// Edit price functionality
function editPrice(index) {
    const item = pesticideData[index];
    const newPrice = prompt(`Enter new price for ${item.name}:`, item.price);
    
    if (newPrice !== null && !isNaN(newPrice) && newPrice.trim() !== '') {
        const parsedPrice = parseInt(newPrice.trim());
        const oldPrice = item.price;
        
        // Update the price in memory only (not in the database)
        pesticideData[index].price = parsedPrice;
        
        // Update the price display in the main list
        const itemElements = document.querySelectorAll(`.item`);
        itemElements.forEach(el => {
            const itemIndex = parseInt(el.getAttribute('data-index'));
            if (itemIndex === index) {
                const priceElement = el.querySelector('.item-price');
                priceElement.textContent = `₹${parsedPrice}`;
                
                // Add highlight animation
                priceElement.classList.add('price-changed');
                setTimeout(() => {
                    priceElement.classList.remove('price-changed');
                }, 1500);
            }
        });
        
        // Update item in cart if it exists
        const cartItemIndex = selectedItems.findIndex(i => i.index === index);
        if (cartItemIndex !== -1) {
            selectedItems[cartItemIndex].price = parsedPrice;
            updateSelectedItemsList();
        }
        
        // Show toast notification with price change details
        const priceDiff = parsedPrice - oldPrice;
        const priceChangeText = priceDiff > 0 ? `increased by ₹${priceDiff}` : `reduced by ₹${Math.abs(priceDiff)}`;
        showToast(`${item.name} price temporarily ${priceChangeText} to ₹${parsedPrice}`);
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    let icon = 'check-circle';
    if (type === 'error') {
        icon = 'exclamation-circle';
    } else if (type === 'info') {
        icon = 'info-circle';
    }
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Edit quantity functionality
function editQuantity(index) {
    const itemIndex = selectedItems.findIndex(i => i.index === index);
    if (itemIndex !== -1) {
        const item = selectedItems[itemIndex];
        const newQuantity = prompt(`Enter new quantity for ${item.name}:`, item.quantity);
        
        if (newQuantity !== null && !isNaN(newQuantity) && newQuantity.trim() !== '') {
            const parsedQuantity = parseInt(newQuantity.trim());
            
            if (parsedQuantity > 0) {
                // Update in selected items
                selectedItems[itemIndex].quantity = parsedQuantity;
                
                // Update quantity display in main list
                const quantityDisplay = document.getElementById(`quantity-${index}`);
                if (quantityDisplay) {
                    quantityDisplay.textContent = parsedQuantity;
                }
                
                // Update the cart display
                updateSelectedItemsList();
                updateModalCartItems(); // Update modal cart if open
                
                showToast(`Updated ${item.name} quantity to ${parsedQuantity}`);
            } else if (parsedQuantity === 0) {
                // Remove item if quantity is zero
                removeItem(index);
                showToast(`Removed ${item.name} from cart`);
            }
        }
    }
}

// Improved floating cart management for mobile
function showFloatingCartOnAdd() {
    const selectedItemsContainer = document.querySelector('.selected-items-container');
    
    // Only show floating cart if we've scrolled down enough
    if (window.scrollY > 100 && selectedItems.length > 0) {
        // Add floating cart class
        selectedItemsContainer.classList.add('floating-cart');
        isCartFloating = true;
        
        // On mobile, add a touch handler to allow dismissing with swipe
        if (window.innerWidth <= 600) {
            setupSwipeDismiss(selectedItemsContainer);
        }
        
        // Auto-hide after inactivity (except on mobile)
        if (window.innerWidth > 600) {
            setupAutoHide();
        }
    }
}

// Auto-hide the cart after inactivity
function setupAutoHide() {
    clearTimeout(window.floatingCartTimeout);
    
    window.floatingCartTimeout = setTimeout(() => {
        const selectedItemsContainer = document.querySelector('.selected-items-container');
        
        if (isCartFloating && !selectedItemsContainer.matches(':hover')) {
            selectedItemsContainer.classList.add('floating-cart-fade');
            
            setTimeout(() => {
                selectedItemsContainer.classList.remove('floating-cart');
                selectedItemsContainer.classList.remove('floating-cart-fade');
                isCartFloating = false;
            }, 500);
        }
    }, 5000);
}

// Allow dismissing the cart with swipe on mobile
function setupSwipeDismiss(element) {
    let touchStartY = 0;
    let touchMoveY = 0;
    
    // Touch start handler
    element.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    // Touch move handler
    element.addEventListener('touchmove', function(e) {
        touchMoveY = e.touches[0].clientY;
        const diff = touchMoveY - touchStartY;
        
        // If swiping down, move the cart
        if (diff > 0) {
            element.style.transform = `translateY(${diff}px)`;
            e.preventDefault();
        }
    }, { passive: false });
    
    // Touch end handler
    element.addEventListener('touchend', function() {
        const diff = touchMoveY - touchStartY;
        
        // If swipe was significant, dismiss the cart
        if (diff > 80) {
            element.style.transition = 'transform 0.3s ease';
            element.style.transform = 'translateY(100%)';
            
            setTimeout(() => {
                element.classList.remove('floating-cart');
                element.style.transform = '';
                element.style.transition = '';
                isCartFloating = false;
            }, 300);
        } else {
            // Reset position
            element.style.transition = 'transform 0.3s ease';
            element.style.transform = '';
            
            setTimeout(() => {
                element.style.transition = '';
            }, 300);
        }
    }, { passive: true });
}

// Function to show the modal cart
function showModalCart() {
    // Only create the modal if it doesn't exist
    if (!document.querySelector('.cart-modal-overlay')) {
        createModalCart();
    }
    
    // Show the modal with animation
    const overlay = document.querySelector('.cart-modal-overlay');
    const modal = document.querySelector('.cart-modal');
    
    overlay.classList.add('active');
    setTimeout(() => {
        modal.classList.add('active');
    }, 50);
    
    // Prevent body scrolling while modal is open
    document.body.style.overflow = 'hidden';
}

// Function to hide the modal cart
function hideModalCart() {
    const overlay = document.querySelector('.cart-modal-overlay');
    const modal = document.querySelector('.cart-modal');
    
    if (!overlay || !modal) return;
    
    modal.classList.remove('active');
    
    setTimeout(() => {
        overlay.classList.remove('active');
        // Re-enable body scrolling
        document.body.style.overflow = '';
    }, 300);
}

// Function to create the modal cart DOM elements
function createModalCart() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'cart-modal-overlay';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'cart-modal';
    
    // Create modal header
    const header = document.createElement('div');
    header.className = 'cart-modal-header';
    
    const title = document.createElement('div');
    title.className = 'cart-modal-title';
    title.textContent = 'Your Cart';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'cart-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', hideModalCart);
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Create modal body
    const body = document.createElement('div');
    body.className = 'cart-modal-body';
    body.id = 'modal-cart-items';
    
    // Create modal footer
    const footer = document.createElement('div');
    footer.className = 'cart-modal-footer';
    
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-cart-btn';
    clearBtn.textContent = 'Clear Cart';
    clearBtn.addEventListener('click', () => {
        clearCart();
        hideModalCart();
    });
    
    const total = document.createElement('div');
    total.className = 'modal-cart-total';
    total.innerHTML = `Grand Total = ₹<span id="modal-grand-total-value">0</span>`;
    
    footer.appendChild(clearBtn);
    footer.appendChild(total);
    
    // Assemble the modal
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    
    overlay.appendChild(modal);
    
    // Add click handler to close when clicking outside the modal
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            hideModalCart();
        }
    });
    
    // Add to the DOM
    document.body.appendChild(overlay);
    
    // Populate with current cart items
    updateModalCartItems();
}

// Function to update the items in the modal cart
function updateModalCartItems() {
    const modalCartItems = document.getElementById('modal-cart-items');
    const modalGrandTotal = document.getElementById('modal-grand-total-value');
    
    if (!modalCartItems || !modalGrandTotal) return;
    
    modalCartItems.innerHTML = '';
    
    let grandTotal = 0;
    
    // Check if there are any items
    if (selectedItems.length === 0) {
        modalCartItems.innerHTML = '<p class="no-items">No items selected</p>';
        modalGrandTotal.textContent = '0';
        return;
    }
    
    // Loop through all selected items
    selectedItems.forEach((item, idx) => {
        const total = item.price * item.quantity;
        grandTotal += total;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'modal-cart-item';
        
        // Full details layout
        itemElement.innerHTML = `
            <div class="modal-cart-item-header">
                <div class="modal-cart-item-name">${idx + 1}) ${item.name}</div>
                <button class="remove-item-btn" data-index="${item.index}"><i class="fas fa-trash"></i></button>
            </div>
            <div class="modal-cart-item-details">
                <div class="modal-cart-item-controls">
                    <button class="quantity-btn decrease-selected" data-index="${item.index}">-</button>
                    <span class="cart-quantity" data-index="${item.index}">${item.quantity}</span>
                    <button class="quantity-btn increase-selected" data-index="${item.index}">+</button>
                    <span class="item-price-display">×${item.price}</span>
                </div>
                <span class="modal-cart-item-price">₹${total}</span>
            </div>
        `;
        
        modalCartItems.appendChild(itemElement);
        
        // Add event listeners
        const increaseBtn = itemElement.querySelector('.increase-selected');
        const decreaseBtn = itemElement.querySelector('.decrease-selected');
        const removeBtn = itemElement.querySelector('.remove-item-btn');
        const qtyDisplay = itemElement.querySelector('.cart-quantity');
        
        increaseBtn.addEventListener('click', () => {
            increaseQuantity(item.index);
            updateModalCartItems(); // Update modal cart after change
        });
        
        decreaseBtn.addEventListener('click', () => {
            decreaseQuantity(item.index);
            updateModalCartItems(); // Update modal cart after change
        });
        
        removeBtn.addEventListener('click', () => {
            removeItem(item.index);
            updateModalCartItems(); // Update modal cart after change
            
            // If no items left, close the modal
            if (selectedItems.length === 0) {
                hideModalCart();
            }
        });
        
        qtyDisplay.addEventListener('click', () => {
            editQuantity(item.index);
            updateModalCartItems(); // Update modal cart after change
        });
    });
    
    // Update grand total
    modalGrandTotal.textContent = grandTotal;
}

// Initialize the app when window loads
window.onload = init;
