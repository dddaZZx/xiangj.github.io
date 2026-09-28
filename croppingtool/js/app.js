(function () {
  'use strict';

  // === DOM References ===
  const $ = (id) => document.getElementById(id);

  const fileInput = $('fileInput');
  const importView = $('importView');
  const loadingOverlay = $('loadingOverlay');
  const loadingText = $('loadingText');
  const sizeModal = $('sizeModal');
  const modalBackdrop = $('modalBackdrop');
  const imageCountText = $('imageCountText');
  const warningBox = $('warningBox');
  const warningList = $('warningList');
  const thumbnailGrid = $('thumbnailGrid');
  const sizeOptions = document.querySelectorAll('.size-option');
  const customSizeArea = $('customSizeArea');
  const customWidthInput = $('customWidth');
  const customHeightInput = $('customHeight');
  const customSizeError = $('customSizeError');
  const customSizeHint = $('customSizeHint');
  const forceSquareArea = $('forceSquareArea');
  const forceSquareCheck = $('forceSquareCheck');
  const forceSquareOutput = $('forceSquareOutput');
  const confirmSizeBtn = $('confirmSizeBtn');
  const backBtn = $('backBtn');
  const processingView = $('processingView');
  const processingMainText = $('processingMainText');
  const processingSizeText = $('processingSizeText');
  const progressFill = $('progressFill');
  const resultView = $('resultView');
  const resultCountText = $('resultCountText');
  const resultThumbnails = $('resultThumbnails');
  const resultDimensions = $('resultDimensions');
  const resultMode = $('resultMode');
  const exportBtn = $('exportBtn');
  const newImageBtn = $('newImageBtn');

  // Offscreen canvases
  const drawCanvas = document.createElement('canvas');
  const drawCtx = drawCanvas.getContext('2d');
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  // === Constants ===
  const LIMITS = {
    maxCount: 50,
    maxSingleSize: 50 * 1024 * 1024,
    maxTotalSize: 300 * 1024 * 1024,
    maxDimension: 2048
  };
  const MIN_PROCESSING_TIME = 500;
  const VALID_TYPES = ['image/png', 'image/bmp', 'image/jpeg'];

  // === State ===
  let uploadedImages = [];
  let userWidth = null;
  let userHeight = null;
  let outWidth = null;
  let outHeight = null;
  let isCustomSize = false;
  let forceSquare = true;
  let processedBlobs = [];
  let processedFilenames = [];

  // === Utilities ===
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function showLoading(text) {
    loadingText.textContent = text;
    loadingOverlay.classList.add('active');
  }

  function hideLoading() {
    loadingOverlay.classList.remove('active');
  }

  function computeOutputDims() {
    if (!userWidth || !userHeight) {
      outWidth = outHeight = null;
      return;
    }
    if (forceSquare && userWidth !== userHeight) {
      const side = Math.max(userWidth, userHeight);
      outWidth = outHeight = side;
    } else {
      outWidth = userWidth;
      outHeight = userHeight;
    }
  }

  // === File Handling ===
  fileInput.addEventListener('change', handleFileSelect);

  document.querySelector('.import-btn').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    showLoading(`Loading ${files.length} image${files.length > 1 ? 's' : ''}...`);

    const warnings = [];

    const typeFiltered = files.filter(f => {
      if (!VALID_TYPES.includes(f.type)) {
        warnings.push(`"${f.name}" is not a supported format`);
        return false;
      }
      return true;
    });

    const sizeFiltered = [];
    typeFiltered.forEach(f => {
      if (f.size > LIMITS.maxSingleSize) {
        warnings.push(`"${f.name}" exceeds ${formatSize(LIMITS.maxSingleSize)} limit (${formatSize(f.size)})`);
      } else {
        sizeFiltered.push(f);
      }
    });

    let totalSize = 0;
    const finalFiles = [];
    for (const f of sizeFiltered) {
      if (finalFiles.length >= LIMITS.maxCount) {
        warnings.push(`Maximum ${LIMITS.maxCount} images allowed, remaining files skipped`);
        break;
      }
      if (totalSize + f.size > LIMITS.maxTotalSize) {
        warnings.push(`Total size exceeds ${formatSize(LIMITS.maxTotalSize)} limit, remaining files skipped`);
        break;
      }
      totalSize += f.size;
      finalFiles.push(f);
    }

    if (!finalFiles.length) {
      hideLoading();
      showSizeModal([], warnings);
      return;
    }

    uploadedImages = [];
    let loadedCount = 0;
    let errorCount = 0;

    await Promise.all(finalFiles.map((file, index) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          uploadedImages[index] = {
            img,
            filename: file.name.replace(/\.[^/.]+$/, ''),
            dataUrl: evt.target.result,
            size: file.size
          };
          loadedCount++;
          loadingText.textContent = `Loading images... (${loadedCount}/${finalFiles.length})`;
          resolve();
        };
        img.onerror = () => { errorCount++; resolve(); };
        img.src = evt.target.result;
      };
      reader.onerror = () => { errorCount++; resolve(); };
      reader.readAsDataURL(file);
    })));

    hideLoading();
    if (errorCount > 0) warnings.push(`${errorCount} image(s) failed to load`);
    showSizeModal(uploadedImages.filter(Boolean), warnings);
  }

  // === Size Modal ===
  function showSizeModal(images, warnings) {
    if (warnings.length) {
      warningBox.style.display = 'block';
      warningList.innerHTML = warnings.map(w => `<li>${w}</li>`).join('');
    } else {
      warningBox.style.display = 'none';
    }

    const count = images.length;
    if (!count) {
      imageCountText.textContent = 'No valid images selected';
      thumbnailGrid.innerHTML = '<p style="color: var(--muted); padding: 20px; text-align: center; grid-column: 1/-1;">Please select valid images to continue</p>';
      confirmSizeBtn.disabled = true;
      sizeModal.classList.add('active');
      return;
    }

    imageCountText.textContent = `${count} image${count > 1 ? 's' : ''} selected`;

    thumbnailGrid.innerHTML = '';
    images.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'thumbnail-item';
      div.style.animationDelay = `${i * 50}ms`;
      div.innerHTML = `<img src="${item.dataUrl}" alt="Preview">`;
      thumbnailGrid.appendChild(div);
    });

    resetSizeSelection();
    sizeModal.classList.add('active');
  }

  function resetSizeSelection() {
    userWidth = userHeight = outWidth = outHeight = null;
    isCustomSize = false;
    forceSquare = true;
    sizeOptions.forEach(opt => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-checked', 'false');
    });
    customSizeArea.classList.remove('visible');
    customWidthInput.value = '';
    customHeightInput.value = '';
    customSizeError.style.display = 'none';
    customSizeHint.style.display = 'none';
    forceSquareArea.style.display = 'none';
    forceSquareCheck.checked = true;
    forceSquareOutput.textContent = '';
    confirmSizeBtn.disabled = true;
  }

  // Size option click / keyboard
  sizeOptions.forEach(option => {
    option.addEventListener('click', () => selectSize(option));
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSize(option); }
    });
  });

  function selectSize(option) {
    sizeOptions.forEach(opt => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-checked', 'false');
    });
    option.classList.add('selected');
    option.setAttribute('aria-checked', 'true');

    if (option.dataset.size === 'custom') {
      isCustomSize = true;
      userWidth = userHeight = outWidth = outHeight = null;
      customSizeArea.classList.add('visible');
      customSizeError.style.display = 'none';
      validateCustomSize();
      setTimeout(() => customWidthInput.focus(), 100);
    } else {
      isCustomSize = false;
      userWidth = userHeight = outWidth = outHeight = parseInt(option.dataset.size);
      customSizeArea.classList.remove('visible');
      confirmSizeBtn.disabled = false;
    }
  }

  // Custom size validation
  customWidthInput.addEventListener('input', validateCustomSize);
  customHeightInput.addEventListener('input', validateCustomSize);
  customWidthInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmSizeBtn.disabled ? customHeightInput.focus() : confirmSizeBtn.click(); }
  });
  customHeightInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (!confirmSizeBtn.disabled) confirmSizeBtn.click(); }
  });

  forceSquareCheck.addEventListener('change', () => {
    forceSquare = forceSquareCheck.checked;
    computeOutputDims();
    updateForceSquareInfo();
    confirmSizeBtn.disabled = !(userWidth && userHeight);
  });

  function validateCustomSize() {
    const wRaw = customWidthInput.value.trim();
    const hRaw = customHeightInput.value.trim();
    const w = wRaw === '' ? NaN : parseInt(wRaw);
    const h = hRaw === '' ? NaN : parseInt(hRaw);

    customWidthInput.classList.remove('input-error');
    customHeightInput.classList.remove('input-error');

    if (wRaw === '' && hRaw === '') {
      customSizeError.style.display = 'none';
      customSizeHint.style.display = 'none';
      forceSquareArea.style.display = 'none';
      confirmSizeBtn.disabled = true;
      userWidth = userHeight = outWidth = outHeight = null;
      return;
    }

    const errors = [];

    if (wRaw === '') {
      confirmSizeBtn.disabled = true;
      customSizeError.style.display = 'none';
      customSizeHint.style.display = 'none';
      forceSquareArea.style.display = 'none';
      userWidth = userHeight = outWidth = outHeight = null;
      return;
    }
    if (isNaN(w) || w < 1) { errors.push('Width must be at least 1'); customWidthInput.classList.add('input-error'); }
    else if (w > LIMITS.maxDimension) { errors.push(`Width cannot exceed ${LIMITS.maxDimension}`); customWidthInput.classList.add('input-error'); }

    if (hRaw === '') {
      confirmSizeBtn.disabled = true;
      customSizeError.style.display = 'none';
      customSizeHint.style.display = 'none';
      forceSquareArea.style.display = 'none';
      userWidth = userHeight = outWidth = outHeight = null;
      return;
    }
    if (isNaN(h) || h < 1) { errors.push('Height must be at least 1'); customHeightInput.classList.add('input-error'); }
    else if (h > LIMITS.maxDimension) { errors.push(`Height cannot exceed ${LIMITS.maxDimension}`); customHeightInput.classList.add('input-error'); }

    if (errors.length) {
      customSizeError.textContent = errors.join('. ');
      customSizeError.style.display = 'block';
      customSizeHint.style.display = 'none';
      forceSquareArea.style.display = 'none';
      confirmSizeBtn.disabled = true;
      userWidth = userHeight = outWidth = outHeight = null;
      return;
    }

    customSizeError.style.display = 'none';
    userWidth = w;
    userHeight = h;

    const isNonSquare = w !== h;
    customSizeHint.style.display = isNonSquare ? 'flex' : 'none';

    if (isNonSquare) {
      forceSquareArea.style.display = 'flex';
      computeOutputDims();
      updateForceSquareInfo();
    } else {
      forceSquareArea.style.display = 'none';
      outWidth = w;
      outHeight = h;
    }

    confirmSizeBtn.disabled = false;
  }

  function updateForceSquareInfo() {
    if (forceSquare && outWidth) {
      forceSquareOutput.textContent = `Actual output: ${outWidth} \u00d7 ${outHeight} px`;
    } else if (userWidth) {
      forceSquareOutput.textContent = `Actual output: ${userWidth} \u00d7 ${userHeight} px`;
    } else {
      forceSquareOutput.textContent = '';
    }
  }

  // Confirm / Back / Close
  confirmSizeBtn.addEventListener('click', () => {
    if (!outWidth || !outHeight || !uploadedImages.length) return;
    sizeModal.classList.remove('active');
    setTimeout(processAllImages, 300);
  });

  backBtn.addEventListener('click', resetToStart);
  modalBackdrop.addEventListener('click', () => sizeModal.classList.remove('active'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sizeModal.classList.contains('active')) sizeModal.classList.remove('active');
  });

  // === JPEG Encoding: Baseline + YUV 4:2:0 ===
  async function buildBaselineJpeg420(canvas, quality) {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', quality);
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const cleaned = [];
    let i = 0;
    while (i < bytes.length) {
      if (bytes[i] === 0xFF) {
        if (bytes[i + 1] === 0xDD) {
          const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
          i += 2 + segLen;
          continue;
        }
        while (i < bytes.length - 1 && bytes[i] === 0xFF && bytes[i + 1] === 0x00) {
          cleaned.push(0xFF, 0x00);
          i += 2;
        }
        if (i >= bytes.length) break;
      }
      cleaned.push(bytes[i]);
      i++;
    }

    const data = new Uint8Array(cleaned);
    let sof0Idx = -1;
    for (let j = 0; j < data.length - 1; j++) {
      if (data[j] === 0xFF && data[j + 1] === 0xC0) { sof0Idx = j; break; }
    }

    if (sof0Idx === -1) {
      console.warn('SOF0 not found, returning raw JPEG');
      return new Blob([data], { type: 'image/jpeg' });
    }

    const h = canvas.height;
    const w = canvas.width;
    const sof0 = new Uint8Array([
      0xFF, 0xC0,
      0x00, 0x11,
      0x08,
      (h >> 8) & 0xFF, h & 0xFF,
      (w >> 8) & 0xFF, w & 0xFF,
      0x03,
      0x01, 0x22, 0x00,
      0x02, 0x11, 0x01,
      0x03, 0x11, 0x01
    ]);

    const origLen = (data[sof0Idx + 2] << 8) | data[sof0Idx + 3];
    const sof0End = sof0Idx + 2 + origLen;

    const result = new Uint8Array(sof0Idx + sof0.length + (data.length - sof0End));
    result.set(data.subarray(0, sof0Idx), 0);
    result.set(sof0, sof0Idx);
    result.set(data.subarray(sof0End), sof0Idx + sof0.length);

    return new Blob([result], { type: 'image/jpeg' });
  }

  // === Image Processing ===
  async function processAllImages() {
    processingView.classList.add('active');

    if (outWidth !== userWidth || outHeight !== userHeight) {
      processingSizeText.textContent = `Resizing to ${userWidth}\u00d7${userHeight}, then padding to ${outWidth}\u00d7${outHeight}`;
    } else {
      processingSizeText.textContent = `Resizing to ${outWidth}\u00d7${outHeight}`;
    }

    processedBlobs = [];
    processedFilenames = [];
    const validImages = uploadedImages.filter(Boolean);
    const needsTwoPass = (outWidth !== userWidth || outHeight !== userHeight);

    for (let idx = 0; idx < validImages.length; idx++) {
      const item = validImages[idx];
      processingMainText.textContent = `Processing ${idx + 1} of ${validImages.length}`;
      progressFill.style.width = `${(idx / validImages.length) * 100}%`;

      const blob = await processSingleImage(item.img, userWidth, userHeight, outWidth, outHeight, needsTwoPass);
      processedBlobs.push(blob);
      processedFilenames.push(`${idx + 1}.jpg`);

      if (item.img) item.img.src = '';
      if (item.dataUrl) item.dataUrl = '';
    }

    progressFill.style.width = '100%';
    await new Promise(r => setTimeout(r, 500));
    showResultView();
  }

  /**
   * Draw an image onto a canvas with proportional scaling + black padding.
   */
  function drawFitToCanvas(ctx, img, cw, ch) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cw, ch);

    const scale = Math.min(cw / img.width, ch / img.height);
    const sw = img.width * scale;
    const sh = img.height * scale;
    const ox = (cw - sw) / 2;
    const oy = (ch - sh) / 2;

    ctx.drawImage(img, 0, 0, img.width, img.height, ox, oy, sw, sh);
  }

  /**
   * Process a single image.
   * Two-pass when force-square is active:
   *   Pass 1: original → userW × userH (proportional scale + black pad)
   *   Pass 2: userW × userH result → outW × outH (center the rectangle, fill rest with black)
   * Single-pass otherwise:
   *   original → outW × outH (proportional scale + black pad)
   */
  async function processSingleImage(img, uw, uh, ow, oh, needsTwoPass) {
    const t0 = Date.now();

    if (needsTwoPass) {
      // Pass 1: scale original to fit user-specified rectangle
      tempCanvas.width = Math.max(1, uw);
      tempCanvas.height = Math.max(1, uh);
      drawFitToCanvas(tempCtx, img, uw, uh);

      // Pass 2: place the rectangle into the final square canvas
      drawCanvas.width = Math.max(1, ow);
      drawCanvas.height = Math.max(1, oh);
      drawCtx.fillStyle = '#000000';
      drawCtx.fillRect(0, 0, ow, oh);

      // Center the intermediate result (no scaling, just position)
      const px = (ow - uw) / 2;
      const py = (oh - uh) / 2;
      drawCtx.drawImage(tempCanvas, 0, 0, uw, uh, px, py, uw, uh);
    } else {
      // Single pass: scale original directly to output dimensions
      drawCanvas.width = Math.max(1, ow);
      drawCanvas.height = Math.max(1, oh);
      drawFitToCanvas(drawCtx, img, ow, oh);
    }

    const jpegBlob = await buildBaselineJpeg420(drawCanvas, 0.92);

    const elapsed = Date.now() - t0;
    await new Promise(r => setTimeout(r, Math.max(0, MIN_PROCESSING_TIME - elapsed)));

    return jpegBlob;
  }

  // === Result View ===
  function showResultView() {
    const count = processedBlobs.length;
    const wasPadded = outWidth !== userWidth || outHeight !== userHeight;

    let desc;
    if (wasPadded) {
      desc = `${count} image${count > 1 ? 's' : ''} processed: ${userWidth}\u00d7${userHeight} \u2192 ${outWidth}\u00d7${outHeight}`;
    } else {
      desc = `${count} image${count > 1 ? 's' : ''} processed to ${outWidth}\u00d7${outHeight}`;
    }

    resultCountText.textContent = desc;
    resultDimensions.textContent = `${outWidth} \u00d7 ${outHeight} px`;

    if (wasPadded) {
      resultMode.textContent = 'Scale + pad + square';
    } else {
      resultMode.textContent = 'Scale + pad';
    }
    resultMode.style.display = 'inline-flex';

    exportBtn.textContent = count === 1 ? 'Export Image' : 'Download ZIP';

    resultThumbnails.innerHTML = '';
    processedBlobs.forEach(blob => {
      const div = document.createElement('div');
      div.className = 'result-thumbnail';
      div.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="Processed image">`;
      resultThumbnails.appendChild(div);
    });

    processingView.classList.remove('active');
    resultView.classList.add('active');
  }

  // === Export ===
  exportBtn.addEventListener('click', async () => {
    if (!processedBlobs.length) return;
    processedBlobs.length === 1 ? await exportSingle() : await exportZip();
  });

  async function exportSingle() {
    const blob = processedBlobs[0];
    const name = processedFilenames[0];
    exportBtn.textContent = 'Exporting...';
    exportBtn.disabled = true;

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: name,
          types: [{ description: 'JPEG Image', accept: { 'image/jpeg': ['.jpg', '.jpeg'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        downloadBlob(blob, name);
      }
    } catch (err) {
      if (err.name !== 'AbortError') downloadBlob(blob, name);
    }

    exportBtn.textContent = 'Export Image';
    exportBtn.disabled = false;
  }

  async function exportZip() {
    exportBtn.textContent = 'Creating ZIP...';
    exportBtn.disabled = true;

    try {
      const zip = new JSZip();
      processedBlobs.forEach((b, i) => zip.file(processedFilenames[i], b));
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const zipName = `cropped_images_${outWidth}x${outHeight}.zip`;

      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: zipName,
          types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(zipBlob);
        await writable.close();
      } else {
        downloadBlob(zipBlob, zipName);
      }
    } catch (err) {
      if (err.name !== 'AbortError') { alert('Failed to create ZIP file.'); console.error(err); }
    }

    exportBtn.textContent = 'Download ZIP';
    exportBtn.disabled = false;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // === Reset ===
  newImageBtn.addEventListener('click', resetToStart);

  function resetToStart() {
    uploadedImages = [];
    userWidth = userHeight = outWidth = outHeight = null;
    isCustomSize = false;
    forceSquare = true;
    processedBlobs = [];
    processedFilenames = [];
    fileInput.value = '';
    progressFill.style.width = '0%';
    processingMainText.textContent = 'Processing Images';
    warningBox.style.display = 'none';
    resultMode.style.display = 'none';

    sizeModal.classList.remove('active');
    resultView.classList.remove('active');
    importView.style.display = 'flex';
  }
})();