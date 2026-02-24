(function () {
  'use strict';

  const STORAGE_KEY = 'wearcast_designs';
  const COLORS = ['purple', 'pink', 'lightpink', 'lightgray', 'black', 'darkgray', 'white', 'darkblue'];

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

  var PRODUCTS = {
    hoodie: {
      title: "Women's Hoodie",
      width: 400,
      height: 480,
      images: function () {
        var o = {};
        COLORS.forEach(function (color) {
          o[color] = {
            front: getProductImageUrl('hoodie', 'front'),
            back: getProductImageUrl('hoodie', 'back'),
            right: getProductImageUrl('hoodie', 'right'),
            left: getProductImageUrl('hoodie', 'left')
          };
        });
        return o;
      }
    },
    tshirt: {
      title: "Unisex T-Shirt",
      width: 400,
      height: 480,
      images: function () {
        var o = {};
        COLORS.forEach(function (color) {
          o[color] = {
            front: getProductImageUrl('tshirt', 'front'),
            back: getProductImageUrl('tshirt', 'back'),
            right: getProductImageUrl('tshirt', 'right'),
            left: getProductImageUrl('tshirt', 'left')
          };
        });
        return o;
      }
    },
    cap: {
      title: "Cap",
      width: 400,
      height: 400,
      images: function () {
        var o = {};
        COLORS.forEach(function (color) {
          o[color] = {
            front: getProductImageUrl('cap', 'front'),
            back: getProductImageUrl('cap', 'back'),
            right: getProductImageUrl('cap', 'right'),
            left: getProductImageUrl('cap', 'left')
          };
        });
        return o;
      }
    }
  };

  var productImage, productStage, productTitleEl, uploadInput, textModal, textInput, textCancel, textAdd;
  var colorNameEl, colorSwatches, textOptionsPanel, textFontSelect, textColorInput, textColorHex, textBendSlider, textBendValue;
  var saveModal, saveNameInput, saveCancel, saveConfirm, loadModal, savedListEl, loadCloseBtn;

  let canvas;
  let currentProduct = 'hoodie';
  let currentColor = 'black';
  let currentView = 'front';
  let undoStack = [];
  let redoStack = [];
  const MAX_UNDO = 50;
  var viewDesigns = {};
  var viewUndoStacks = {};
  var viewRedoStacks = {};
  var VIEW_KEYS = ['front', 'back', 'right', 'left'];

  function getStageDimensions() {
    const p = PRODUCTS[currentProduct];
    return { width: p.width, height: p.height };
  }

  function getProductImages() {
    const imgs = PRODUCTS[currentProduct].images;
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
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setProductImage() {
    var imgs = getProductImages();
    if (imgs && imgs[currentColor]) {
      var src = imgs[currentColor][currentView];
      if (src) {
        productImage.src = src;
      }
    }
  }

  function setProduct(productKey) {
    if (!PRODUCTS[productKey] || currentProduct === productKey) return;
    saveCurrentViewToStore();
    currentProduct = productKey;
    var p = PRODUCTS[currentProduct];
    productTitleEl.textContent = p.title;
    document.querySelectorAll('.product-card').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-product') === currentProduct);
    });
    resizeStageAndCanvas();
    loadViewFromStore(currentView);
    setProductImage();
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
    if (COLORS.indexOf(colorKey) === -1) return;
    currentColor = colorKey;
    if (colorNameEl) colorNameEl.textContent = colorKey;
    document.querySelectorAll('.color-swatch').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-color') === currentColor);
    });
    setProductImage();
  }

  function setDesignState(state) {
    currentProduct = state.productType || 'hoodie';
    currentColor = state.productColor || 'black';
    currentView = state.view || 'front';
    if (state.viewDesigns) {
      viewDesigns[currentProduct] = state.viewDesigns;
    } else if (state.canvasJson) {
      viewDesigns[currentProduct] = { front: state.canvasJson, back: null, right: null, left: null };
    }
    var p = PRODUCTS[currentProduct];
    productTitleEl.textContent = p.title;
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

  function saveDesignToList(name) {
    var list = getSavedDesigns();
    var id = 'id_' + Date.now();
    var state = getDesignState(false);
    var item = {
      id: id,
      name: name || 'Untitled design',
      createdAt: new Date().toISOString(),
      state: state
    };
    try {
      list.push(item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      saveModal.classList.add('hidden');
      alert('Design saved! Open "My saved designs" to see it.');
    } catch (err) {
      if (err && err.name === 'QuotaExceededError') {
        list.pop();
        state = getDesignState(true);
        item.state = state;
        list.push(item);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
          saveModal.classList.add('hidden');
          alert('Design saved with reduced image quality (to fit storage). Open "My saved designs" to see it.');
        } catch (err2) {
          list.pop();
          saveModal.classList.remove('hidden');
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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

  function run() {
    productImage = document.getElementById('product-image');
    productStage = document.getElementById('product-stage');
    productTitleEl = document.getElementById('product-title');
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

    if (!productImage || !uploadInput || !textInput || !saveModal || !saveConfirm || !savedListEl) {
      console.error('Required DOM elements missing for designer');
      return;
    }

    document.querySelectorAll('.tool-btn[data-tool="text"]').forEach(function (btn) {
      btn.addEventListener('click', openTextModal);
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
      });
    });

    document.getElementById('header-save-btn').addEventListener('click', openSaveModal);
    document.getElementById('header-load-btn').addEventListener('click', openLoadModal);

    saveCancel.addEventListener('click', function () { saveModal.classList.add('hidden'); });
    saveConfirm.addEventListener('click', function () {
      var name = saveNameInput.value.trim() || 'Untitled design';
      saveDesignToList(name);
    });
    loadCloseBtn.addEventListener('click', function () { loadModal.classList.add('hidden'); });

    initCanvas();
    setProduct('hoodie');
    setColor('black');
    setView('front');
  }

  // Expose an explicit init function for Angular to call after the component view is ready
  if (typeof window !== 'undefined') {
    window.wearcastDesignerRun = run;
  }

})();

