(function () {
  'use strict';

  const COLORS = ['purple', 'pink', 'lightpink', 'lightgray', 'black', 'darkgray', 'white', 'darkblue'];

  // Local design storage removed; all persistence goes through backend APIs.

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
  var textStrokeColorInput, textStrokeColorHex, textStrokeWidthSlider, textStrokeWidthValue, textShapeGrid, textAlignGrid, textContentInput;
  var saveModal, saveNameInput, saveCancel, saveConfirm, loadModal, savedListEl, loadCloseBtn;
  var productDetailsModal, productDetailsOpenBtn, productDetailsCloseBtn;
  var productsModal, productsModalClose;
  var sizeQtyModal, sizeQtyRowsEl, sizeQtyModalClose, sizeQtyModalCancel, sizeQtyModalConfirm;
  var designsPanel, designsBackdrop, designModalCloseBtn, designCategorySelect, designSearchInput, designTagsEl, designGridEl;

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
  var TEXT_SHAPE_BEND_MAP = {
    normal: 0,
    curve: 35,
    arch: 60,
    bridge: -30,
    valley: -60,
    pinch: 85,
    bulge: 50,
    perspective: 20,
    pointed: 75,
    downward: -35,
    upward: 35,
    cone: 95
  };

  /** Last fetch from GET /api/design-assets (client-side search filter). */
  var lastDesignAssetRows = [];

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
    var actionsPanel = document.getElementById('element-actions-panel');
    if (actionsPanel) actionsPanel.classList.remove('hidden');
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
    var actionsPanel = document.getElementById('element-actions-panel');
    if (actionsPanel) actionsPanel.classList.add('hidden');
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

  function duplicateSelectedObject() {
    if (!canvas) return;
    var active = canvas.getActiveObject();
    if (!active) return;
    active.clone(function(cloned) {
      cloned.set({
        left: (active.left || 0) + 20,
        top: (active.top || 0) + 20,
        evented: true,
        selectable: true
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      saveState();
    });
  }

  function flipHorizontal() {
    var obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set('scaleX', obj.scaleX === -1 ? 1 : -1);
    canvas.renderAll();
    saveState();
  }

  function flipVertical() {
    var obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set('scaleY', obj.scaleY === -1 ? 1 : -1);
    canvas.renderAll();
    saveState();
  }

  function bringForward() {
    var obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.bringForward(obj);
    canvas.renderAll();
    saveState();
  }

  function sendBackward() {
    var obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.sendBackward(obj);
    canvas.renderAll();
    saveState();
  }

  function bringToFront() {
    var obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.bringToFront(obj);
    canvas.renderAll();
    saveState();
  }

  function sendToBack() {
    var obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.sendToBack(obj);
    canvas.renderAll();
    saveState();
  }

  function isTextOrCurvedText(obj) {
    return (obj.type === 'i-text' || obj.type === 'text') || (obj.type === 'group' && obj.textSource);
  }

  function getTextOptionsFromObject(obj) {
    if (obj.type === 'i-text' || obj.type === 'text') {
      return {
        fontFamily: obj.fontFamily || 'Arial',
        fill: obj.fill || '#ffffff',
        bend: 0,
        stroke: obj.stroke || '#000000',
        strokeWidth: typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 0,
        textShape: 'normal',
        textAlign: obj.textAlign || 'left'
      };
    }
    if (obj.type === 'group' && obj.textSource) {
      const first = obj.item(0);
      return {
        fontFamily: first ? first.fontFamily : 'Arial',
        fill: first ? first.fill : '#ffffff',
        bend: typeof obj.textBend === 'number' ? obj.textBend : 0,
        stroke: first && first.stroke ? first.stroke : '#000000',
        strokeWidth: first && typeof first.strokeWidth === 'number' ? first.strokeWidth : 0,
        textShape: obj.textShape || 'curve',
        textAlign: obj.textAlign || 'center'
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
    if (textStrokeColorInput) textStrokeColorInput.value = opts.stroke || '#000000';
    if (textStrokeColorHex) textStrokeColorHex.textContent = opts.stroke || '#000000';
    if (textStrokeWidthSlider) textStrokeWidthSlider.value = String(opts.strokeWidth || 0);
    if (textStrokeWidthValue) textStrokeWidthValue.textContent = Number(opts.strokeWidth || 0).toFixed(1).replace(/\.0$/, '');
    setActiveShapeChip(opts.textShape || 'normal');
    setActiveAlignChip(opts.textAlign || 'left');
    textBendSlider.value = opts.bend;
    textBendValue.textContent = opts.bend;
    if (textContentInput) {
      if (obj.type === 'i-text' || obj.type === 'text') {
        textContentInput.value = obj.text || '';
      } else if (obj.type === 'group' && obj.textSource) {
        textContentInput.value = obj.textSource || '';
      }
    }
  }

  function getSelectedShapeName() {
    if (!textShapeGrid) return 'normal';
    var active = textShapeGrid.querySelector('.text-shape-chip.active');
    return active ? active.getAttribute('data-shape') || 'normal' : 'normal';
  }

  function setActiveShapeChip(shape) {
    if (!textShapeGrid) return;
    textShapeGrid.querySelectorAll('.text-shape-chip').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-shape') === shape);
    });
  }

  function getSelectedAlignName() {
    if (!textAlignGrid) return 'left';
    var active = textAlignGrid.querySelector('.text-align-chip.active');
    return active ? active.getAttribute('data-align') || 'left' : 'left';
  }

  function setActiveAlignChip(align) {
    if (!textAlignGrid) return;
    textAlignGrid.querySelectorAll('.text-align-chip').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-align') === align);
    });
  }

  function createCurvedTextGroup(str, options) {
    const fontFamily = options.fontFamily || 'Arial';
    const fontSize = options.fontSize || 28;
    const fill = options.fill || '#ffffff';
    const stroke = options.stroke || '#000000';
    const strokeWidth = typeof options.strokeWidth === 'number' ? options.strokeWidth : 0;
    const bend = options.bend || 0;
    const textAlign = options.textAlign || 'center';
    const textShape = options.textShape || 'curve';
    const chars = str.split('');
    if (chars.length === 0) return null;
    var absBend = Math.max(0, Math.min(100, Math.abs(bend)));
    var sign = bend >= 0 ? 1 : -1;
    var bendFactor = absBend / 100;
    var span = Math.max(130, chars.length * (fontSize * 0.55));
    var radius = Math.max(90, chars.length * (fontSize * 0.45));
    var totalAngle = (0.35 + bendFactor * 1.25) * Math.PI * sign;
    var startAngle = Math.PI / 2 + totalAngle / 2;
    var step = chars.length === 1 ? 0 : totalAngle / (chars.length - 1);
    const texts = [];
    for (let i = 0; i < chars.length; i++) {
      var ratio = chars.length === 1 ? 0.5 : i / (chars.length - 1);
      var centered = ratio - 0.5;
      var angle = startAngle - i * step;
      var x = centered * span;
      var y = 0;
      var rotation = 0;
      var scaleX = 1;
      var scaleY = 1;

      switch (textShape) {
        case 'curve':
          x = Math.cos(angle) * radius;
          y = -Math.sin(angle) * radius;
          rotation = (angle - Math.PI / 2) * 180 / Math.PI;
          break;
        case 'arch':
          x = Math.cos(angle) * radius;
          y = -Math.sin(angle) * radius;
          rotation = 0;
          break;
        case 'bridge':
          // Flat bottom, arched top
          scaleY = 1 + (0.25 - Math.pow(centered, 2)) * 3 * bendFactor;
          y = - (scaleY - 1) * fontSize / 2;
          break;
        case 'valley':
          // Flat top, dipped bottom
          scaleY = 1 + (0.25 - Math.pow(centered, 2)) * 3 * bendFactor;
          y = (scaleY - 1) * fontSize / 2;
          break;
        case 'pinch':
          // Pinched in middle
          scaleY = 1 - (0.25 - Math.pow(centered, 2)) * 2 * bendFactor;
          break;
        case 'bulge':
          // Bulged in middle
          scaleY = 1 + (0.25 - Math.pow(centered, 2)) * 3 * bendFactor;
          break;
        case 'perspective':
          // Big in middle, smaller at edges
          scaleX = 1 + (0.25 - Math.pow(centered, 2)) * 2.5 * bendFactor;
          scaleY = 1 + (0.25 - Math.pow(centered, 2)) * 2.5 * bendFactor;
          break;
        case 'pointed':
          // Triangle like shape
          scaleY = 1 + (0.5 - Math.abs(centered)) * 3 * bendFactor;
          break;
        case 'downward':
          // Slope down
          y = (centered + 0.5) * 60 * bendFactor;
          break;
        case 'upward':
          // Slope up
          y = -(centered + 0.5) * 60 * bendFactor;
          break;
        case 'cone':
          // Perspective effect: big to small
          scaleY = 1 - centered * 2 * bendFactor;
          break;
        default:
          break;
      }

      const txt = new fabric.Text(chars[i], {
        fontFamily: fontFamily,
        fontSize: fontSize,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        originX: 'center',
        originY: 'center',
        left: x,
        top: y,
        angle: rotation,
        scaleX: scaleX,
        scaleY: scaleY
      });
      texts.push(txt);
    }
    const group = new fabric.Group(texts, {
      originX: 'center',
      originY: 'center',
      left: options.left,
      top: options.top,
    });
    group.textSource = str;
    group.textBend = bend;
    group.textShape = textShape;
    group.textAlign = textAlign;
    group.fontFamily = fontFamily;
    group.fontSize = fontSize;
    group.fill = fill;
    group.stroke = stroke;
    group.strokeWidth = strokeWidth;
    return group;
  }

  function parseBend(value) {
    var n = parseInt(value, 10);
    if (!Number.isFinite(n)) return 0;
    return Math.max(-100, Math.min(100, n));
  }

  function shapeToBend(shape) {
    if (!shape || !Object.prototype.hasOwnProperty.call(TEXT_SHAPE_BEND_MAP, shape)) {
      return 0;
    }
    return TEXT_SHAPE_BEND_MAP[shape];
  }

  function convertGroupToIText(group, options) {
    if (!group || group.type !== 'group' || !group.textSource) return null;
    var txt = new fabric.IText(group.textSource || 'Your text', {
      left: group.left,
      top: group.top,
      originX: group.originX || 'center',
      originY: group.originY || 'center',
      fontFamily: options.fontFamily || group.fontFamily || 'Arial',
      fontSize: options.fontSize || group.fontSize || 28,
      fill: options.fill || group.fill || '#ffffff',
      stroke: options.stroke || group.stroke || '#000000',
      strokeWidth: typeof options.strokeWidth === 'number' ? options.strokeWidth : (group.strokeWidth || 0),
      textAlign: options.textAlign || group.textAlign || 'left'
    });
    return txt;
  }

  function applyBendToSelection(bend, shapeName) {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    var resolvedBend = parseBend(bend);
    var resolvedShape = shapeName || getSelectedShapeName();
    if (resolvedShape === 'normal') {
      if (obj.type === 'group' && obj.textSource) {
        var plain = convertGroupToIText(obj, {
          fontFamily: obj.fontFamily,
          fontSize: obj.fontSize,
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          textAlign: obj.textAlign || 'left'
        });
        if (plain) {
          canvas.remove(obj);
          canvas.add(plain);
          canvas.setActiveObject(plain);
          canvas.renderAll();
          saveState();
          syncTextOptionsFromObject(plain);
          setActiveShapeChip('normal');
        }
      } else if (obj.type === 'i-text' || obj.type === 'text') {
        syncTextOptionsFromObject(obj);
        setActiveShapeChip('normal');
      }
      return;
    }
    if (obj.type === 'i-text' || obj.type === 'text') {
      const str = obj.text;
      const left = obj.left + (obj.width * (obj.originX === 'center' ? 0.5 : 0));
      const top = obj.top + (obj.height * (obj.originY === 'center' ? 0.5 : 0));
      const group = createCurvedTextGroup(str, {
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 0,
        textAlign: obj.textAlign || 'center',
        bend: resolvedBend,
        textShape: resolvedShape,
        left: left,
        top: top
      });
      if (group) {
        canvas.remove(obj);
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.renderAll();
        saveState();
        setActiveShapeChip(resolvedShape);
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
        stroke: obj.stroke,
        strokeWidth: typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 0,
        textAlign: obj.textAlign || 'center',
        bend: resolvedBend,
        textShape: resolvedShape,
        left: left,
        top: top
      });
      if (group) {
        canvas.remove(obj);
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.renderAll();
        saveState();
        setActiveShapeChip(resolvedShape);
      }
    }
  }

  function applyFontToSelection(fontFamily) {
    const obj = canvas.getActiveObject();
    if (!obj) return;

    // Web fonts might take a moment to load and render in canvas.
    function updateFont(o) {
      o.set('fontFamily', fontFamily);
    }

    if (obj.type === 'i-text' || obj.type === 'text') {
      updateFont(obj);
    } else if (obj.type === 'group' && obj.textSource) {
      obj.fontFamily = fontFamily;
      obj.getObjects().forEach(updateFont);
    }
    canvas.renderAll();
    saveState();

    // Re-render after delays to ensure fonts that are being downloaded apply
    setTimeout(() => { canvas.renderAll(); }, 300);
    setTimeout(() => { canvas.renderAll(); }, 800);
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

  function applyStrokeToSelection(stroke, strokeWidth) {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    var width = Math.max(0, Math.min(4, Number(strokeWidth) || 0));
    if (obj.type === 'i-text' || obj.type === 'text') {
      obj.set('stroke', stroke);
      obj.set('strokeWidth', width);
      canvas.renderAll();
      saveState();
      return;
    }
    if (obj.type === 'group' && obj.textSource) {
      obj.stroke = stroke;
      obj.strokeWidth = width;
      obj.getObjects().forEach(function (o) {
        o.set('stroke', stroke);
        o.set('strokeWidth', width);
      });
      canvas.renderAll();
      saveState();
    }
  }

  function applyTextAlignToSelection(textAlign) {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    if (obj.type === 'i-text' || obj.type === 'text') {
      obj.set('textAlign', textAlign || 'left');
      canvas.renderAll();
      saveState();
      return;
    }
    if (obj.type === 'group' && obj.textSource) {
      obj.textAlign = textAlign || 'center';
      canvas.renderAll();
      saveState();
    }
  }

  function applyShapeToSelection(shapeName) {
    const shape = shapeName || 'normal';
    const bend = shapeToBend(shape);
    setActiveShapeChip(shape);
    if (textBendSlider) textBendSlider.value = String(bend);
    if (textBendValue) textBendValue.textContent = String(bend);
    applyBendToSelection(bend, shape);
  }

  if (textBendSlider) {
    textBendSlider.addEventListener('input', function () {
      if (textBendValue) textBendValue.textContent = this.value;
      applyBendToSelection(this.value);
    });
  }


  function saveState() {
    if (!canvas) return;
    var json = canvas.toJSON([
      'selectable',
      'evented',
      'textSource',
      'textBend',
      'textShape',
      'textAlign',
      'fontFamily',
      'fontSize',
      'fill',
      'stroke',
      'strokeWidth'
    ]);
    if (undoStack.length >= MAX_UNDO) undoStack.shift();
    undoStack.push(JSON.stringify(json));
    redoStack.length = 0;
    updateUndoRedoButtons();
  }

  function saveCurrentViewToStore() {
    if (!canvas) return;
    viewDesigns[currentProduct] = viewDesigns[currentProduct] || {};
    viewDesigns[currentProduct][currentView] = canvas.toJSON([
      'selectable',
      'evented',
      'textSource',
      'textBend',
      'textShape',
      'textAlign',
      'fontFamily',
      'fontSize',
      'fill',
      'stroke',
      'strokeWidth'
    ]);
    viewUndoStacks[currentProduct] = viewUndoStacks[currentProduct] || {};
    viewRedoStacks[currentProduct] = viewRedoStacks[currentProduct] || {};
    viewUndoStacks[currentProduct][currentView] = undoStack.slice();
    viewRedoStacks[currentProduct][currentView] = redoStack.slice();
  }

  /** @param {function(): void} [done] — called after Fabric has finished loading the view (or cleared). */
  function loadViewFromStore(view, done) {
    viewDesigns[currentProduct] = viewDesigns[currentProduct] || {};
    viewUndoStacks[currentProduct] = viewUndoStacks[currentProduct] || {};
    viewRedoStacks[currentProduct] = viewRedoStacks[currentProduct] || {};
    var data = viewDesigns[currentProduct][view];
    if (data) {
      canvas.loadFromJSON(data, function () {
        canvas.renderAll();
        if (typeof done === 'function') done();
      });
      undoStack = (viewUndoStacks[currentProduct][view] || []).slice();
      redoStack = (viewRedoStacks[currentProduct][view] || []).slice();
      if (undoStack.length === 0) saveState();
    } else {
      canvas.clear();
      undoStack = [];
      redoStack = [];
      saveState();
      if (typeof done === 'function') done();
    }
    updateUndoRedoButtons();
  }

  function addStickerFromUrl(url) {
    if (!canvas || !url) return;
    var dim = getStageDimensions();
    function mountSticker(img) {
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
      closeDesignsPanel();
    }

    // Try without crossOrigin first so production hosts that do not send
    // CORS headers can still render stickers in the editor.
    fabric.Image.fromURL(url, function (img) {
      if (img) {
        mountSticker(img);
        return;
      }
      // Fallback to anonymous CORS for hosts that allow it, which keeps
      // canvas export safer when possible.
      fabric.Image.fromURL(url, function (fallbackImg) {
        if (!fallbackImg) {
          return;
        }
        mountSticker(fallbackImg);
      }, { crossOrigin: 'anonymous' });
    });
  }

  function openDesignsPanel() {
    if (designsPanel) designsPanel.classList.remove('hidden');
    if (designsBackdrop) designsBackdrop.classList.remove('hidden');
  }

  function closeDesignsPanel() {
    if (designsPanel) designsPanel.classList.add('hidden');
    if (designsBackdrop) designsBackdrop.classList.add('hidden');
  }

  function renderStickerTags() {
    if (!designTagsEl) return;
    designTagsEl.innerHTML = '';
    designTagsEl.hidden = true;
  }

  function populateDesignCategorySelect(done) {
    if (!designCategorySelect) {
      if (typeof done === 'function') done();
      return;
    }
    var fn = window.__WEARCAST_LOAD_DESIGN_ASSET_CATEGORIES__;
    if (typeof fn !== 'function') {
      if (typeof done === 'function') done();
      return;
    }
    fn()
      .then(function (cats) {
        while (designCategorySelect.options.length > 1) {
          designCategorySelect.remove(1);
        }
        (cats || []).forEach(function (c) {
          if (!c || typeof c.id !== 'number') return;
          var opt = document.createElement('option');
          opt.value = String(c.id);
          opt.textContent = c.name || 'Category ' + c.id;
          designCategorySelect.appendChild(opt);
        });
      })
      .catch(function (e) {
        console.warn('[WearCast] design asset categories failed', e);
      })
      .finally(function () {
        if (typeof done === 'function') done();
      });
  }

  function renderStickerGridFromRows(rows, term) {
    if (!designGridEl) return;
    designGridEl.innerHTML = '';
    var t = (term || '').toLowerCase();
    rows.forEach(function (s) {
      if (!s || !s.imageUrl) return;
      if (t && String(s.name || '').toLowerCase().indexOf(t) === -1) return;
      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'design-tile';
      var thumb = document.createElement('div');
      thumb.className = 'design-tile-thumb';
      thumb.style.backgroundImage = 'url(' + s.imageUrl + ')';
      var name = document.createElement('div');
      name.className = 'design-tile-name';
      name.textContent = s.name || 'Design';
      tile.appendChild(thumb);
      tile.appendChild(name);
      tile.addEventListener('click', function () {
        addStickerFromUrl(s.imageUrl);
      });
      designGridEl.appendChild(tile);
    });
    if (!designGridEl.children.length) {
      designGridEl.innerHTML = '<p class="design-grid-empty">No designs match your search.</p>';
    }
  }

  function renderStickerGrid() {
    if (!designGridEl) return;
    var categoryVal = designCategorySelect ? designCategorySelect.value : 'all';
    var categoryId =
      categoryVal === 'all' ? null : parseInt(categoryVal, 10);
    if (categoryVal !== 'all' && !Number.isFinite(categoryId)) {
      categoryId = null;
    }
    var term = designSearchInput ? designSearchInput.value.trim() : '';
    designGridEl.innerHTML = '<p class="design-grid-loading">Loading designs…</p>';
    var fn = window.__WEARCAST_LOAD_DESIGN_ASSETS__;
    if (typeof fn !== 'function') {
      designGridEl.innerHTML =
        '<p class="design-grid-empty">Design library is unavailable. Refresh the page or sign in.</p>';
      return;
    }
    fn(categoryId, 1, 100)
      .then(function (rows) {
        lastDesignAssetRows = Array.isArray(rows) ? rows : [];
        renderStickerGridFromRows(lastDesignAssetRows, term);
      })
      .catch(function (err) {
        console.error('[WearCast] design assets load failed', err);
        designGridEl.innerHTML =
          '<p class="design-grid-empty">Could not load designs. Try again later.</p>';
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
    console.log('[WearCast] opening text modal');
    if (!textInput || !textModal) {
      console.warn('[WearCast] textInput or textModal missing');
      return;
    }
    textInput.value = 'Your text';
    textModal.classList.remove('hidden');
    textInput.focus();
  }

  function closeTextModal() {
    textModal.classList.add('hidden');
  }

  function addText(str) {
    console.log('[WearCast] addText called with:', str);
    if (!canvas) {
      console.error('[WearCast] canvas not initialized');
      return;
    }
    const dim = getStageDimensions();
    const text = new fabric.IText(str || 'Your text', {
      left: dim.width / 2 - 60,
      top: dim.height / 2 - 20,
      fontFamily: textFontSelect.value || 'Arial',
      fontSize: 28,
      fill: textColorInput.value || '#ffffff',
      stroke: (textStrokeColorInput && textStrokeColorInput.value) || '#000000',
      strokeWidth: parseInt((textStrokeWidthSlider && textStrokeWidthSlider.value) || '0', 10) || 0,
      textAlign: getSelectedAlignName(),
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

  function slugFromColorId(cat, colorId) {
    if (!cat || !cat.colorIdsBySlug || colorId == null) return null;
    var map = cat.colorIdsBySlug;
    for (var slug in map) {
      if (Object.prototype.hasOwnProperty.call(map, slug) && map[slug] === colorId) {
        return slug;
      }
    }
    return null;
  }

  /** Apply GET /api/customers/me/designs/{id} payload onto the live editor. */
  function applyLoadedDesignDto(dto) {
    if (!dto || typeof dto !== 'object') return;
    var pid = dto.productId != null ? dto.productId : dto.ProductId;
    if (pid == null) {
      pid = dto.designedProductId != null ? dto.designedProductId : dto.DesignedProductId;
    }
    var productKey = pid != null ? 'p' + pid : null;
    if (productKey) {
      if (!PRODUCTS[productKey]) {
        alert(
          'This design belongs to a product that is not loaded. Add ?designedProductIds=' +
            pid +
            ' to the URL and reload, or pick that product from the catalog.'
        );
        return;
      }
      if (currentProduct !== productKey) {
        setProduct(productKey);
      }
    }
    var cat = PRODUCTS[currentProduct] && PRODUCTS[currentProduct].wearcastCatalog;
    var colorId = dto.productColorId != null ? dto.productColorId : dto.ProductColorId;
    if (colorId != null && cat) {
      var slug = slugFromColorId(cat, colorId);
      if (slug) setColor(slug);
    }
    var jsonStr = dto.viewDesignsJson != null ? dto.viewDesignsJson : dto.ViewDesignsJson;
    if (typeof jsonStr === 'string' && jsonStr.trim()) {
      try {
        var parsed = JSON.parse(jsonStr);
        viewDesigns[currentProduct] = parsed;
      } catch (e) {
        console.warn('[WearCast] invalid viewDesignsJson', e);
        alert('Could not read saved design data.');
        return;
      }
    }
    currentView = 'front';
    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === 'front');
    });
    setProductImage();
    loadViewFromStore('front');
    resizeStageAndCanvas();
    if (canvas) canvas.renderAll();
    undoStack =
      viewUndoStacks[currentProduct] && viewUndoStacks[currentProduct][currentView]
        ? viewUndoStacks[currentProduct][currentView].slice()
        : [];
    redoStack =
      viewRedoStacks[currentProduct] && viewRedoStacks[currentProduct][currentView]
        ? viewRedoStacks[currentProduct][currentView].slice()
        : [];
    if (undoStack.length === 0 && canvas) saveState();
    updateUndoRedoButtons();
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
    if (typeof window.wearcastOnProductChanged === 'function' && p && p.wearcastCatalog) {
      window.wearcastOnProductChanged(p.wearcastCatalog.designedProductId);
    }
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
   * Count Fabric.js `image` objects across front/back/left/right (customer-uploaded assets).
   */
  function countFabricImageAssets(viewDesignsObj) {
    var sides = ['front', 'back', 'left', 'right'];
    var n = 0;
    if (!viewDesignsObj || typeof viewDesignsObj !== 'object') {
      return 0;
    }
    for (var i = 0; i < sides.length; i++) {
      var doc = viewDesignsObj[sides[i]];
      if (!doc || !doc.objects || !Array.isArray(doc.objects)) {
        continue;
      }
      for (var j = 0; j < doc.objects.length; j++) {
        var o = doc.objects[j];
        if (o && o.type === 'image') {
          n++;
        }
      }
    }
    return n;
  }

  /**
   * Factory catalog templates: POST design to API when logged in.
   * Built-in templates (hoodie/tshirt/cap) cannot be saved (server-only).
   * Generates 4-view composite images (product bg + design overlay) before saving.
   */
  function saveDesign(name) {
    var p = PRODUCTS[currentProduct];
    var cat = p && p.wearcastCatalog;
    var fn = window.__WEARCAST_SAVE_CUSTOMER_DESIGN__;
    if (cat && typeof fn === 'function') {
      var colorId = cat.colorIdsBySlug && cat.colorIdsBySlug[currentColor];
      if (!colorId) {
        alert('Could not match this color to the catalog. Pick another swatch or reload the design page.');
        return;
      }
      if (saveConfirm) saveConfirm.disabled = true;
      // Generate 4-view composite images first, then POST to server
      generateAllViewImages(function(viewImages) {
        var vd = viewDesigns[currentProduct];
        var designName = (name && String(name).trim()) || 'Untitled design';
        var payload = {
          name: designName,
          assetCount: countFabricImageAssets(vd || {}),
          productId: cat.designedProductId,
          productColorId: colorId,
          viewDesignsJson: JSON.stringify(vd || {}),
          frontImage: viewImages.front,
          backImage: viewImages.back,
          leftImage: viewImages.left,
          rightImage: viewImages.right
        };
        console.log('[WearCast] saveDesign payload:', payload);
        fn(payload).then(function (designId) {
          console.log('[WearCast] saveDesign success, designId:', designId);
          if (saveModal) saveModal.classList.add('hidden');
          alert('Design saved to your WearCast account.');
        }).catch(function (err) {
          var msg = (err && err.message) ? err.message : String(err);
          console.error('[WearCast] saveDesign error:', err);
          alert('Could not save to the server: ' + msg);
        }).finally(function () {
          if (saveConfirm) saveConfirm.disabled = false;
        });
      });
      return;
    }
    alert('Saving built-in templates locally is disabled. Please use a catalog product to save via the server.');
  }


  function saveDesignToList(name, opts) {
    opts = opts || {};
    // Local saves disabled; all designs must be persisted via the backend API.
    if (!opts.silent) {
      alert('Design saved! Open "My saved designs" to see it.');
    }
  }

  function loadDesignById(id) {
    var fn = window.__WEARCAST_GET_CUSTOMER_DESIGN__;
    if (typeof fn !== 'function') {
      alert('Sign in as a customer to load saved designs.');
      return;
    }
    fn(id)
      .then(function (dto) {
        if (!dto) {
          alert('Could not load that design.');
          return;
        }
        applyLoadedDesignDto(dto);
        if (loadModal) loadModal.classList.add('hidden');
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : String(err);
        alert('Could not load design: ' + msg);
      });
  }

  function deleteDesignById(id, e) {
    e.stopPropagation();
    var fnDel = window.__WEARCAST_DELETE_CUSTOMER_DESIGN__;
    if (typeof fnDel !== 'function') {
      renderSavedList();
      return;
    }
    fnDel(id)
      .then(function () {
        renderSavedList();
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : String(err);
        alert('Could not delete: ' + msg);
      });
  }

  function renderSavedListFromArray(list) {
    if (!savedListEl) return;
    savedListEl.innerHTML = '';
    if (!list.length) {
      savedListEl.innerHTML =
        '<p class="saved-empty">No saved designs yet. Save your current design to see it here.</p>';
      return;
    }
    list.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'saved-item';
      if (item.previewUrl) {
        var wrap = document.createElement('div');
        wrap.className = 'saved-item-thumb-wrap';
        var im = document.createElement('img');
        im.className = 'saved-item-thumb';
        im.alt = '';
        im.src = item.previewUrl;
        wrap.appendChild(im);
        div.appendChild(wrap);
      }
      var date = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
      var info = document.createElement('div');
      info.className = 'saved-item-info';
      var nameEl = document.createElement('div');
      nameEl.className = 'saved-item-name';
      nameEl.textContent = item.name || 'Untitled';
      var metaEl = document.createElement('div');
      metaEl.className = 'saved-item-meta';
      metaEl.textContent = date;
      info.appendChild(nameEl);
      info.appendChild(metaEl);
      div.appendChild(info);
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'saved-item-delete';
      del.setAttribute('data-id', String(item.id));
      del.title = 'Delete';
      del.textContent = 'Delete';
      del.addEventListener('click', function (ev) {
        deleteDesignById(item.id, ev);
      });
      div.appendChild(del);
      div.addEventListener('click', function (e) {
        if (e.target.closest('.saved-item-delete')) return;
        loadDesignById(item.id);
      });
      savedListEl.appendChild(div);
    });
  }

  function renderSavedList() {
    if (!savedListEl) return;
    savedListEl.innerHTML = '<p class="saved-empty">Loading…</p>';
    var fnList = window.__WEARCAST_LIST_CUSTOMER_DESIGNS__;
    if (typeof fnList !== 'function') {
      savedListEl.innerHTML =
        '<p class="saved-empty">Sign in as a customer to see saved designs.</p>';
      return;
    }
    fnList()
      .then(function (list) {
        renderSavedListFromArray(Array.isArray(list) ? list : []);
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : String(err);
        savedListEl.innerHTML = '';
        var p = document.createElement('p');
        p.className = 'saved-empty';
        p.textContent = 'Could not load designs: ' + msg;
        savedListEl.appendChild(p);
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
      '2XS': 11,
      XXS: 11,
      XS: 12,
      S: 13,
      M: 14,
      L: 15,
      XL: 16,
      '2XL': 17,
      XXL: 17,
      '3XL': 18,
      '4XL': 19,
      '5XL': 20,
      OSFA: 14,
      OS: 14,
      'ONE-SIZE': 14,
      ONESIZE: 14
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

  /**
   * Compress a data URL (PNG) down to a smaller JPEG to reduce upload size.
   * maxDim: max width/height in pixels. quality: 0..1 for JPEG encoder.
   */
  function compressDataURL(dataUrl, maxDim, quality, cb) {
    if (!dataUrl) { cb(null); return; }
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        var ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.floor(w * ratio);
        h = Math.floor(h * ratio);
      }
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      cb(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = function() { cb(dataUrl); };
    img.src = dataUrl;
  }

  /**
   * Pixel snapshot of what the user sees: #product-image + Fabric canvases (same dimensions).
   */
  function compositeStageToDataURL(cb) {
    if (!canvas) {
      cb(null);
      return;
    }
    var w = canvas.getWidth();
    var h = canvas.getHeight();
    var out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    var ctx = out.getContext('2d');
    if (productImage && productImage.complete && productImage.naturalWidth > 0) {
      try {
        ctx.drawImage(productImage, 0, 0, w, h);
      } catch (drawErr) {
        console.warn('WearCast: product image draw skipped', drawErr);
      }
    }
    var lower = canvas.lowerCanvasEl;
    if (lower) {
      try {
        ctx.drawImage(lower, 0, 0, w, h);
      } catch (e1) {
        console.warn('WearCast: fabric lower canvas draw failed', e1);
      }
    }
    var upper = canvas.upperCanvasEl;
    if (upper && upper.width) {
      try {
        ctx.drawImage(upper, 0, 0, w, h);
      } catch (e2) {
        console.warn('WearCast: fabric upper canvas draw failed', e2);
      }
    }
    var raw = null;
    try {
      raw = out.toDataURL('image/png');
    } catch (e3) {
      console.warn('WearCast: toDataURL failed', e3);
    }
    compressDataURL(raw, 1200, 0.85, function (compressed) {
      cb(compressed || raw);
    });
  }

  /**
   * Generates composite images for all 4 views by briefly switching the live stage
   * (garment photo + Fabric overlay) per side. Matches the editor pixel-for-pixel and
   * waits for Fabric JSON + product image loads before exporting.
   */
  function generateAllViewImages(callback) {
    if (!canvas) {
      callback({ front: null, back: null, left: null, right: null });
      return;
    }
    saveCurrentViewToStore();
    var savedView = currentView;
    var views = ['front', 'back', 'left', 'right'];
    var results = { front: null, back: null, left: null, right: null };
    var idx = 0;

    function restoreAndFinish() {
      currentView = savedView;
      document.querySelectorAll('.view-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-view') === currentView);
      });
      setProductImage();
      loadViewFromStore(savedView, function () {
        setProductImage();
        if (canvas) canvas.renderAll();
        callback(results);
      });
    }

    function waitProductImageThen(fn) {
      if (!productImage || !productImage.src) {
        setTimeout(fn, 0);
        return;
      }
      if (productImage.complete && productImage.naturalWidth > 0) {
        setTimeout(fn, 0);
        return;
      }
      productImage.onload = function () {
        productImage.onload = null;
        productImage.onerror = null;
        fn();
      };
      productImage.onerror = function () {
        productImage.onload = null;
        productImage.onerror = null;
        fn();
      };
    }

    function processNextView() {
      if (idx >= views.length) {
        restoreAndFinish();
        return;
      }
      var view = views[idx];
      currentView = view;
      document.querySelectorAll('.view-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-view') === currentView);
      });
      setProductImage();
      loadViewFromStore(view, function () {
        waitProductImageThen(function () {
          if (canvas) {
            canvas.discardActiveObject();
            canvas.renderAll();
          }
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              compositeStageToDataURL(function (dataUrl) {
                results[view] = dataUrl;
                idx++;
                processNextView();
              });
            });
          });
        });
      });
    }

    processNextView();
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
    if (sizeQtyModalConfirm) sizeQtyModalConfirm.disabled = true;

    // Generate composites once, save the design once, then add every size line with the same designId.
    generateAllViewImages(function(viewImages) {
      var vd = viewDesigns[currentProduct];
      var title = (p && p.title) ? String(p.title) : 'Design';
      var cartName = title + ' · cart · ' + new Date().toISOString().slice(0, 16).replace('T', ' ');
      var ac = countFabricImageAssets(vd || {});
      console.log('[WearCast] addToCart viewImages generated:', Object.keys(viewImages).map(function(k) { return k + ':' + (viewImages[k] ? viewImages[k].length + ' chars' : 'null'); }));
      var payload = {
        name: cartName,
        assetCount: ac,
        productId: cat.designedProductId,
        productColorId: colorId,
        viewDesignsJson: JSON.stringify(vd || {}),
        frontImage: viewImages.front,
        backImage: viewImages.back,
        leftImage: viewImages.left,
        rightImage: viewImages.right
      };
      fnSave(payload)
        .then(function (designId) {
          if (designId == null || designId === undefined) {
            throw new Error('The server did not return a design id.');
          }
          var id = typeof designId === 'number' ? designId : parseInt(designId, 10);
          if (!Number.isFinite(id)) {
            throw new Error('Invalid design id from server.');
          }
          var cartLines = lines.map(function (L) {
            return { designId: id, size: L.size, quantity: L.quantity };
          });
          console.log('[WearCast] addToCart single save designId', id, 'lines', cartLines.length);
          return fnCart(cartLines);
        })
        .then(function () {
          closeSizeQtyModal();
          alert('Added to cart. Open the cart to review your items.');
        })
        .catch(function (err) {
          var msg = err && err.message ? err.message : String(err);
          console.error('[WearCast] addToCart error:', err);
          alert('Could not add to cart: ' + msg);
        })
        .finally(function () {
          if (sizeQtyModalConfirm) sizeQtyModalConfirm.disabled = false;
        });
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
      var imgs = typeof pr.images === 'function' ? pr.images() : (pr.images || {});
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
    textStrokeColorInput = document.getElementById('text-stroke-color');
    textStrokeColorHex = document.getElementById('text-stroke-color-hex');
    textStrokeWidthSlider = document.getElementById('text-stroke-width');
    textStrokeWidthValue = document.getElementById('text-stroke-width-value');
    textShapeGrid = document.getElementById('text-shape-grid');
    textAlignGrid = document.getElementById('text-align-grid');
    textBendSlider = document.getElementById('text-bend');
    textBendValue = document.getElementById('text-bend-value');
    textContentInput = document.getElementById('text-content-input');
    saveModal = document.getElementById('save-modal');
    saveNameInput = document.getElementById('save-name-input');
    saveCancel = document.getElementById('save-cancel');
    saveConfirm = document.getElementById('save-confirm');
    loadModal = document.getElementById('load-modal');
    savedListEl = document.getElementById('saved-list');
    loadCloseBtn = document.getElementById('load-close');
    designsPanel = document.getElementById('designs-panel');
    designsBackdrop = document.getElementById('designs-backdrop');
    designModalCloseBtn = document.getElementById('designs-modal-close');
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
      console.error('Required DOM elements missing for designer', {
        productImage: !!productImage,
        uploadInput: !!uploadInput,
        textInput: !!textInput,
        saveModal: !!saveModal,
        saveConfirm: !!saveConfirm,
        savedListEl: !!savedListEl
      });
      return;
    }

    document.querySelectorAll('.tool-btn[data-tool="text"]').forEach(function (btn) {
      btn.addEventListener('click', openTextModal);
    });
    document.querySelectorAll('.tool-btn[data-tool="designs"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openDesignsPanel();
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
    if (textStrokeColorInput) {
      textStrokeColorInput.addEventListener('input', function () {
        var v = this.value;
        if (textStrokeColorHex) textStrokeColorHex.textContent = v;
        var width = parseFloat((textStrokeWidthSlider && textStrokeWidthSlider.value) || '0') || 0;
        applyStrokeToSelection(v, width);
      });
    }
    if (textStrokeWidthSlider) {
      textStrokeWidthSlider.addEventListener('input', function () {
        var width = parseFloat(this.value) || 0;
        if (textStrokeWidthValue) textStrokeWidthValue.textContent = width.toFixed(1).replace(/\.0$/, '');
        var stroke = (textStrokeColorInput && textStrokeColorInput.value) || '#000000';
        applyStrokeToSelection(stroke, width);
      });
    }
    if (textShapeGrid) {
      textShapeGrid.addEventListener('click', function (e) {
        var btn = e.target.closest('.text-shape-chip');
        if (!btn) return;
        applyShapeToSelection(btn.getAttribute('data-shape') || 'normal');
      });
    }
    if (textAlignGrid) {
      textAlignGrid.addEventListener('click', function (e) {
        var btn = e.target.closest('.text-align-chip');
        if (btn) {
          var align = btn.getAttribute('data-align');
          applyTextAlignToSelection(align);
          setActiveAlignChip(align);
        }
      });
    }
    textBendSlider.addEventListener('input', function () {
      var v = parseInt(this.value, 10);
      textBendValue.textContent = v;
      applyBendToSelection(v, getSelectedShapeName());
    });

    if (textContentInput) {
      textContentInput.addEventListener('input', function () {
        const obj = canvas.getActiveObject();
        if (!obj) return;
        const newText = this.value || ' ';

        if (obj.type === 'i-text' || obj.type === 'text') {
          obj.set('text', newText);
          canvas.renderAll();
          saveState();
        } else if (obj.type === 'group' && obj.textSource) {
          const left = obj.left;
          const top = obj.top;
          const group = createCurvedTextGroup(newText, {
            fontFamily: obj.fontFamily,
            fontSize: obj.fontSize,
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 0,
            textAlign: obj.textAlign || 'center',
            bend: obj.textBend,
            textShape: obj.textShape || 'curve',
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
      });
    }

    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);

    var deleteBtn = document.getElementById('delete-selected-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', removeSelectedObject);

    var dupBtn = document.getElementById('duplicate-btn');
    if (dupBtn) dupBtn.addEventListener('click', duplicateSelectedObject);
    var flipHBtn = document.getElementById('flip-h-btn');
    if (flipHBtn) flipHBtn.addEventListener('click', flipHorizontal);
    var flipVBtn = document.getElementById('flip-v-btn');
    if (flipVBtn) flipVBtn.addEventListener('click', flipVertical);
    var bringFrontBtn = document.getElementById('bring-front-btn');
    if (bringFrontBtn) bringFrontBtn.addEventListener('click', bringToFront);
    var sendBackBtn = document.getElementById('send-back-btn');
    if (sendBackBtn) sendBackBtn.addEventListener('click', sendToBack);
    var bringFwdBtn = document.getElementById('bring-forward-btn');
    if (bringFwdBtn) bringFwdBtn.addEventListener('click', bringForward);
    var sendBwdBtn = document.getElementById('send-backward-btn');
    if (sendBwdBtn) sendBwdBtn.addEventListener('click', sendBackward);

    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
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
          closeDesignsPanel();
        }
      });
    });

    if (designModalCloseBtn) {
      designModalCloseBtn.addEventListener('click', closeDesignsPanel);
    }
    if (designsBackdrop) {
      designsBackdrop.addEventListener('click', closeDesignsPanel);
    }

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
      populateDesignCategorySelect(function () {
        renderStickerTags();
        renderStickerGrid();
      });
      if (designCategorySelect) {
        designCategorySelect.addEventListener('change', function () {
          lastDesignAssetRows = [];
          renderStickerGrid();
        });
      }
      if (designSearchInput) {
        designSearchInput.addEventListener('input', function () {
          var q = designSearchInput.value.trim();
          if (lastDesignAssetRows.length) {
            renderStickerGridFromRows(lastDesignAssetRows, q);
          } else {
            renderStickerGrid();
          }
        });
      }
    }

    rebuildProductListFromProducts();

    initCanvas();
    var firstProductKey = Object.keys(PRODUCTS)[0] || '';
    if (!firstProductKey) {
      PRODUCTS['default-hoodie'] = {
        title: 'Classic Hoodie',
        description: 'A comfortable classic hoodie perfect for custom designs.',
        price: 0,
        images: function () {
          return {
            black: {
              front: 'assets/hoodie-front.jpg',
              back: 'assets/hoodie-back.jpg',
              left: 'assets/hoodie-left.JPG',
              right: 'assets/hoodie-right.jpg'
            }
          };
        },
        sizes: [
          { label: 'XS' },
          { label: 'S' },
          { label: 'M' },
          { label: 'L' },
          { label: 'XL' },
          { label: '2XL' }
        ]
      };
      firstProductKey = 'default-hoodie';
      rebuildProductListFromProducts();
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
    window.wearcastSetProduct = setProduct;
    window.wearcastOpenProductsModal = openProductsModal;
    window.wearcastCloseProductsModal = closeProductsModal;
    window.wearcastGetProducts = function () { return PRODUCTS; };
    window.wearcastLoadDesignById = loadDesignById;
    window.wearcastDuplicateSelected = duplicateSelectedObject;
    window.wearcastFlipHorizontal = flipHorizontal;
    window.wearcastFlipVertical = flipVertical;
    window.wearcastBringForward = bringForward;
    window.wearcastSendBackward = sendBackward;
    window.wearcastBringToFront = bringToFront;
    window.wearcastSendToBack = sendToBack;
  }

})();

