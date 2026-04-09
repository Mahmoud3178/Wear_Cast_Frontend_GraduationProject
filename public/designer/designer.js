(function () {
  'use strict';

  const LEGACY_DESIGNS_KEY = 'wearcast_designs';
  const COLORS = ['purple', 'pink', 'lightpink', 'lightgray', 'black', 'darkgray', 'white', 'darkblue'];

  function getDesignsStorageKey() {
    var k = typeof window !== 'undefined' ? window.__WEARCAST_DESIGNS_STORAGE_KEY__ : '';
    return typeof k === 'string' && k.length ? k : LEGACY_DESIGNS_KEY;
  }

  // Product images: use files in assets/ (e.g. hoodie-front.png or hoodie-front.jpg)
  var ASSETS = {
    hoodie: { front: 'assets/hoodie-front.jpg', back: 'assets/hoodie-back.webp', right: 'assets/hoodie-right.jpg', left: 'assets/hoodie-left.webp' },
    tshirt: { front: 'assets/tshirt-front.webp', back: 'assets/tshirt-back.webp', right: 'assets/tshirt-right.jpg', left: 'assets/tshirt-left.jpg' },
    cap: { front: 'assets/cap-front.jpg', back: 'assets/cap-back.jpg', right: 'assets/cap-front.jpg', left: 'assets/cap-front.jpg' } // Right and left fallbacks
  };
  var ASSETS_JPG = {
    hoodie: { front: 'assets/hoodie-front.jpg', back: 'assets/hoodie-back.jpg', right: 'assets/hoodie-right.jpg', left: 'assets/hoodie-left.jpg' },
    tshirt: { front: 'assets/tshirt-front.jpg', back: 'assets/tshirt-back.jpg', right: 'assets/tshirt-right.jpg', left: 'assets/tshirt-left.jpg' },
    cap: { front: 'assets/cap-front.jpg', back: 'assets/cap-back.jpg', right: 'assets/cap-right.jpg', left: 'assets/cap-left.jpg' }
  };
  var ASSETS_WEBP = {
    hoodie: { front: 'assets/hoodie-front.webp', back: 'assets/hoodie-back.webp', right: 'assets/hoodie-right.webp', left: 'assets/hoodie-left.webp' },
    tshirt: { front: 'assets/tshirt-front.webp', back: 'assets/tshirt-back.webp', right: 'assets/tshirt-right.webp', left: 'assets/tshirt-left.webp' },
    cap: { front: 'assets/cap-front.webp', back: 'assets/cap-back.webp', right: 'assets/cap-right.webp', left: 'assets/cap-left.webp' }
  };

  /** Default copy for built-in templates when opening Product details */
  var STATIC_PRODUCT_DETAILS = {
    hoodie: {
      title: "Women's Hoodie",
      description: 'This plush pullover is perfect for the gym, errands or kicking around the house. The midweight fabric makes for a versatile under, over or solo layer. A staple in casual comfort, this classic style is a must-own.',
      bullets: [
        '50% cotton / 50% polyester · Fabric weight: 8 oz (midweight)',
        'Soft, plush inside with adjustable drawstring hood',
        'Ribbed cuffs and waist for a secure fit',
        'Item runs big – ordering a size down is recommended',
        'Imported; printed in the U.S.A. with sustainably sourced cotton'
      ],
      sizeSub: 'Available sizes: S, M, L, XL, 2XL · Fit: Loose fit',
      sizeRows: [
        { label: 'S', a: 26.5, b: 20, c: 24.49 },
        { label: 'M', a: 27.44, b: 21.5, c: 24.72 },
        { label: 'L', a: 27.95, b: 22.99, c: 25 },
        { label: 'XL', a: 30.43, b: 25.47, c: 25.24 },
        { label: '2XL', a: 30.94, b: 27.99, c: 25.47 }
      ],
      showPill: true,
      showRating: true
    },
    tshirt: {
      title: 'Unisex T-Shirt',
      description: 'A comfortable everyday tee made for custom prints. Check the size table and compare with a shirt you already own.',
      bullets: [
        'Soft fabric · Machine washable',
        'Crew neck · Unisex fit',
        'Optimized for digital direct printing'
      ],
      sizeSub: 'Available sizes: S, M, L, XL, 2XL · Use measurements below (inches)',
      sizeRows: [
        { label: 'S', a: 26.5, b: 20, c: 24.49 },
        { label: 'M', a: 27.44, b: 21.5, c: 24.72 },
        { label: 'L', a: 27.95, b: 22.99, c: 25 },
        { label: 'XL', a: 30.43, b: 25.47, c: 25.24 },
        { label: '2XL', a: 30.94, b: 27.99, c: 25.47 }
      ],
      showPill: false,
      showRating: true
    },
    cap: {
      title: 'Cap',
      description: 'Classic cap profile for embroidery and print. One size with adjustable closure.',
      bullets: ['Structured panels', 'Adjustable strap', 'Designed for front-panel decoration'],
      sizeSub: 'One size · Dimensions vary by style',
      sizeRows: [
        { label: 'OSFA', a: 22, b: 7.5, c: 10 }
      ],
      showPill: false,
      showRating: true
    }
  };

  function placeholder(base, color, view, product) {
    var c = {
      black: '1a1a1a', white: 'f5f5f5', purple: '6b21a8', pink: 'ec4899',
      lightpink: 'f9a8d4', lightgray: 'd1d5db', darkgray: '4b5563', darkblue: '1e3a5f'
    }[color] || '1a1a1a';
    var t = product ? product + '+' + view : view;
    return 'https://placehold.co/' + base + '/' + c + '/888?text=' + encodeURIComponent(t);
  }

  function getProductImageUrl(productKey, view) {
    var views = ASSETS[productKey];
    if (!views) return placeholder('400x480', 'black', view, productKey);
    return views[view] || views.front;
  }

  // Dynamic catalog products only (loaded from Angular bootstrap).
  var PRODUCTS = {};

  var productImage, productStage, productTitleEl, productPriceEl, uploadInput, textModal, textInput, textCancel, textAdd;
  var colorNameEl, colorSwatches, textOptionsPanel, textFontSelect, textColorInput, textColorHex, textBendSlider, textBendValue;
  var saveModal, saveNameInput, saveCancel, saveConfirm, loadModal, savedListEl, loadCloseBtn;
  var productDetailsModal, productDetailsOpenBtn, productDetailsCloseBtn;
  var productsModal, productsModalClose;
  var sizeQtyModal, sizeQtyRowsEl, sizeQtyModalClose, sizeQtyModalCancel, sizeQtyModalConfirm;
  var designsPanel, designCategorySelect, designSearchInput, designTagsEl, designGridEl;

  let canvas;
  let currentProduct = '';
  let currentColor = 'black';
  let currentView = 'front';
  let undoStack = [];
  let redoStack = [];
  const MAX_UNDO = 50;
  var viewDesigns = {};
  var viewUndoStacks = {};
  var viewRedoStacks = {};
  var VIEW_KEYS = ['front', 'back', 'right', 'left'];

  var STICKER_TAGS = [
    'Football', 'Cool', 'Star', 'Christmas', 'Dog', 'Love', 'Heart', 'Money',
    'Rose', 'Flower', 'Fire', 'Skull', 'Music', 'Sport', 'Circle', 'Flags'
  ];

  var STICKERS = [
    { id: 'rose1', name: 'Red rose', category: 'rose', price: 2, image: 'https://placehold.co/200x200/fee2e2/7f1d1d?text=Rose+1' },
    { id: 'rose2', name: 'Dripping rose', category: 'rose', price: 2, image: 'https://placehold.co/200x200/fecaca/7f1d1d?text=Rose+2' },
    { id: 'sport1', name: 'Football club', category: 'sport', price: 2, image: 'https://placehold.co/200x200/dbeafe/1d4ed8?text=Sport' },
    { id: 'music1', name: 'Music note', category: 'music', price: 2, image: 'https://placehold.co/200x200/e0f2fe/0369a1?text=Music' },
    { id: 'star1', name: 'Star badge', category: 'all', price: 2, image: 'https://placehold.co/200x200/fef9c3/a16207?text=Star' }
  ];

  function getStageDimensions() {
    var p = PRODUCTS[currentProduct];
    if (!p) return { width: 400, height: 480 };
    return { width: p.width || 400, height: p.height || 480 };
  }

  function formatPrice(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
    } catch (e) {
      return '$' + n.toFixed(2);
    }
  }

  function syncColorNameLabel() {
    var p = PRODUCTS[currentProduct];
    var cat = p && p.wearcastCatalog;
    var label = currentColor;
    if (cat && cat.colorLabelBySlug && cat.colorLabelBySlug[currentColor]) {
      label = cat.colorLabelBySlug[currentColor];
    }
    if (colorNameEl) colorNameEl.textContent = label;
  }

  function syncProductChrome() {
    var p = PRODUCTS[currentProduct];
    if (!p) {
      if (productTitleEl) productTitleEl.textContent = '';
      if (productPriceEl) {
        productPriceEl.textContent = '';
        productPriceEl.hidden = true;
      }
      return;
    }
    if (productTitleEl) productTitleEl.textContent = p.title || '';
    if (productPriceEl) {
      if (typeof p.price === 'number' && isFinite(p.price)) {
        productPriceEl.textContent = formatPrice(p.price);
        productPriceEl.hidden = false;
      } else {
        productPriceEl.textContent = '';
        productPriceEl.hidden = true;
      }
    }
    syncColorNameLabel();
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sizeRowsToHtml(rows) {
    return rows.map(function (r) {
      return '<tr><td>' + escHtml(r.label) + '</td><td>' + escHtml(String(r.a)) + '</td><td>' +
        escHtml(String(r.b)) + '</td><td>' + escHtml(String(r.c)) + '</td></tr>';
    }).join('');
  }

  function setPdCategoryImage(url, altText) {
    var imgEl = document.getElementById('pd-category-image');
    if (!imgEl) return;
    if (url) {
      imgEl.src = url;
      imgEl.alt = altText || 'Category';
      imgEl.hidden = false;
    } else {
      imgEl.removeAttribute('src');
      imgEl.alt = '';
      imgEl.hidden = true;
    }
  }

  function populateProductDetailsModal() {
    var p = PRODUCTS[currentProduct];
    var titleEl = document.getElementById('pd-title');
    var descEl = document.getElementById('pd-description');
    var bulletsEl = document.getElementById('pd-bullets');
    var pillEl = document.getElementById('pd-pill');
    var ratingEl = document.getElementById('pd-rating');
    var subEl = document.getElementById('pd-size-sub');
    var tbodyEl = document.getElementById('pd-size-tbody');
    var isCatalog = p && p.wearcastCatalog;
    if (isCatalog) {
      if (titleEl) titleEl.textContent = p.title || '';
      if (descEl) descEl.textContent = p.description || 'No description provided.';
      if (bulletsEl) {
        bulletsEl.innerHTML = '';
        bulletsEl.style.display = 'none';
      }
      if (pillEl) pillEl.style.display = 'none';
      if (ratingEl) ratingEl.style.display = 'none';
      if (p.sizes && p.sizes.length && tbodyEl) {
        tbodyEl.innerHTML = sizeRowsToHtml(p.sizes);
        var labels = p.sizes.map(function (s) { return s.label; }).join(', ');
        if (subEl) subEl.textContent = 'Available sizes: ' + labels + ' · Measurements in inches.';
      } else {
        if (tbodyEl) tbodyEl.innerHTML = '';
        if (subEl) subEl.textContent = 'No size chart has been added for this product yet.';
      }
      setPdCategoryImage(p.categoryImageUrl || '', p.categoryName || p.title || 'Category');
      return;
    }
    var st = STATIC_PRODUCT_DETAILS[currentProduct] || STATIC_PRODUCT_DETAILS.hoodie;
    if (titleEl) titleEl.textContent = st.title;
    if (descEl) descEl.textContent = st.description;
    if (bulletsEl) {
      bulletsEl.style.display = '';
      bulletsEl.innerHTML = st.bullets.map(function (b) { return '<li>' + escHtml(b) + '</li>'; }).join('');
    }
    if (pillEl) pillEl.style.display = st.showPill ? '' : 'none';
    if (ratingEl) ratingEl.style.display = st.showRating ? '' : 'none';
    if (subEl) subEl.textContent = st.sizeSub;
    if (tbodyEl) tbodyEl.innerHTML = sizeRowsToHtml(st.sizeRows);
    setPdCategoryImage('', '');
  }

  function getProductImages() {
    var prod = PRODUCTS[currentProduct];
    if (!prod || !prod.images) return {};
    const imgs = prod.images;
    return typeof imgs === 'function' ? imgs() : imgs;
  }

  function initCanvas() {
    const dim = getStageDimensions();
    canvas = new fabric.Canvas('design-canvas', {
      width: dim.width,
      height: dim.height,
      backgroundColor: 'transparent',
      selection: true,
      preserveObjectStacking: true,
    });

    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#fff',
      cornerStrokeColor: '#16a34a',
      cornerSize: 10,
      padding: 4,
      borderColor: '#16a34a',
    });

    canvas.on('object:modified', saveState);
    canvas.on('selection:created', onSelectionChange);
    canvas.on('selection:updated', onSelectionChange);
    canvas.on('selection:cleared', onSelectionCleared);
    saveState();
  }

  function resizeStageAndCanvas() {
    const dim = getStageDimensions();
    productStage.style.width = dim.width + 'px';
    productStage.style.height = dim.height + 'px';
    if (canvas) {
      canvas.setDimensions({ width: dim.width, height: dim.height });
      canvas.renderAll();
    }
  }

  function onSelectionChange(e) {
    var obj = e.selected && e.selected[0];
    if (!obj) return;
    var deleteBtn = document.getElementById('delete-selected-btn');
    if (deleteBtn) deleteBtn.classList.remove('hidden');
    if (isTextOrCurvedText(obj)) {
      textOptionsPanel.classList.remove('hidden');
      syncTextOptionsFromObject(obj);
    } else {
      textOptionsPanel.classList.add('hidden');
    }
  }

  function onSelectionCleared() {
    textOptionsPanel.classList.add('hidden');
    var deleteBtn = document.getElementById('delete-selected-btn');
    if (deleteBtn) deleteBtn.classList.add('hidden');
  }

  function removeSelectedObject() {
    if (!canvas) return;
    var active = canvas.getActiveObject();
    if (active) {
      canvas.remove(active);
      canvas.discardActiveObject();
      canvas.renderAll();
      saveState();
      onSelectionCleared();
    }
  }

  function isTextOrCurvedText(obj) {
    return (obj.type === 'i-text' || obj.type === 'text') || (obj.type === 'group' && obj.textSource);
  }

  function getTextOptionsFromObject(obj) {
    if (obj.type === 'i-text' || obj.type === 'text') {
      return {
        fontFamily: obj.fontFamily || 'Arial',
        fill: obj.fill || '#ffffff',
        bend: 0
      };
    }
    if (obj.type === 'group' && obj.textSource) {
      const first = obj.item(0);
      return {
        fontFamily: first ? first.fontFamily : 'Arial',
        fill: first ? first.fill : '#ffffff',
        bend: typeof obj.textBend === 'number' ? obj.textBend : 0
      };
    }
    return null;
  }

  function syncTextOptionsFromObject(obj) {
    const opts = getTextOptionsFromObject(obj);
    if (!opts) return;
    textFontSelect.value = opts.fontFamily;
    textColorInput.value = opts.fill;
    textColorHex.textContent = opts.fill;
    textBendSlider.value = opts.bend;
    textBendValue.textContent = opts.bend;
  }

  function createCurvedTextGroup(str, options) {
    const fontFamily = options.fontFamily || 'Arial';
    const fontSize = options.fontSize || 28;
    const fill = options.fill || '#ffffff';
    const bend = options.bend || 0;
    const chars = str.split('');
    if (chars.length === 0) return null;
    const radius = Math.max(80, chars.length * 12);
    const totalAngle = (bend / 100) * Math.PI;
    const startAngle = Math.PI / 2 + totalAngle / 2;
    const step = chars.length === 1 ? 0 : totalAngle / (chars.length - 1);
    const texts = [];
    for (let i = 0; i < chars.length; i++) {
      const angle = startAngle - i * step;
      const x = Math.cos(angle) * radius;
      const y = -Math.sin(angle) * radius;
      const t = new fabric.Text(chars[i], {
        fontFamily: fontFamily,
        fontSize: fontSize,
        fill: fill,
        originX: 'center',
        originY: 'center',
        left: x,
        top: y,
      });
      texts.push(t);
    }
    const group = new fabric.Group(texts, {
      originX: 'center',
      originY: 'center',
      left: options.left,
      top: options.top,
    });
    group.textSource = str;
    group.textBend = bend;
    group.fontFamily = fontFamily;
    group.fontSize = fontSize;
    group.fill = fill;
    return group;
  }

  function applyBendToSelection(bend) {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    if (obj.type === 'i-text' || obj.type === 'text') {
      const str = obj.text;
      const left = obj.left + (obj.width * (obj.originX === 'center' ? 0.5 : 0));
      const top = obj.top + (obj.height * (obj.originY === 'center' ? 0.5 : 0));
      const group = createCurvedTextGroup(str, {
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fill: obj.fill,
        bend: bend,
        left: left,
        top: top
      });
      if (group) {
        canvas.remove(obj);
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.renderAll();
        saveState();
      }
      return;
    }
    if (obj.type === 'group' && obj.textSource) {
      const left = obj.left;
      const top = obj.top;
      const group = createCurvedTextGroup(obj.textSource, {
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fill: obj.fill,
        bend: bend,
        left: left,
        top: top
      });
      if (group) {
        canvas.remove(obj);
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.renderAll();
        saveState();
      }
    }
  }

  function applyFontToSelection(fontFamily) {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    if (obj.type === 'i-text' || obj.type === 'text') {
      obj.set('fontFamily', fontFamily);
      canvas.renderAll();
      saveState();
      return;
    }
    if (obj.type === 'group' && obj.textSource) {
      obj.fontFamily = fontFamily;
      obj.getObjects().forEach(function (o) { o.set('fontFamily', fontFamily); });
      canvas.renderAll();
      saveState();
    }
  }

  function applyColorToSelection(fill) {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    if (obj.type === 'i-text' || obj.type === 'text') {
      obj.set('fill', fill);
      canvas.renderAll();
      saveState();
      return;
    }
    if (obj.type === 'group' && obj.textSource) {
      obj.fill = fill;
      obj.getObjects().forEach(function (o) { o.set('fill', fill); });
      canvas.renderAll();
      saveState();
    }
  }

  function saveState() {
    if (!canvas) return;
    var json = canvas.toJSON(['selectable', 'evented']);
    if (undoStack.length >= MAX_UNDO) undoStack.shift();
    undoStack.push(JSON.stringify(json));
    redoStack.length = 0;
    updateUndoRedoButtons();
  }

  function saveCurrentViewToStore() {
    if (!canvas) return;
    viewDesigns[currentProduct] = viewDesigns[currentProduct] || {};
    viewDesigns[currentProduct][currentView] = canvas.toJSON(['selectable', 'evented']);
    viewUndoStacks[currentProduct] = viewUndoStacks[currentProduct] || {};
    viewRedoStacks[currentProduct] = viewRedoStacks[currentProduct] || {};
    viewUndoStacks[currentProduct][currentView] = undoStack.slice();
    viewRedoStacks[currentProduct][currentView] = redoStack.slice();
  }

  function loadViewFromStore(view) {
    viewDesigns[currentProduct] = viewDesigns[currentProduct] || {};
    viewUndoStacks[currentProduct] = viewUndoStacks[currentProduct] || {};
    viewRedoStacks[currentProduct] = viewRedoStacks[currentProduct] || {};
    var data = viewDesigns[currentProduct][view];
    if (data) {
      canvas.loadFromJSON(data, function () {
        canvas.renderAll();
      });
      undoStack = (viewUndoStacks[currentProduct][view] || []).slice();
      redoStack = (viewRedoStacks[currentProduct][view] || []).slice();
      if (undoStack.length === 0) saveState();
    } else {
      canvas.clear();
      undoStack = [];
      redoStack = [];
      saveState();
    }
    updateUndoRedoButtons();
  }

  function addStickerFromUrl(url) {
    if (!canvas || !url) return;
    var dim = getStageDimensions();
    fabric.Image.fromURL(url, function (img) {
      if (!img) return;
      var scale = Math.min(140 / img.width, 140 / img.height, 1);
      img.set({
        left: dim.width / 2,
        top: dim.height / 2,
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      saveState();
    }, { crossOrigin: 'anonymous' });
  }

  function renderStickerTags() {
    if (!designTagsEl) return;
    designTagsEl.innerHTML = '';
    STICKER_TAGS.forEach(function (tag) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'design-tag';
      btn.textContent = tag;
      btn.addEventListener('click', function () {
        if (designSearchInput) designSearchInput.value = tag;
        renderStickerGrid();
      });
      designTagsEl.appendChild(btn);
    });
  }

  function renderStickerGrid() {
    if (!designGridEl) return;
    var category = designCategorySelect ? designCategorySelect.value : 'all';
    var term = designSearchInput ? designSearchInput.value.trim().toLowerCase() : '';
    designGridEl.innerHTML = '';
    STICKERS.filter(function (s) {
      var matchCat = category === 'all' || s.category === category;
      var matchTerm = !term || s.name.toLowerCase().indexOf(term) !== -1;
      return matchCat && matchTerm;
    }).forEach(function (s) {
      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'design-tile';
      var thumb = document.createElement('div');
      thumb.className = 'design-tile-thumb';
      thumb.style.backgroundImage = 'url(' + s.image + ')';
      var name = document.createElement('div');
      name.className = 'design-tile-name';
      name.textContent = s.name;
      tile.appendChild(thumb);
      tile.appendChild(name);
      tile.addEventListener('click', function () {
        addStickerFromUrl(s.image);
      });
      designGridEl.appendChild(tile);
    });
  }

  function updateUndoRedoButtons() {
    var undoBtn = document.getElementById('undo-btn');
    var redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = undoStack.length <= 1;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    const prev = undoStack[undoStack.length - 1];
    if (prev) {
      canvas.loadFromJSON(prev, function () {
        canvas.renderAll();
        updateUndoRedoButtons();
      });
    }
    updateUndoRedoButtons();
  }

  function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack.pop();
    undoStack.push(next);
    canvas.loadFromJSON(next, function () {
      canvas.renderAll();
      updateUndoRedoButtons();
    });
    updateUndoRedoButtons();
  }

  function openTextModal() {
    textInput.value = 'Your text';
    textModal.classList.remove('hidden');
    textInput.focus();
  }

  function closeTextModal() {
    textModal.classList.add('hidden');
  }

  function addText(str) {
    const dim = getStageDimensions();
    const text = new fabric.IText(str || 'Your text', {
      left: dim.width / 2 - 60,
      top: dim.height / 2 - 20,
      fontFamily: textFontSelect.value || 'Arial',
      fontSize: 28,
      fill: textColorInput.value || '#ffffff',
      originX: 'center',
      originY: 'center',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveState();
    syncTextOptionsFromObject(text);
    textOptionsPanel.classList.remove('hidden');
  }

  function addImageFromFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const dim = getStageDimensions();
    const reader = new FileReader();
    reader.onload = function (e) {
      fabric.Image.fromURL(e.target.result, function (img) {
        if (!img) return;
        const scale = Math.min(120 / img.width, 120 / img.height, 1);
        img.set({
          left: dim.width / 2,
          top: dim.height / 2,
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveState();
      });
    };
    reader.readAsDataURL(file);
  }

  var TINY_IMAGE_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3C/svg%3E';

  function shrinkCanvasJson(obj, maxLength) {
    maxLength = maxLength || 2000;
    if (!obj) return obj;
    if (typeof obj === 'string') {
      if (obj.indexOf('data:image') === 0 && obj.length > maxLength) return TINY_IMAGE_PLACEHOLDER;
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(function (item) { return shrinkCanvasJson(item, maxLength); });
    }
    var out = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        out[k] = shrinkCanvasJson(obj[k], maxLength);
      }
    }
    return out;
  }

  function getDesignState(shrink) {
    saveCurrentViewToStore();
    var vd = viewDesigns[currentProduct];
    if (vd && shrink) {
      vd = {
        front: vd.front ? shrinkCanvasJson(vd.front) : null,
        back: vd.back ? shrinkCanvasJson(vd.back) : null,
        right: vd.right ? shrinkCanvasJson(vd.right) : null,
        left: vd.left ? shrinkCanvasJson(vd.left) : null
      };
    }
    return {
      productType: currentProduct,
      productColor: currentColor,
      view: currentView,
      viewDesigns: vd || {},
      canvasJson: (vd && vd[currentView]) || null
    };
  }

  function getSavedDesigns() {
    try {
      var key = getDesignsStorageKey();
      var raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
      if (key === 'wearcast_designs:guest' || key === LEGACY_DESIGNS_KEY) {
        var legacy = localStorage.getItem(LEGACY_DESIGNS_KEY);
        if (legacy) {
          return JSON.parse(legacy);
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  function setProductImage() {
    var imgs = getProductImages();
    if (!productImage) return;
    if (!(imgs && imgs[currentColor])) {
      productImage.removeAttribute('src');
      return;
    }
    var row = imgs[currentColor];
    var src = row[currentView];
    if (!src) {
      var i;
      for (i = 0; i < VIEW_KEYS.length; i++) {
        if (row[VIEW_KEYS[i]]) {
          src = row[VIEW_KEYS[i]];
          break;
        }
      }
    }
    if (src) {
      productImage.src = src;
    } else {
      productImage.removeAttribute('src');
    }
  }

  function setProduct(productKey) {
    if (!PRODUCTS[productKey] || currentProduct === productKey) return;
    saveCurrentViewToStore();
    currentProduct = productKey;
    var p = PRODUCTS[currentProduct];
    syncProductChrome();
    document.querySelectorAll('.product-card').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-product') === currentProduct);
    });
    resizeStageAndCanvas();
    loadViewFromStore(currentView);

    // Guaranteed redraw of colors and photo
    rebuildColorSwatchesForProduct(productKey);
    var imgsP = typeof p.images === 'function' ? p.images() : (p.images || {});
    var ck = Object.keys(imgsP).find(function (c) {
      var r = imgsP[c];
      return r && (r.front || r.back || r.right || r.left);
    });

    // Fallback to the first color slug if no images were matched
    ck = ck || Object.keys(imgsP)[0];

    if (ck) {
      setColor(ck);
    } else {
      setProductImage(); // Update at least to clear old photo
    }
  }

  function setView(viewKey) {
    if (VIEW_KEYS.indexOf(viewKey) === -1 || currentView === viewKey) return;
    saveCurrentViewToStore();
    currentView = viewKey;
    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === currentView);
    });
    loadViewFromStore(currentView);
    setProductImage();
  }

  function setColor(colorKey) {
    var imgs = getProductImages();
    var hasSlot = imgs && imgs[colorKey];
    if (!hasSlot && COLORS.indexOf(colorKey) === -1) return;
    currentColor = colorKey;
    syncColorNameLabel();
    document.querySelectorAll('.color-swatch').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-color') === currentColor);
    });
    setProductImage();
  }

  function setDesignState(state) {
    var firstKey = Object.keys(PRODUCTS)[0] || '';
    currentProduct = state.productType || firstKey;
    if (!PRODUCTS[currentProduct]) {
      currentProduct = firstKey;
    }
    if (!currentProduct) return;
    currentColor = state.productColor || 'black';
    currentView = state.view || 'front';
    if (state.viewDesigns) {
      viewDesigns[currentProduct] = state.viewDesigns;
    } else if (state.canvasJson) {
      viewDesigns[currentProduct] = { front: state.canvasJson, back: null, right: null, left: null };
    }
    var p = PRODUCTS[currentProduct];
    syncProductChrome();
    document.querySelectorAll('.product-card').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-product') === currentProduct);
    });
    setColor(currentColor);
    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === currentView);
    });
    resizeStageAndCanvas();
    loadViewFromStore(currentView);
    setProductImage();
    undoStack = viewUndoStacks[currentProduct] && viewUndoStacks[currentProduct][currentView] ? viewUndoStacks[currentProduct][currentView].slice() : [];
    redoStack = viewRedoStacks[currentProduct] && viewRedoStacks[currentProduct][currentView] ? viewRedoStacks[currentProduct][currentView].slice() : [];
    if (undoStack.length === 0 && canvas) saveState();
    updateUndoRedoButtons();
  }

  function firstCatalogImageUrl(imgs) {
    var cols = Object.keys(imgs);
    for (var i = 0; i < cols.length; i++) {
      var row = imgs[cols[i]];
      if (!row || typeof row !== 'object') continue;
      for (var j = 0; j < VIEW_KEYS.length; j++) {
        var url = row[VIEW_KEYS[j]];
        if (url) return url;
      }
    }
    return null;
  }

  /**
   * Factory catalog templates: POST design to API when logged in.
   * Built-in templates (hoodie/tshirt/cap): localStorage only.
   */
  function saveDesign(name) {
    saveCurrentViewToStore();
    var p = PRODUCTS[currentProduct];
    var cat = p && p.wearcastCatalog;
    var fn = window.__WEARCAST_SAVE_CUSTOMER_DESIGN__;
    var vd = viewDesigns[currentProduct];
    if (cat && typeof fn === 'function') {
      var colorId = cat.colorIdsBySlug && cat.colorIdsBySlug[currentColor];
      if (!colorId) {
        alert('Could not match this color to the catalog. Pick another swatch or reload the design page.');
        return;
      }
      if (saveConfirm) saveConfirm.disabled = true;
      fn({
        productId: cat.designedProductId,
        productColorId: colorId,
        viewDesignsJson: JSON.stringify(vd || {})
      }).then(function () {
        if (saveModal) saveModal.classList.add('hidden');
        saveDesignToList(name, {
          silent: true,
          skipModalClose: true,
          savedToAccount: true
        });
        alert('Design saved to your WearCast account. It is listed under My saved designs on this device.');
      }).catch(function (err) {
        var msg = (err && err.message) ? err.message : String(err);
        if (window.confirm('Could not save to the server (' + msg + '). Save on this device only?')) {
          saveDesignToList(name);
        }
      }).finally(function () {
        if (saveConfirm) saveConfirm.disabled = false;
      });
      return;
    }
    saveDesignToList(name);
  }

  function saveDesignToList(name, opts) {
    opts = opts || {};
    var list = getSavedDesigns();
    var id = 'id_' + Date.now();
    var state = getDesignState(false);
    var item = {
      id: id,
      name: name || 'Untitled design',
      createdAt: new Date().toISOString(),
      state: state,
      savedToAccount: !!opts.savedToAccount
    };
    try {
      list.push(item);
      localStorage.setItem(getDesignsStorageKey(), JSON.stringify(list));
      if (!opts.skipModalClose && saveModal) saveModal.classList.add('hidden');
      if (!opts.silent) {
        alert('Design saved! Open "My saved designs" to see it.');
      }
    } catch (err) {
      if (err && err.name === 'QuotaExceededError') {
        list.pop();
        state = getDesignState(true);
        item.state = state;
        list.push(item);
        try {
          localStorage.setItem(getDesignsStorageKey(), JSON.stringify(list));
          if (!opts.skipModalClose && saveModal) saveModal.classList.add('hidden');
          if (!opts.silent) {
            alert('Design saved with reduced image quality (to fit storage). Open "My saved designs" to see it.');
          }
        } catch (err2) {
          list.pop();
          if (saveModal) saveModal.classList.remove('hidden');
          alert('Storage is full. Delete some saved designs from "My saved designs", or remove uploaded images from this design, then try again.');
        }
      } else {
        console.error('Save failed:', err);
        alert('Could not save design. Check the console for details.');
      }
    }
  }

  function loadDesignById(id) {
    const list = getSavedDesigns();
    const item = list.find(function (d) { return d.id === id; });
    if (item && item.state) {
      setDesignState(item.state);
      loadModal.classList.add('hidden');
    }
  }

  function deleteDesignById(id, e) {
    e.stopPropagation();
    const list = getSavedDesigns().filter(function (d) { return d.id !== id; });
    localStorage.setItem(getDesignsStorageKey(), JSON.stringify(list));
    renderSavedList();
  }

  function renderSavedList() {
    const list = getSavedDesigns();
    savedListEl.innerHTML = '';
    if (list.length === 0) {
      savedListEl.innerHTML = '<p class="saved-empty">No saved designs yet. Save your current design to see it here.</p>';
      return;
    }
    list.forEach(function (item) {
      const div = document.createElement('div');
      div.className = 'saved-item';
      const date = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
      const meta = (item.state && item.state.productType) ? item.state.productType + ' · ' + (item.state.productColor || '') + ' · ' + date : date;
      div.innerHTML =
        '<div class="saved-item-info">' +
        '<div class="saved-item-name">' + (item.name || 'Untitled') + '</div>' +
        '<div class="saved-item-meta">' + meta + '</div>' +
        '</div>' +
        '<button type="button" class="saved-item-delete" data-id="' + item.id + '" title="Delete">Delete</button>';
      div.querySelector('.saved-item-delete').addEventListener('click', function (e) {
        deleteDesignById(item.id, e);
      });
      div.addEventListener('click', function (e) {
        if (!e.target.classList.contains('saved-item-delete')) loadDesignById(item.id);
      });
      savedListEl.appendChild(div);
    });
  }

  function openSaveModal() {
    saveNameInput.value = '';
    saveModal.classList.remove('hidden');
    saveNameInput.focus();
  }

  function openLoadModal() {
    renderSavedList();
    loadModal.classList.remove('hidden');
  }

  /**
   * Maps a size label to the same integer the cart API expects (see CartComponent.sizeToEnum):
   * XS=0, S=1, M=2, L=3, XL=4, XXL=5. Not the factory product wizard enum (10 values).
   */
  function sizeLabelToEnumIndex(label) {
    var t = String(label || '')
      .trim()
      .toUpperCase()
      .replace(/^_+/, '')
      .replace(/\s+/g, '');
    var map = {
      '2XS': 0,
      XXS: 0,
      XS: 0,
      S: 1,
      M: 2,
      L: 3,
      XL: 4,
      '2XL': 5,
      XXL: 5,
      '3XL': 5,
      '4XL': 5,
      '5XL': 5,
      OSFA: 2,
      OS: 2,
      'ONE-SIZE': 2,
      ONESIZE: 2
    };
    return Object.prototype.hasOwnProperty.call(map, t) ? map[t] : -1;
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function getSizesForCurrentProduct() {
    var p = PRODUCTS[currentProduct];
    if (p && p.sizes && p.sizes.length) {
      return p.sizes;
    }
    if (STATIC_PRODUCT_DETAILS[currentProduct] && STATIC_PRODUCT_DETAILS[currentProduct].sizeRows) {
      return STATIC_PRODUCT_DETAILS[currentProduct].sizeRows;
    }
    return [];
  }

  function closeSizeQtyModal() {
    if (sizeQtyModal) sizeQtyModal.classList.add('hidden');
  }

  function openSizeQtyModal() {
    if (!sizeQtyModal || !sizeQtyRowsEl) return;
    var rows = getSizesForCurrentProduct();
    if (!rows.length) {
      alert('No sizes are available for this product yet.');
      return;
    }
    sizeQtyRowsEl.innerHTML = '';
    rows.forEach(function (row) {
      var label = row.label != null ? String(row.label) : '';
      var div = document.createElement('div');
      div.className = 'size-qty-row';
      var stepper = document.createElement('div');
      stepper.className = 'size-qty-stepper';
      stepper.setAttribute('data-size-label', label);
      var minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'size-qty-minus';
      minus.setAttribute('aria-label', 'Decrease');
      minus.textContent = '−';
      var inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'size-qty-input';
      inp.min = '0';
      inp.max = '99';
      inp.value = '0';
      var plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'size-qty-plus';
      plus.setAttribute('aria-label', 'Increase');
      plus.textContent = '+';
      minus.addEventListener('click', function () {
        var v = Math.max(0, (parseInt(inp.value, 10) || 0) - 1);
        inp.value = String(v);
      });
      plus.addEventListener('click', function () {
        var v = Math.min(99, (parseInt(inp.value, 10) || 0) + 1);
        inp.value = String(v);
      });
      inp.addEventListener('change', function () {
        var v = parseInt(inp.value, 10);
        if (!Number.isFinite(v) || v < 0) v = 0;
        if (v > 99) v = 99;
        inp.value = String(v);
      });
      stepper.appendChild(minus);
      stepper.appendChild(inp);
      stepper.appendChild(plus);
      var lab = document.createElement('span');
      lab.className = 'size-qty-label';
      lab.innerHTML = escapeHtml(label);
      div.appendChild(lab);
      div.appendChild(stepper);
      sizeQtyRowsEl.appendChild(div);
    });
    sizeQtyModal.classList.remove('hidden');
  }

  function confirmSizeQtyAddToCart() {
    var fnSave = window.__WEARCAST_SAVE_CUSTOMER_DESIGN__;
    var fnCart = window.__WEARCAST_ADD_DESIGNED_TO_CART__;
    if (typeof fnSave !== 'function' || typeof fnCart !== 'function') {
      alert('Please sign in as a customer to add your design to the cart.');
      closeSizeQtyModal();
      return;
    }
    var p = PRODUCTS[currentProduct];
    var cat = p && p.wearcastCatalog;
    if (!cat) {
      alert(
        'Add to cart works for factory catalog products. Open Products, pick a designed template, then try again.'
      );
      closeSizeQtyModal();
      return;
    }
    var colorId = cat.colorIdsBySlug && cat.colorIdsBySlug[currentColor];
    if (!colorId) {
      alert('Could not match this color to the catalog. Try another swatch.');
      return;
    }
    if (!sizeQtyRowsEl) return;
    var steppers = sizeQtyRowsEl.querySelectorAll('.size-qty-stepper');
    var lines = [];
    steppers.forEach(function (el) {
      var label = el.getAttribute('data-size-label') || '';
      var inp = el.querySelector('.size-qty-input');
      var qty = parseInt(inp && inp.value, 10) || 0;
      if (qty < 1) return;
      var sz = sizeLabelToEnumIndex(label);
      if (sz < 0) {
        console.warn('WearCast: unknown size label for cart enum', label);
        return;
      }
      lines.push({ size: sz, quantity: qty });
    });
    if (!lines.length) {
      alert('Choose at least one size with a quantity greater than zero.');
      return;
    }
    saveCurrentViewToStore();
    var vd = viewDesigns[currentProduct];
    if (sizeQtyModalConfirm) sizeQtyModalConfirm.disabled = true;
    fnSave({
      productId: cat.designedProductId,
      productColorId: colorId,
      viewDesignsJson: JSON.stringify(vd || {})
    })
      .then(function (designId) {
        if (designId == null || designId === undefined) {
          throw new Error(
            'The server did not return a design id after saving. Your API may omit `data.id` on POST /api/customers/me/designs — check the backend response.'
          );
        }
        var id = typeof designId === 'number' ? designId : parseInt(designId, 10);
        if (!Number.isFinite(id)) {
          throw new Error('Invalid design id from server.');
        }
        var cartPayload = lines.map(function (L) {
          return { designId: id, size: L.size, quantity: L.quantity };
        });
        return fnCart(cartPayload);
      })
      .then(function () {
        closeSizeQtyModal();
        alert('Added to cart. Open the cart to review your items.');
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : String(err);
        alert('Could not add to cart: ' + msg);
      })
      .finally(function () {
        if (sizeQtyModalConfirm) sizeQtyModalConfirm.disabled = false;
      });
  }

  function applyDesignerBootstrap() {
    var boot = window.__WEARCAST_DESIGNER_BOOTSTRAP__;
    // Always reset product registry so stale entries from previous runs/routes cannot leak.
    Object.keys(PRODUCTS).forEach(function (k) {
      delete PRODUCTS[k];
    });
    if (!boot || !boot.products) {
      window.__WEARCAST_DESIGNER_BOOTSTRAP__ = null;
      return;
    }
    Object.keys(boot.products).forEach(function (k) {
      PRODUCTS[k] = boot.products[k];
    });
    if (boot.colors && boot.colors.length) {
      boot.colors.forEach(function (c) {
        if (COLORS.indexOf(c) === -1) COLORS.push(c);
      });
    }
    window.__WEARCAST_DESIGNER_BOOTSTRAP__ = null;
  }

  function hasFactoryCatalogProducts() {
    return Object.keys(PRODUCTS).some(function (k) {
      return k.length > 0 && k.charAt(0) === 'p';
    });
  }

  function hashStringToColor(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
    var col = (h & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - col.length) + col;
  }

  function getProductListMount() {
    return document.getElementById('product-modal-list') || document.getElementById('product-list');
  }

  function closeProductsModal() {
    if (productsModal) productsModal.classList.add('hidden');
  }

  function openProductsModal() {
    rebuildProductListFromProducts();
    if (productsModal) productsModal.classList.remove('hidden');
  }

  function rebuildProductListFromProducts() {
    var pl = getProductListMount();
    if (!pl) return;
    pl.innerHTML = '';
    Object.keys(PRODUCTS).forEach(function (key) {
      var pr = PRODUCTS[key];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'product-card';
      btn.setAttribute('data-product', key);
      var img = document.createElement('img');
      var imgs = typeof pr.images === 'function' ? pr.images() : {};
      var firstCol = null;
      Object.keys(imgs).some(function (c) {
        var r = imgs[c];
        if (r && (r.front || r.back || r.right || r.left)) {
          firstCol = c;
          return true;
        }
        return false;
      });
      var src = firstCatalogImageUrl(imgs) || (firstCol && imgs[firstCol] ? imgs[firstCol].front : null) || 'assets/hoodie-front.jpg';
      img.src = src;
      img.alt = pr.title || key;
      var span = document.createElement('span');
      span.textContent = pr.title || key;
      btn.appendChild(img);
      btn.appendChild(span);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        try {
          setProduct(key);
        } catch (err) {
          console.error('WearCast setProduct failed:', err);
        } finally {
          closeProductsModal();
        }
      });
      pl.appendChild(btn);
    });
  }

  function rebuildColorSwatchesForProduct(productKey) {
    if (!colorSwatches || !PRODUCTS[productKey]) return;
    var p = PRODUCTS[productKey];
    var imgs = typeof p.images === 'function' ? p.images() : (p.images || {});
    var colorKeys = Object.keys(imgs).filter(function (c) {
      var r = imgs[c];
      return r && (r.front || r.back || r.right || r.left);
    });

    if (colorKeys.length === 0) {
      colorKeys = Object.keys(imgs);
    }
    if (colorKeys.length === 0) return;

    colorSwatches.innerHTML = '';
    var cat = p.wearcastCatalog;
    var hexMap = cat && cat.colorHexBySlug ? cat.colorHexBySlug : null;
    colorKeys.forEach(function (colorKey, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-swatch' + (idx === 0 ? ' active' : '');
      btn.setAttribute('data-color', colorKey);
      var hex = hexMap && hexMap[colorKey] ? hexMap[colorKey] : hashStringToColor(colorKey);
      btn.style.background = hex;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        setColor(colorKey);
      });
      colorSwatches.appendChild(btn);
    });
  }

  function run() {
    applyDesignerBootstrap();
    // Reset volatile state each run to avoid cross-navigation leftovers.
    currentProduct = '';
    currentColor = 'black';
    currentView = 'front';
    productImage = document.getElementById('product-image');
    productStage = document.getElementById('product-stage');
    productTitleEl = document.getElementById('product-title');
    productPriceEl = document.getElementById('product-price');
    uploadInput = document.getElementById('upload-input');
    textModal = document.getElementById('text-modal');
    textInput = document.getElementById('text-input');
    textCancel = document.getElementById('text-cancel');
    textAdd = document.getElementById('text-add');
    colorNameEl = document.getElementById('color-name');
    colorSwatches = document.getElementById('color-swatches');
    textOptionsPanel = document.getElementById('text-options-panel');
    textFontSelect = document.getElementById('text-font');
    textColorInput = document.getElementById('text-color');
    textColorHex = document.getElementById('text-color-hex');
    textBendSlider = document.getElementById('text-bend');
    textBendValue = document.getElementById('text-bend-value');
    saveModal = document.getElementById('save-modal');
    saveNameInput = document.getElementById('save-name-input');
    saveCancel = document.getElementById('save-cancel');
    saveConfirm = document.getElementById('save-confirm');
    loadModal = document.getElementById('load-modal');
    savedListEl = document.getElementById('saved-list');
    loadCloseBtn = document.getElementById('load-close');
    designsPanel = document.getElementById('designs-panel');
    designCategorySelect = document.getElementById('design-category-select');
    designSearchInput = document.getElementById('design-search');
    designTagsEl = document.getElementById('design-tags');
    designGridEl = document.getElementById('design-grid');
    productDetailsModal = document.getElementById('product-details-modal');
    productDetailsOpenBtn = document.getElementById('product-details-open');
    productDetailsCloseBtn = document.getElementById('product-details-close');
    productsModal = document.getElementById('products-modal');
    productsModalClose = document.getElementById('products-modal-close');
    sizeQtyModal = document.getElementById('size-qty-modal');
    sizeQtyRowsEl = document.getElementById('size-qty-rows');
    sizeQtyModalClose = document.getElementById('size-qty-modal-close');
    sizeQtyModalCancel = document.getElementById('size-qty-modal-cancel');
    sizeQtyModalConfirm = document.getElementById('size-qty-modal-confirm');

    if (!productImage || !uploadInput || !textInput || !saveModal || !saveConfirm || !savedListEl) {
      console.error('Required DOM elements missing for designer');
      return;
    }

    document.querySelectorAll('.tool-btn[data-tool="text"]').forEach(function (btn) {
      btn.addEventListener('click', openTextModal);
    });
    document.querySelectorAll('.tool-btn[data-tool="designs"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (designsPanel) designsPanel.classList.remove('hidden');
      });
    });
    document.querySelectorAll('.tool-btn[data-tool="products"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openProductsModal();
      });
    });
    document.querySelectorAll('.tool-btn[data-tool="upload"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (uploadInput) uploadInput.click();
      });
    });
    uploadInput.addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (file) {
        addImageFromFile(file);
        this.value = '';
      }
    });

    textCancel.addEventListener('click', closeTextModal);
    textAdd.addEventListener('click', function () {
      addText(textInput.value.trim());
      closeTextModal();
    });
    textInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        addText(textInput.value.trim());
        closeTextModal();
      }
      if (e.key === 'Escape') closeTextModal();
    });

    textFontSelect.addEventListener('change', function () {
      applyFontToSelection(this.value);
    });
    textColorInput.addEventListener('input', function () {
      var v = this.value;
      textColorHex.textContent = v;
      applyColorToSelection(v);
    });
    textBendSlider.addEventListener('input', function () {
      var v = parseInt(this.value, 10);
      textBendValue.textContent = v;
      applyBendToSelection(v);
    });

    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);

    var deleteBtn = document.getElementById('delete-selected-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', removeSelectedObject);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      removeSelectedObject();
    });

    colorSwatches.addEventListener('click', function (e) {
      var btn = e.target.closest('.color-swatch');
      if (btn) setColor(btn.getAttribute('data-color'));
    });

    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setView(this.getAttribute('data-view'));
      });
    });
    document.querySelectorAll('.product-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setProduct(this.getAttribute('data-product'));
      });
    });
    document.querySelectorAll('.tool-btn[data-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (this.dataset.tool === 'text' || this.dataset.tool === 'upload') return;
        document.querySelectorAll('.tool-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        if (designsPanel && this.dataset.tool !== 'designs') {
          designsPanel.classList.add('hidden');
        }
      });
    });

    document.getElementById('header-save-btn').addEventListener('click', openSaveModal);
    document.getElementById('header-load-btn').addEventListener('click', openLoadModal);

    saveCancel.addEventListener('click', function () { saveModal.classList.add('hidden'); });
    saveConfirm.addEventListener('click', function () {
      var name = saveNameInput.value.trim() || 'Untitled design';
      saveDesign(name);
    });
    loadCloseBtn.addEventListener('click', function () { loadModal.classList.add('hidden'); });

    if (productDetailsOpenBtn && productDetailsModal && productDetailsCloseBtn) {
      productDetailsOpenBtn.addEventListener('click', function () {
        populateProductDetailsModal();
        productDetailsModal.classList.remove('hidden');
      });
      productDetailsCloseBtn.addEventListener('click', function () {
        productDetailsModal.classList.add('hidden');
      });
      productDetailsModal.addEventListener('click', function (e) {
        if (e.target === productDetailsModal) productDetailsModal.classList.add('hidden');
      });
    }

    if (productsModalClose) {
      productsModalClose.addEventListener('click', closeProductsModal);
    }
    if (productsModal) {
      productsModal.addEventListener('click', function (e) {
        if (e.target === productsModal) closeProductsModal();
      });
    }

    document.querySelectorAll('.cta-btn').forEach(function (btn) {
      btn.addEventListener('click', openSizeQtyModal);
    });
    if (sizeQtyModalClose) {
      sizeQtyModalClose.addEventListener('click', closeSizeQtyModal);
    }
    if (sizeQtyModalCancel) {
      sizeQtyModalCancel.addEventListener('click', closeSizeQtyModal);
    }
    if (sizeQtyModalConfirm) {
      sizeQtyModalConfirm.addEventListener('click', confirmSizeQtyAddToCart);
    }
    if (sizeQtyModal) {
      sizeQtyModal.addEventListener('click', function (e) {
        if (e.target === sizeQtyModal) closeSizeQtyModal();
      });
    }

    if (designTagsEl && designGridEl) {
      renderStickerTags();
      renderStickerGrid();
    }
    if (designCategorySelect) {
      designCategorySelect.addEventListener('change', renderStickerGrid);
    }
    if (designSearchInput) {
      designSearchInput.addEventListener('input', renderStickerGrid);
    }

    rebuildProductListFromProducts();

    initCanvas();
    var firstProductKey = Object.keys(PRODUCTS)[0] || '';
    if (!firstProductKey) {
      if (productTitleEl) {
        productTitleEl.textContent = 'No factory products yet';
      }
      return;
    }
    setProduct(firstProductKey);
    if (hasFactoryCatalogProducts()) {
      rebuildColorSwatchesForProduct(firstProductKey);
    }
    var imgs0 = PRODUCTS[firstProductKey] && PRODUCTS[firstProductKey].images ? PRODUCTS[firstProductKey].images() : {};
    var firstColorKey = Object.keys(imgs0).find(function (c) {
      var r = imgs0[c];
      return r && (r.front || r.back || r.right || r.left);
    }) || COLORS[0] || 'black';
    setColor(firstColorKey);
    setView('front');
  }

  // Expose an explicit init function for Angular to call after the component view is ready
  if (typeof window !== 'undefined') {
    window.wearcastDesignerRun = run;
  }

})();

