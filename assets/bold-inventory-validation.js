/*
-  BOLD INVENTORY VALIDATION
-  For making sure customers cannot check out with more items than are available when our variant-swapping apps are in play
-  Also enforces minimum and maximum quantities based on product tags
-
-  REQUIRES:
-    * bold-product.liquid (Updated Feb. 2017 or later)
-    * bold-variant.liquid
-    * bold-common.liquid (for the BOLD eventEmitter)
-    * Custom product endpoint (if bold-product is not being included for every product in the cart and on the page - see note below)
-
-
-  SETTING UP THE PRODUCT ENDPOINT:
-  Creating a product JSON endpoint allows this script to get the product JSON with all of our app-related data attached.  This allows us to compare the available quantities using the base variant
-
-    1. Create a new template for 'products' named 'json'
-    2. Replace the entire contents of the file with the following:
-      {% include 'bold-product', endpoint: 'js' %}

{% include 'bold-product', endpoint: 'js' %}
*/

//Initialize variables
var BOLD = BOLD || {};
BOLD.helpers = BOLD.helpers || {};

BOLD.customer = BOLD.customer || {};

BOLD.products = BOLD.products || {};
BOLD.variant_lookup = BOLD.variant_lookup || {};




//-----------------------------------------------------
//Set up event listeners
//-----------------------------------------------------

BOLD.helpers.setupInventoryEventListeners = function(){
  if(BOLD.common && BOLD.common.eventEmitter){
    //Remove any existing common events before attempting to set them up - we don't want to accidentally run things twice if the initialization runs more than once
    BOLD.common.eventEmitter.off('BOLD_COMMON_product_loaded', BOLD.helpers.verifyAllCartQuantities);
    BOLD.common.eventEmitter.off('BOLD_COMMON_variant_changed', BOLD.helpers.verifyAllProductQuantities);
    BOLD.common.eventEmitter.off('BOLD_COMMON_cart_loaded', BOLD.helpers.verifyAllCartQuantities);
    BOLD.common.eventEmitter.off('BOLD_COMMON_cart_loaded', BOLD.helpers.verifyAllProductQuantities);
    BOLD.common.eventEmitter.off('BOLD_COMMON_product_quantity_changed', BOLD.helpers.enforceProductQuantityMinMax);
    BOLD.common.eventEmitter.off('BOLD_COMMON_cart_quantity_changed' ,BOLD.helpers.onCartQuantityChange);
    BOLD.common.eventEmitter.off('BOLD_COMMON_add_to_cart', BOLD.helpers.verifyAllProductQuantities);
    BOLD.common.eventEmitter.off('BOLD_COMMON_checkout', BOLD.helpers.verifyAllCartQuantities);

    BOLD.common.eventEmitter.on('BOLD_COMMON_product_loaded', BOLD.helpers.verifyAllCartQuantities);
    BOLD.common.eventEmitter.on('BOLD_COMMON_variant_changed', BOLD.helpers.verifyAllProductQuantities);
    BOLD.common.eventEmitter.on('BOLD_COMMON_cart_loaded', BOLD.helpers.verifyAllCartQuantities);
    BOLD.common.eventEmitter.on('BOLD_COMMON_cart_loaded', BOLD.helpers.verifyAllProductQuantities);
    BOLD.common.eventEmitter.on('BOLD_COMMON_product_quantity_changed', BOLD.helpers.enforceProductQuantityMinMax);
    BOLD.common.eventEmitter.on('BOLD_COMMON_cart_quantity_changed' ,BOLD.helpers.onCartQuantityChange);
    BOLD.common.eventEmitter.on('BOLD_COMMON_add_to_cart', BOLD.helpers.verifyAllProductQuantities);
    BOLD.common.eventEmitter.on('BOLD_COMMON_checkout', BOLD.helpers.verifyAllCartQuantities);
  }

  if(window.jQuery && jQuery().on){
    //Remove any existing document-level events before attempting to set them up - we don't want to accidentally run things twice if the initialization runs more than once
    jQuery(document).off('click', '.swatch,[class*="single-option"]', BOLD.helpers.triggerVariantChange);
    jQuery(document).off('change', '[name^="id"],[class*="single-option"]', BOLD.helpers.triggerVariantChange);
    jQuery(document).off('submit', 'form[action*="/cart/add"]', BOLD.helpers.triggerAddToCartEvent);
    jQuery(document).off('click', 'form[action*="/cart/add"]', BOLD.helpers.triggerAddToCartEvent);
    jQuery(document).off('submit', 'form[action*="/checkout"]', BOLD.helpers.triggerCheckoutEvent);
    jQuery(document).off('click', '[name="checkout"],[href*="/checkout"]', BOLD.helpers.triggerCheckoutEvent);
    jQuery(document).off('change', '[name=quantity]', BOLD.helpers.triggerProductQuantityChange);
    jQuery(document).off('change', '[name^="updates"]', BOLD.helpers.triggerCartQuantityChange );

    jQuery(document).on('click', '.swatch,[class*="single-option"]', BOLD.helpers.triggerVariantChange);
    jQuery(document).on('change', '[name^="id"],[class*="single-option"]', BOLD.helpers.triggerVariantChange);
    jQuery(document).on('submit', 'form[action*="/cart/add"]', BOLD.helpers.triggerAddToCartEvent);
    jQuery(document).on('click', 'form[action*="/cart/add"]', BOLD.helpers.triggerAddToCartEvent);
    jQuery(document).on('submit', 'form[action*="/checkout"]', BOLD.helpers.triggerCheckoutEvent);
    jQuery(document).on('click', '[name="checkout"],[href*="/checkout"],[name^="goto_"]', BOLD.helpers.triggerCheckoutEvent);
    jQuery(document).on('change', '[name=quantity]', BOLD.helpers.triggerProductQuantityChange);
    jQuery(document).on('change', '[name^="updates"]', BOLD.helpers.triggerCartQuantityChange );
  }
}

BOLD.helpers.triggerCommonEvent = function(bold_event_name, original_event, additional_data){
  if(window.BOLD && BOLD.common && BOLD.common.eventEmitter){
    BOLD.common.eventEmitter.emit((bold_event_name.indexOf('BOLD_') > -1 ? bold_event_name : 'BOLD_COMMON_' + bold_event_name), {target:original_event.target, original_event:original_event, data: additional_data});
  }
};

BOLD.helpers.triggerCheckoutEvent = function(evt){
  var original_target = evt.target;
  var form = (original_target.tagName == 'FORM' ? original_target : (original_target.form ? original_target.form : null));
  if(form){
    var checkoutInput = BOLD.helpers.newHiddenInput('checkout','checkout');
    form.appendChild(checkoutInput);
  }
  var cart = (BOLD.common && BOLD.common.cartDoctor ? BOLD.common.cartDoctor.rawCart : BOLD.rawCart);
  BOLD.helpers.triggerCommonEvent('checkout', evt, {form:form, cart:cart});
};

BOLD.helpers.triggerAddToCartEvent = function(evt){
  var original_target = evt.target;
  var form = (original_target.tagName == 'FORM' ? original_target : (original_target.form ? original_target.form : null));
  var variant = (form && form.variant ? form.variant : (form ? BOLD.helpers.getVariantByForm(form) : null));
  BOLD.helpers.triggerCommonEvent('add_to_cart', evt, {form:form, variant:variant});
};

BOLD.helpers.triggerCartQuantityChange = function(evt){
    var original_target = evt.target;
    var form = (original_target.form ? original_target.form : (typeof jQuery == 'function' && jQuery().closest ? jQuery(original_target).closest('form')[0] : null));
    var cart = (BOLD.common && BOLD.common.cartDoctor ? BOLD.common.cartDoctor.rawCart : BOLD.rawCart);

    var item, line, variant;
    //If there's a form, try to find out which item/line was updated
    if(form){
      var all_inputs = form.querySelectorAll('[name^="updates"]');
      if(all_inputs.length === cart.items.length){
        var item_count = cart.items.length;
        for(var i = 0; i < item_count; i++){
          if(all_inputs[i] == original_target){
            item = cart.items[i];
            line = i + 1;
            break;
          }
        }
      }
    }

    //If we have an item, try to get the variant details as well
    if(item){
      variant = BOLD.helpers.getVariantByItem(item);
    }

    BOLD.helpers.triggerCommonEvent('cart_quantity_changed', evt, {cart:cart, form:form, item:item, line:line, variant:variant, input:original_target, quantity:parseInt(original_target.value)});
};

BOLD.helpers.triggerProductQuantityChange = function(evt){
  var original_target = event.target;
  var form = (original_target.form ? original_target.form : (typeof jQuery == 'function' && jQuery().closest ? jQuery(original_target).closest('form')[0] : null));
  var variant = (form && form.variant ? form.variant : BOLD.helpers.getVariantByForm(form));
  var product = (BOLD.variant_lookup && variant ? BOLD.products[BOLD.variant_lookup[variant.id]] : null);

  BOLD.helpers.triggerCommonEvent('product_quantity_changed', evt, {product:product, variant:variant, form:form, input:original_target, quantity:parseInt(original_target.value)})

};

BOLD.helpers.triggerVariantChange = function(evt){
  var original_target = evt.target;
  var form = (original_target.form ? original_target.form : (typeof jQuery == 'function' && jQuery().closest ? jQuery(original_target).closest('form')[0] : null));
  if(form){
    setTimeout(function(){
      //Brief timeout to make sure whatever is happening on the page to change the variant has completed - we don't want to be one change behind
      var variant = BOLD.helpers.getVariantByForm(this.form);
      if(variant){
        BOLD.common.eventEmitter.emit('BOLD_COMMON_variant_changed', {variant:variant});
      }
    }, 50);
  }
};


//-----------------------------------------------------
//Product-related functions
//-----------------------------------------------------

BOLD.helpers.getProduct = function(handle, success_callback, options){
//Possible flags for options: raw [true/false]; force_new [true/false]; save_product [true/false]; view [string];
  options = options || {
    "view":"json",
    "raw":false,
    "force_new":false,
    "save_product":true
  };
  // If no callback passed and there is a Shopify default one, use that
  var Shopify = Shopify || {};
  success_callback = success_callback || Shopify.onProduct;

  //If we already have the product in memory, use that
  if(BOLD.products && typeof BOLD.products[handle] === 'object' && !options.force_new){
    if(typeof success_callback === 'function'){
      success_callback(BOLD.products[handle]);
    }
    return;
  }
  //Get the product from our custom endpoint unless the 'raw' option is passed
  var url = '/products/' + handle;
  if(options.raw){
    url += '.js';
  }
  else{
    url += '?view=' + (options.view || 'json');
  }

  var onProductLoaded = function(product){
    if(typeof product !== 'object' && !options.raw){
      options.raw = true;
      BOLD.helpers.getProduct(handle, success_callback, options);
    }
    //Hold on to the returned object if the storage flag is set.
    if(options.save_product){
      BOLD.products = BOLD.products || {};
      BOLD.products[handle] = product;
      for(var v=0; v < product.all_variant_ids.length; v++){
        BOLD.variant_lookup[product.all_variant_ids[v]] = handle;
      }
    }
    if(typeof success_callback === 'function'){
      success_callback(product);
    }
    if(BOLD.common && BOLD.common.eventEmitter){
      BOLD.common.eventEmitter.emit('BOLD_COMMON_product_loaded', {product: product});
    }
  }
  BOLD.helpers.get(url, onProductLoaded);
};

BOLD.helpers.getAllProductsInCart = function(cart){
  for(var i=0; i<cart.items.length; i++){
    BOLD.helpers.getProduct(cart.items[i].handle);
  }
}

BOLD.helpers.getBaseVariantByVariantId = function(variant_id){
  var handle = BOLD.variant_lookup[variant_id];
  if(!handle){
    return;
  }
  var product = BOLD.products[handle];
  if(!product){
    BOLD.helpers.getProduct(handle);
    return;
  }

  for(var v=0; v < product.variants.length; v++){
    var variant = product.variants[v];
    if(variant_id == variant.id){
      return variant;
    }

    //Check to see if this is a special variant from one of our apps
    if(variant.qb_lookup){
      for(var lvl=0 in variant.qb_lookup.levels){
        if(variant_id == variant.qb_lookup.levels[lvl].id){
          return variant;
        }
      }
    }
    if(variant.csp_lookup){
      for(var tag in variant.csp_lookup){
        if(variant_id == variant.csp_lookup[tag].id){
          return variant;
        }
      }
    }
    if(product.variants[v].bdl_lookup && product.variants[v].bdl_lookup.id == variant_id){
      return variant;
    }
  }
}

BOLD.helpers.enforceProductQuantityMinMax = function(evt){
  var input = evt.target;
  BOLD.helpers.applyQuantityMinMax(input);
};

BOLD.helpers.applyQuantityMinMax = function(input){
  var form = input.form;
  if(!form && window.jQuery){
    form = jQuery(input).closest('form')[0];
    input = (form.quantity.length > 1 ? form.quantity[form.quantity.length - 1] : form.quantity);
  }
  if(!form){
    console.warn("BOLD INVENTORY CONTROL: Quantity box does not appear to be part of a form", input);
    return;
  }
  var variant_id_field = form["id[]"] || form.id;
  var variant_id = (variant_id_field.length > 1 && variant_id_field.type.indexOf('select') == -1 ? variant_id_field[length - 1] : variant_id_field).value;

  var product = BOLD.products[BOLD.variant_lookup[variant_id]];
  if(product && product.min_max_group){
    return;
  }

  var variant = BOLD.helpers.getBaseVariantByVariantId(variant_id);

  var quantityMinMax = BOLD.helpers.getQuantityMinMax(variant_id);
  var newValue = Math.max(quantityMinMax.min, Math.min(quantityMinMax.max, input.value));
  if(product && product.multiples_of > 1){
    newValue = (newValue - newValue % product.multiples_of);
    //Now let's just double-check to make sure we're not below the minimum.  If no min is set, assume a value of 1
    if(newValue < quantityMinMax.min || newValue < 1){
      newValue = quantityMinMax.min || 1;
    }
  }
  if(newValue != input.value){
    console.info('BOLD INVENTORY CONTROL: Quantity must be between ' + (quantityMinMax.min || 0 ) + ' and ' + (quantityMinMax.max || Infinity));
    if(BOLD.common && BOLD.common.eventEmitter){
      var originalValue = input.value;
      BOLD.helpers.triggerCommonEvent('quantity_adjusted', {target:input}, {form:form, form_type:'product', product:product, variant:variant, inventory_in_cart:BOLD.helpers.getItemQuantityByVariantId(variant_id), min:quantityMinMax.min, max:quantityMinMax.max, adjusted_value:newValue, original_value: originalValue});
    }
    input.value = newValue;
  }
}

BOLD.helpers.verifyAllProductQuantities = function(){
  var all_product_forms = document.querySelectorAll('[action*="/cart/add"]');
  for(var f=0; f < all_product_forms.length; f++){
    var form = all_product_forms[f];
    if(form.quantity){
      BOLD.helpers.applyQuantityMinMax(form.quantity);
    }
  }

}

BOLD.helpers.getQuantityMinMax = function(variant_id){
  var product = BOLD.products[BOLD.variant_lookup[variant_id]];
  var variant = BOLD.helpers.getBaseVariantByVariantId(variant_id);
  if(!product || !variant){
    console.warn('BOLD INVENTORY CONTROL: Could not find product information for variant ID ' + variant_id);
    return {min:0, max:Infinity};
  }

  return {
    max: Math.max(Math.min((typeof product.max == "number" ? product.max : Infinity), (variant.inventory_policy == 'deny' && variant.inventory_management ? variant.inventory_quantity : Infinity) ) - BOLD.helpers.getItemQuantityByVariantId(variant.id), 0),
    min: Math.max((typeof product.min == "number" ? product.min : 0) - BOLD.helpers.getItemQuantityByVariantId(variant.id), 0)
  }
}

//-----------------------------------------------------
//Cart-related functions
//-----------------------------------------------------

BOLD.helpers.getRawCart = function(success_callback, error_callback){
  BOLD.helpers.get('/cart.js', function(rawCart){
    BOLD.rawCart = rawCart;
    if(typeof success_callback === 'function'){
      success_callback(rawCart);
    }
    if(typeof BOLD.helpers.cleanCart === 'function'){
      BOLD.helpers.cleanCart(rawCart);
    }
    if(BOLD.common && BOLD.common.eventEmitter){
      BOLD.common.eventEmitter.emit('BOLD_COMMON_cart_loaded', rawCart);
    }
  }, error_callback)
}

BOLD.helpers.loadCartProducts = function(cart){
  for(var i=0; i < cart.items.length; i++){
    var product_handle = cart.items[i].handle;
    if(!BOLD.products[product_handle]){
      BOLD.helpers.getProduct(product_handle);
    }
  }
}

BOLD.helpers.getVariantByItem = function(item){
  var variant = BOLD.helpers.getBaseVariantByVariantId(item.variant_id);
  return variant;
}

BOLD.helpers.getItemQuantityByVariantId = function(variant_id){
  variant_id = BOLD.helpers.getBaseVariantByVariantId(variant_id).id || variant_id;
  var product = BOLD.products[BOLD.variant_lookup[variant_id]];
  var cart = (BOLD.common && BOLD.common.cartDoctor ? BOLD.common.cartDoctor.rawCart : BOLD.rawCart);
  var total = 0;
  for(var i=0; i < cart.items.length; i++){
    var item = cart.items[i];
    var base_variant = BOLD.helpers.getBaseVariantByVariantId(item.variant_id);
    var base_product = (base_variant ? BOLD.products[BOLD.variant_lookup[base_variant.id]] : null);
    if((base_variant && base_variant.id == variant_id) || (product && base_product && product.min_max_group && product.min_max_group == base_product.min_max_group)){
      total += item.quantity;
    }
  }
  return total;
}

BOLD.helpers.onCartQuantityChange = function(evt){
  var form = this.form || evt.target.form;
  if(!form && window.jQuery){
    form = jQuery(evt.target).closest('form')[0];
  }
  if(form){
    BOLD.helpers.verifyCartQuantities(form);
  }
}

BOLD.helpers.verifyCartQuantities = function(cart_form){
  if(!cart_form){
    return;
  }
  var cart = (BOLD.common && BOLD.common.cartDoctor ? BOLD.common.cartDoctor.rawCart : BOLD.rawCart);
  var all_cart_quantity_fields = cart_form.querySelectorAll('[name^="updates"]');
  if(all_cart_quantity_fields.length != cart.items.length){
    BOLD.common.eventEmitter.emit('BOLD_COMMON_cart_form_mismatch', {cart: cart, form: cart_form});
    return;
  }
  var quantities_passed = true;

  //Now that we know cart.items.length == all_cart_quantity_fields.length:
  var item_count = cart.items.length;
  for(var i = 0; i < item_count; i++){

    var item = cart.items[i];
    var input = all_cart_quantity_fields[i];
    var product = BOLD.products[item.handle];
    if(!product){
      BOLD.helpers.getProduct(item.handle, function(){ BOLD.helpers.verifyCartQuantities(cart_form)});
      return;
    }
    var variant = BOLD.helpers.getBaseVariantByVariantId(item.variant_id);

    var minMax = BOLD.helpers.getQuantityMinMax(item.variant_id);
    var max = Math.min(Math.min((typeof product.max === 'number' ? product.max : Infinity), (variant.inventory_policy == 'deny' && variant.inventory_management && !product.min_max_group ? variant.inventory_quantity : Infinity)), Infinity) - BOLD.helpers.getItemQuantityByVariantId(item.variant_id) + item.quantity;
    var min = Math.max((typeof product.min === 'number' ? product.min - BOLD.helpers.getItemQuantityByVariantId(item.variant_id) + item.quantity : 0),0);
    var newValue = Math.max(min, Math.min(max, input.value));

    cart.items[i].quantity = (product.min_max_group ? parseInt(input.value) : newValue);
    BOLD.helpers.resetCartPrices(cart);

    if(newValue != input.value){
      if(BOLD.common && BOLD.common.eventEmitter){
        var originalValue = input.value;
        if(product.min_max_group){
          quantities_passed = false;
          console.info('BOLD INVENTORY CONTROL: Sum of all "' + product.min_max_group + '" products must be between ' + (product.min || 0) + ' and ' + (product.max || Infinity));
          BOLD.helpers.triggerCommonEvent('quantity_group_error', {target:input}, {form:cart_form, form_type:'cart', group:product.min_max_group, product:product, variant:variant, inventory_in_cart:BOLD.helpers.getItemQuantityByVariantId(variant.id), min:product.min, max:product.max, total:BOLD.helpers.getItemQuantityByVariantId(item.variant_id), adjusted_value:newValue, original_value: originalValue});
        }else{
          input.value = newValue;
          BOLD.helpers.triggerEvent('change', input);
          console.info('BOLD INVENTORY CONTROL: Quantity must be between ' + (min || 0) + ' and ' + (max || Infinity));
          BOLD.helpers.triggerCommonEvent('quantity_adjusted', {target:input}, {form:cart_form, form_type:'cart', product:product, variant:variant, inventory_in_cart:BOLD.helpers.getItemQuantityByVariantId(variant.id), min:min, max:max, adjusted_value:newValue, original_value: originalValue});
        }
      }
    }
  }
  return quantities_passed;
}


BOLD.helpers.resetCartPrices = function(cart){
  if(!cart){
    return;
  }
  cart.total_price = 0;
  for(var i=0; i < cart.items.length; i++){
    var item = cart.items[i];
    item.line_price = item.price * item.quantity;
    cart.total_price += item.line_price;
  }
}

BOLD.helpers.verifyAllCartQuantities = function(e){
  var all_cart_forms = document.querySelectorAll('[action*="/cart"]:not([action*="/cart/add"]), [action*="/checkout"]');
  for(var c=0; c < all_cart_forms.length; c++){
    BOLD.helpers.verifyCartQuantities(all_cart_forms[c]);
  }

  if(e && e.data && e.data.form && !BOLD.helpers.verifyCartQuantities(e.data.form) && e.original_event){
    e.original_event.preventDefault();
    e.original_event.stopImmediatePropagation();
    BOLD.helpers.triggerCommonEvent('checkout_blocked', e, e.data);
  }
}

//-----------------------------------------------------
//Misc. helper functions
//-----------------------------------------------------

BOLD.helpers.post = function(url, data, success_callback, error_callback){
  var request = new XMLHttpRequest();
  request.open('POST', url, true);
  request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  request.onload = function() {
    if (request.status >= 200 && request.status < 400) {
      // Success!
      var response;
      try {
        response = JSON.parse(request.responseText);
      } catch (e) {
        response = request.responseText;
      } finally {
        if(typeof success_callback === 'function'){
          callback(response)
        }
      }
    } else {
      // We reached our target server, but it returned an error
      if(typeof error_callback === 'function'){
        error_callback(request.responseText);
      }
    }
  };
  request.send(data);
};

BOLD.helpers.get = function(url, success_callback, error_callback){
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.onload = function() {
    if (request.status >= 200 && request.status < 400) {
      // Success!
      var response;
      try {
        response = JSON.parse(request.responseText);
      } catch (e) {
        response = request.responseText;
      } finally {
        if(typeof success_callback === 'function'){
          success_callback(response)
        }
      }
    } else {
      // We reached our target server, but it returned an error
      if(typeof error_callback === 'function'){
        error_callback(request.responseText);
      }
    }
  };
  request.send();
};
BOLD.helpers.newHiddenInput = function(name, value, classname){
  var input = document.createElement('input');
  input.setAttribute('type', 'hidden');
  input.setAttribute('name', name);
  input.setAttribute('value', value);
  input.className = 'bold_hidden_input ' + name + ' ' + classname;
  return input;
};

BOLD.helpers.getVariantByForm = function(form){
  if(!form){
    return;
  }
  //Check to make sure we can find the product/variant
  if(!(form.id && form.id.value && BOLD.variant_lookup && BOLD.products)){
    return null;
  }
  var variantId = form.id.value;
  var product_handle = BOLD.variant_lookup[variantId];
  var product = BOLD.products[product_handle];

  if(!product) {
    return null;
  }

  var variant;
  for(var vindex in product.variants){
    if(product.variants[vindex].id == variantId){
      variant = product.variants[vindex];
      form.variant = variant;
      break;
    }
  }
  return variant;
};
BOLD.helpers.getFormByVariant = function(variant){
  //Make sure we have a form to work with
  var variantIdFields = document.querySelectorAll('[name="id"]');
  var variantIdField = {};
  for(var vif = 0; vif < variantIdFields.length; vif++){
    if(variantIdFields[vif].value==variant.id){
      variantIdField = variantIdFields[vif];
    }
  }
  return variantIdField.form;
}

BOLD.helpers.triggerEvent = function (t,e){if(document.createEventObject){var n=document.createEventObject();return e.fireEvent("on"+t,n)}var i=document.createEvent("HTMLEvents");return i.initEvent(t,!0,!0),!e.dispatchEvent(i)}

//-----------------------------------------------------
//Events to run when page loads
//-----------------------------------------------------
if(!BOLD.rawCart){
  BOLD.helpers.getRawCart(BOLD.helpers.loadCartProducts);
}
else{
  BOLD.helpers.loadCartProducts(BOLD.rawCart);
}

if(location.pathname && location.pathname.indexOf('/products/') > -1){
  var handle = location.pathname.split('/products/')[1];
  BOLD.helpers.getProduct(handle);
}

BOLD.helpers.setupInventoryEventListeners();
document.addEventListener("DOMContentLoaded", BOLD.helpers.setupInventoryEventListeners);
window.addEventListener('load', BOLD.helpers.setupInventoryEventListeners);