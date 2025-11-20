/**
 * Include your custom JavaScript here.
 *
 * We also offer some hooks so you can plug your own logic. For instance, if you want to be notified when the variant
 * changes on product page, you can attach a listener to the document:
 *
 * document.addEventListener('variant:changed', function(event) {
 *   var variant = event.detail.variant; // Gives you access to the whole variant details
 * });
 *
 * You can also add a listener whenever a product is added to the cart:
 *
 * document.addEventListener('product:added', function(event) {
 *   var variant = event.detail.variant; // Get the variant that was added
 *   var quantity = event.detail.quantity; // Get the quantity that was added
 * });
 *
 * If you just want to force refresh the mini-cart without adding a specific product, you can trigger the event
 * "cart:refresh" in a similar way (in that case, passing the quantity is not necessary):
 *
 * document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', {
 *   bubbles: true
 * }));
 */

// =============================================================================
// CART ITEM REMOVE HANDLING
// =============================================================================
// Intercepts remove item clicks and handles them with AJAX to prevent redirects
//
// HOW IT WORKS:
// 1. Listens for clicks on elements with data-action="remove-item"
// 2. Prevents default link behavior (which would redirect to cart page)
// 3. Extracts item data: quantity (0) and line item key (data-id)
// 4. Makes AJAX request to /cart/change.js with JSON payload
// 5. Triggers cart refresh events with immediate cart data passing
// 6. Reloads page if on main cart, otherwise updates via events
//
// KEY FEATURES:
// - Uses line item keys (line_item.key) for reliable item identification
// - Modern fetch API with JSON format for better performance
// - Immediate cart data passing via event.detail.cart
// - Works with both cart drawer and main cart page
// - Integrates with theme's event system (cart:change, cart:refresh)
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  const selectors = [
    ".product-without-no_wishlist .gw-wl-add-to-wishlist-placeholder",
    ".product-without-no_wishlist .gw-add-to-wishlist-product-card-placeholder",
    ".product-without-no_wishlist .qview-button-wrapper"
  ];

  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => el.remove());
  });
});


document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(event) {
    const target = event.target;
    
    // Check if this is a remove item link
    if (target.matches('a[data-action="remove-item"]')) {
      event.preventDefault();
      
      const quantity = parseInt(target.getAttribute('data-quantity'));
      const id = target.getAttribute('data-id');
      
      // Use AJAX to update cart (using JSON format like new theme's built-in functionality)
      fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          id: id,  // Use line item key instead of line number
          quantity: quantity
        })
      })
      .then(response => response.json())
      .then(cart => {
        console.log('Cart updated successfully');
        
        // Trigger cart refresh events with cart data for immediate processing
        document.documentElement.dispatchEvent(new CustomEvent('cart:change', {
          bubbles: true,
          detail: { cart: cart }
        }));
        
        document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', {
          bubbles: true
        }));
        
        // If we're on the main cart page, reload it
        if (window.location.pathname === '/cart') {
          window.location.reload();
        }
      })
      .catch(error => {
        console.error('Error updating cart:', error);
      });
    }

  });
});

// Monitor cart changes and update drawer for third-party apps like Qikify
(function() {
  let lastCartItemCount = null; // Changed to null to indicate uninitialized
  let isInitialized = false;

  // Get initial cart count
  function updateCartCount() {
    fetch('/cart.js')
      .then(response => response.json())
      .then(cart => {
        const currentCount = cart.items.length;

        // Initialize on first run - don't open drawer
        if (!isInitialized) {
          lastCartItemCount = currentCount;
          isInitialized = true;
          return;
        }

        // Only open drawer if cart count actually increased from a previous state
        if (currentCount > lastCartItemCount) {
          // Trigger the theme's cart refresh event
          document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', {
            bubbles: true
          }));

          // Force open cart drawer immediately if cart type is drawer
          const drawer = document.querySelector('cart-drawer');
          if (drawer && window.themeVariables?.settings?.cartType === 'drawer') {
            drawer.show();
          }
        }

        lastCartItemCount = currentCount;
      })
      .catch(error => console.error('Error checking cart:', error));
  }

  // Initialize cart count when page loads
  document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();

    // Monitor for cart changes every 1 second for faster responsiveness
    // setInterval(updateCartCount, 1000);
  });

  // Also monitor for specific cart API calls
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const result = originalFetch.apply(this, args);
    const url = args[0];

    // If it's a cart-related API call, check for updates immediately
    if (typeof url === 'string' && (url.includes('/cart/add') || url.includes('/cart/update'))) {
      result.then(() => {
        updateCartCount(); // Remove delay for immediate cart update
      });
    }

    return result;
  };
})();
$(document).ready(function(){
  if($(window).width() < 641){
    var w = $(window).width();
    $(".ImageHero__Video-Mobile, .ImageHero__Video-Mobile .ImageHero__Video-Player").css("min-height", w/4*5);
  }

  setTimeout(function(){
    $(".freegift").appendTo("#freegift");
  }, 1000);
});

$(document).ready(function(){
  // Gift wrap functionality is now handled in the gift-wrap.liquid snippet
  // No hardcoded JavaScript needed here anymore

  setTimeout(function(){
    $('.placeholder-image').fadeOut();
  }, 1000);

});

$(document).on("click", ".btn-git-cart", function () {
    // $(this).closest("product-form").addClass("disable");
    $("#gift-ui-container product-form").addClass("disable");
});
// Gift wrap helper functions removed - now handled in gift-wrap.liquid snippet

// =============================================================================
// CART DRAWER COMPATIBILITY LAYER FOR THIRD-PARTY APPS
// =============================================================================
// This ensures apps like Quikify can still open the cart drawer programmatically
// even though the new theme uses a different cart drawer system

document.addEventListener('DOMContentLoaded', function() {

  // Function to open cart drawer programmatically
  function openCartDrawer() {
    const cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer && typeof cartDrawer.show === 'function') {
      cartDrawer.show();
    }
  }

  // Legacy compatibility: Listen for old theme's drawer opening method
  // Apps like Quikify might try to trigger 'data-action="open-drawer"'
  document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-action="open-drawer"]');
    if (target && target.getAttribute('data-drawer-id') === 'sidebar-cart') {
      e.preventDefault();
      openCartDrawer();
    }
  });

  // Alternative method: Listen for custom events that apps might dispatch
  document.addEventListener('cart:drawer:open', function() {
    openCartDrawer();
  });

  // Global function that apps can call directly
  window.openCartDrawer = openCartDrawer;

  // Alternative global function using old theme naming
  window.theme = window.theme || {};
  window.theme.cart = window.theme.cart || {};
  window.theme.cart.openDrawer = openCartDrawer;

  // Monitor for cart updates and auto-open drawer if needed
  // This helps with apps that add items to cart expecting drawer to open
  let cartItemCount = null; // Changed to null to indicate uninitialized
  let cartMonitoringInitialized = false;

  // Initialize cart item count on page load
  fetch('/cart.js')
    .then(response => response.json())
    .then(cart => {
      cartItemCount = cart.item_count;
      cartMonitoringInitialized = true;
    })
    .catch(console.error);

  // Periodically check if cart has new items and open drawer
  const checkCartUpdates = function() {
    // Don't check until we're properly initialized
    if (!cartMonitoringInitialized) {
      return;
    }

    fetch('/cart.js')
      .then(response => response.json())
      .then(cart => {
        // Only open drawer if cart count actually increased
        if (cart.item_count > cartItemCount) {
          // New item was added, open the drawer
          openCartDrawer();
        }
        cartItemCount = cart.item_count;
      })
      .catch(console.error);
  };

  // Check for cart updates every 1 second when page is visible for faster responsiveness
  let cartUpdateInterval;

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      clearInterval(cartUpdateInterval);
    } else {
      cartUpdateInterval = setInterval(checkCartUpdates, 1000);
    }
  });

  // Start monitoring if page is visible (but only after initialization)
  if (!document.hidden) {
    cartUpdateInterval = setInterval(checkCartUpdates, 1000);
  }

  // Listen for cart form submissions (Quikify often submits forms)
  document.addEventListener('submit', function(e) {
    if (e.target.matches('form[action*="/cart/add"]')) {
      // Form is being submitted to add to cart
      // Set a flag to open drawer after successful submission
      setTimeout(function() {
        openCartDrawer();
      }, 100); // Minimal delay to ensure cart is updated
    }
  });

  // Listen for fetch requests to cart/add.js (AJAX cart adds)
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options] = args;

    // Check if this is a cart add request
    if (url && (url.includes('/cart/add') || url.includes('cart/add.js'))) {
      return originalFetch.apply(this, args)
        .then(response => {
          if (response.ok) {
            // Successful cart add, open drawer immediately
            openCartDrawer();
          }
          return response;
        });
    }

    return originalFetch.apply(this, args);
  };

  console.log('Cart drawer compatibility layer loaded');
});
