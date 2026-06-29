'use strict';

// ================================================================
//  渲染与预览
// ================================================================
function fitCanvas() {
    if (!mainImg || !mainImg.width) return;
    var frameEl = canvas && canvas.parentElement;
    var baseEl = frameEl || previewArea;
    if (!baseEl) return;

    var maxW = baseEl.clientWidth;
    var maxH = baseEl.clientHeight;

    if (frameEl) {
        var style = window.getComputedStyle(frameEl);
        var padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
        var padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
        maxW = Math.max(1, frameEl.clientWidth - padX);
        maxH = Math.max(1, frameEl.clientHeight - padY);
    } else {
        maxW = Math.max(1, maxW - 60);
        maxH = Math.max(1, maxH - 60);
    }

    var scale = Math.min(maxW / mainImg.width, maxH / mainImg.height, 1);
    canvas.style.width = Math.max(1, Math.round(mainImg.width * scale)) + 'px';
    canvas.style.height = Math.max(1, Math.round(mainImg.height * scale)) + 'px';
}

function showLoadingOverlay() {
    if (!loadingOverlay) return;
    if (loadingOverlayTimer) {
        clearTimeout(loadingOverlayTimer);
        loadingOverlayTimer = null;
    }
    if (loadingOverlayMaxTimer) {
        clearTimeout(loadingOverlayMaxTimer);
        loadingOverlayMaxTimer = null;
    }
    loadingOverlay.classList.add('visible');
    loadingOverlay.startTime = Date.now();
    loadingOverlayMaxTimer = setTimeout(function () {
        hideLoadingOverlay(true);
    }, loadingOverlayMaxDuration);
}

function hideLoadingOverlay(force) {
    if (!loadingOverlay || !loadingOverlay.classList.contains('visible')) return;
    var elapsed = Date.now() - (loadingOverlay.startTime || 0);
    if (!force && elapsed < loadingOverlayMinDuration) {
        if (loadingOverlayTimer) clearTimeout(loadingOverlayTimer);
        loadingOverlayTimer = setTimeout(function () {
            hideLoadingOverlay(true);
        }, loadingOverlayMinDuration - elapsed);
        return;
    }
    loadingOverlay.classList.remove('visible');
    if (loadingOverlayTimer) {
        clearTimeout(loadingOverlayTimer);
        loadingOverlayTimer = null;
    }
    if (loadingOverlayMaxTimer) {
        clearTimeout(loadingOverlayMaxTimer);
        loadingOverlayMaxTimer = null;
    }
}

function createEffectRenderedCanvas(photoImg, effectId) {
    var w = photoImg.width;
    var h = photoImg.height;
    var resultCvs = document.createElement('canvas');
    resultCvs.width = w;
    resultCvs.height = h;
    var resultCtx = resultCvs.getContext('2d');
    resultCtx.drawImage(photoImg, 0, 0, w, h);

    if (effectId === 'none' || !processedBorders[effectId]) {
        return resultCvs;
    }

    var border = processedBorders[effectId];
    var cS = document.createElement('canvas');
    cS.width = w;
    cS.height = h;
    cS.getContext('2d').drawImage(border.colorCvs, 0, 0, w, h);

    var mS = document.createElement('canvas');
    mS.width = w;
    mS.height = h;
    mS.getContext('2d').drawImage(border.maskCvs, 0, 0, w, h);

    var outData = resultCtx.getImageData(0, 0, w, h);
    var data = outData.data;
    var colPx = cS.getContext('2d').getImageData(0, 0, w, h).data;
    var maskPx = mS.getContext('2d').getImageData(0, 0, w, h).data;

    for (var i = 0; i < w * h; i++) {
        var alpha = maskPx[i * 4 + 3] / 255;
        var p = i * 4;
        data[p] = Math.round(data[p] * (1 - alpha) + colPx[p] * alpha);
        data[p + 1] = Math.round(data[p + 1] * (1 - alpha) + colPx[p + 1] * alpha);
        data[p + 2] = Math.round(data[p + 2] * (1 - alpha) + colPx[p + 2] * alpha);
    }

    resultCtx.putImageData(outData, 0, 0);
    return resultCvs;
}

function preloadCurrentEffectCaches() {
    if (currentEffect === 'none') return;
    var effectId = currentEffect;
    photoList.forEach(function(photo, index) {
        if (index === currentPhotoIndex) return;
        var key = getCacheKeyByEffect(effectId, index);
        if (renderedCache[key] || !photo.img || !photo.img.width) return;

        setTimeout(function() {
            if (currentEffect !== effectId) return;
            if (renderedCache[key] || !photo.img || !photo.img.width) return;
            var cachedCanvas = createEffectRenderedCanvas(photo.img, effectId);
            rememberRenderedCache(effectId, index, createPreviewCacheCanvas(cachedCanvas));
            enforceCacheBudget(effectId);
            log('[PRELOAD] Cached: ' + key);
        }, 80 * index);
    });
}

function renderCurrentView(useOverlay) {
    if (useOverlay && currentEffect !== 'none') {
        showLoadingOverlay();
        requestAnimationFrame(function () {
            render();
            hideLoadingOverlay(false);
            preloadCurrentEffectCaches();
        });
    } else {
        render();
        preloadCurrentEffectCaches();
    }
}

function startPreviewTransition() {
    if (previewTransitionTimer) {
        clearTimeout(previewTransitionTimer);
    }
    previewArea.classList.add('preview-transition');
    canvas.style.opacity = '0.8';
    previewTransitionTimer = setTimeout(function () {
        canvas.style.opacity = '1';
        previewArea.classList.remove('preview-transition');
        previewTransitionTimer = null;
    }, 160);
}

function render() {
    if (isLoadingPhoto) return;

    var currentPhoto = photoList[currentPhotoIndex];

    if (!currentPhoto.img || !currentPhoto.img.width) {
        isLoadingPhoto = true;
        var img = new Image();
        img.onload = function() {
            currentPhoto.img = img;
            mainImg = img;
            isLoadingPhoto = false;
            render();
        };
        img.onerror = function() {
            isLoadingPhoto = false;
            log('[RENDER] Failed to load photo');
        };
        img.src = currentPhoto.src;
        return;
    }

    var w = currentPhoto.img.width, h = currentPhoto.img.height;
    mainImg = currentPhoto.img;

    if (currentEffect === 'none') {
        canvas.width = w; canvas.height = h;
        ctx.drawImage(mainImg, 0, 0, w, h);
        fitCanvas();
        return;
    }

    var cacheKey = getCacheKey();
    if (renderedCache[cacheKey]) {
        log('[RENDER] Cache HIT: ' + cacheKey);
        touchRenderedCache(cacheKey);
        canvas.width = w; canvas.height = h;
        ctx.drawImage(renderedCache[cacheKey], 0, 0, w, h);
        fitCanvas();
        return;
    }

    log('[RENDER] Cache MISS: ' + cacheKey);
    startPreviewTransition();
    canvas.width = w; canvas.height = h;

    var renderedCanvas = createEffectRenderedCanvas(mainImg, currentEffect);
    ctx.drawImage(renderedCanvas, 0, 0, w, h);
    rememberRenderedCache(currentEffect, currentPhotoIndex, createPreviewCacheCanvas(renderedCanvas));
    enforceCacheBudget(currentEffect);

    fitCanvas();
}

function applyEffect(name) {
    currentEffect = name;
    log('[APPLY] ' + name);

    var items = effectListEl.querySelectorAll('.effect-item');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('active', items[i].dataset.border === name);
    }

    if (name === 'none') {
        render();
    } else if (renderedCache[getCacheKey()]) {
        renderCurrentView(false);
    } else {
        renderCurrentView(true);
    }

    updateExportButton();
}
