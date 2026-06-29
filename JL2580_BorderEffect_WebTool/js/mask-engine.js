'use strict';

// ================================================================
//  自动 Mask 分析、生成、编辑器控制与校验
// ================================================================
function analyzeMaskRuleFromColorImage(img) {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx2 = canvas.getContext('2d');
    ctx2.drawImage(img, 0, 0);

    var imageData = ctx2.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    var totalPixels = canvas.width * canvas.height;
    var transparentCount = 0;
    var opaqueCount = 0;
    var borderPixels = 0;
    var borderTransparent = 0;
    var colorBins = {};
    var dominantBinKey = '';
    var dominantBinCount = 0;

    for (var y = 0; y < canvas.height; y++) {
        for (var x = 0; x < canvas.width; x++) {
            var p = (y * canvas.width + x) * 4;
            var r = data[p];
            var g = data[p + 1];
            var b = data[p + 2];
            var a = data[p + 3];

            var isBorder = (x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1);
            if (isBorder) borderPixels++;

            if (a < 40) {
                transparentCount++;
                if (isBorder) borderTransparent++;
                continue;
            }

            opaqueCount++;

            var br = Math.floor(r / 16);
            var bg = Math.floor(g / 16);
            var bb = Math.floor(b / 16);
            var key = br + '_' + bg + '_' + bb;
            colorBins[key] = (colorBins[key] || 0) + 1;
            if (colorBins[key] > dominantBinCount) {
                dominantBinCount = colorBins[key];
                dominantBinKey = key;
            }
        }
    }

    var transparentRatio = totalPixels > 0 ? transparentCount / totalPixels : 0;
    var dominantRatio = opaqueCount > 0 ? dominantBinCount / opaqueCount : 0;

    var dominantColor = { r: 28, g: 28, b: 28 };
    if (dominantBinKey) {
        var parts = dominantBinKey.split('_');
        dominantColor = {
            r: Number(parts[0]) * 16 + 8,
            g: Number(parts[1]) * 16 + 8,
            b: Number(parts[2]) * 16 + 8
        };
    }

    var borderBgCount = borderTransparent;
    var borderOpaqueCount = 0;
    var borderDistSum = 0;
    var borderDistMin = Infinity;
    var borderDistMax = 0;
    if (borderPixels > borderTransparent) {
        for (var y2 = 0; y2 < canvas.height; y2++) {
            for (var x2 = 0; x2 < canvas.width; x2++) {
                var isBorder2 = (x2 === 0 || y2 === 0 || x2 === canvas.width - 1 || y2 === canvas.height - 1);
                if (!isBorder2) continue;

                var p2 = (y2 * canvas.width + x2) * 4;
                var a2 = data[p2 + 3];
                if (a2 < 40) continue;

                var d = rgbDistance(
                    data[p2], data[p2 + 1], data[p2 + 2],
                    dominantColor.r, dominantColor.g, dominantColor.b
                );
                borderOpaqueCount++;
                borderDistSum += d;
                if (d < borderDistMin) borderDistMin = d;
                if (d > borderDistMax) borderDistMax = d;
                if (d <= 26) borderBgCount++;
            }
        }
    }

    var borderBgRatio = borderPixels > 0 ? borderBgCount / borderPixels : 0;
    var mode = 'gradient';
    if (transparentRatio > 0.08 || (dominantRatio > 0.5 && borderBgRatio > 0.6)) {
        mode = 'binary';
    }

    return {
        mode: mode,
        dominantColor: dominantColor,
        transparentRatio: transparentRatio,
        dominantRatio: dominantRatio,
        borderBgRatio: borderBgRatio,
        totalPixels: totalPixels,
        transparentCount: transparentCount,
        opaqueCount: opaqueCount,
        dominantBinCount: dominantBinCount,
        borderOpaqueCount: borderOpaqueCount,
        borderDistMean: borderOpaqueCount > 0 ? borderDistSum / borderOpaqueCount : 0,
        borderDistMin: borderOpaqueCount > 0 ? borderDistMin : 0,
        borderDistMax: borderOpaqueCount > 0 ? borderDistMax : 0
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function applyBinaryEdgeCleanup(maskAlpha, width, height, passes) {
    var current = maskAlpha;
    for (var pass = 0; pass < passes; pass++) {
        var next = new Uint8ClampedArray(current.length);
        next.set(current);

        for (var y = 1; y < height - 1; y++) {
            for (var x = 1; x < width - 1; x++) {
                var idx = y * width + x;
                var onCount = 0;
                for (var oy = -1; oy <= 1; oy++) {
                    for (var ox = -1; ox <= 1; ox++) {
                        if (current[(y + oy) * width + (x + ox)] > 0) onCount++;
                    }
                }

                if (current[idx] > 0 && onCount <= 2) {
                    next[idx] = 0;
                } else if (current[idx] === 0 && onCount >= 7) {
                    next[idx] = 255;
                }
            }
        }

        current = next;
    }
    return current;
}

function getMaskParams(mode, customParams) {
    if (customParams) return customParams;
    if (mode === 'binary') return maskEditorState.border;
    return maskEditorState.art;
}

function renderMaskByMode(mode, analysis, onDone, onFail, options) {
    options = options || {};
    var sourceImg = options.sourceImg || step1Img;
    var params = getMaskParams(mode, options.params);
    var isSilent = !!options.silent;

    try {
        var canvas = document.createElement('canvas');
        canvas.width = sourceImg.width;
        canvas.height = sourceImg.height;
        var ctx2 = canvas.getContext('2d');
        ctx2.drawImage(sourceImg, 0, 0);

        var imageData = ctx2.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;

        if (mode === 'binary') {
            var threshold = Number(params.threshold || 34);
            var alphaCut = Number(params.alphaCutoff || 40);
            var edgeCleanup = Number(params.edgeCleanup || 0);
            var transparentInputCount = 0;
            var opaqueInputCount = 0;
            var nearBgCount = 0;
            var keepCount = 0;
            var distSum = 0;
            var distMin = Infinity;
            var distMax = 0;
            var hit20 = 0;
            var hit26 = 0;
            var hit34 = 0;
            var hit42 = 0;
            for (var i = 0; i < data.length; i += 4) {
                var r = data[i];
                var g = data[i + 1];
                var b = data[i + 2];
                var a = data[i + 3];

                var isTransparent = a < alphaCut;
                var dist = rgbDistance(r, g, b, analysis.dominantColor.r, analysis.dominantColor.g, analysis.dominantColor.b);
                var nearBg = dist <= threshold;

                if (isTransparent) {
                    transparentInputCount++;
                } else {
                    opaqueInputCount++;
                    distSum += dist;
                    if (dist < distMin) distMin = dist;
                    if (dist > distMax) distMax = dist;
                    if (dist <= 20) hit20++;
                    if (dist <= 26) hit26++;
                    if (dist <= 34) hit34++;
                    if (dist <= 42) hit42++;
                }

                if (nearBg) nearBgCount++;
                var maskV = (isTransparent || nearBg) ? 0 : 255;
                if (maskV === 255) keepCount++;

                data[i] = maskV;
                data[i + 1] = maskV;
                data[i + 2] = maskV;
                data[i + 3] = 255;
            }

            if (edgeCleanup > 0) {
                var alphaMap = new Uint8ClampedArray(canvas.width * canvas.height);
                for (var ai = 0; ai < alphaMap.length; ai++) {
                    alphaMap[ai] = data[ai * 4];
                }
                alphaMap = applyBinaryEdgeCleanup(alphaMap, canvas.width, canvas.height, edgeCleanup);
                for (var aw = 0; aw < alphaMap.length; aw++) {
                    var av = alphaMap[aw];
                    data[aw * 4] = av;
                    data[aw * 4 + 1] = av;
                    data[aw * 4 + 2] = av;
                    data[aw * 4 + 3] = 255;
                }
            }

            var totalInput = transparentInputCount + opaqueInputCount;
            var keepRatio = totalInput > 0 ? keepCount / totalInput : 0;
            if (!isSilent) {
                log('[AUTO-MASK] binary stats: threshold=' + threshold + ' alphaCut=' + alphaCut +
                    ' total=' + totalInput + ' opaque=' + opaqueInputCount + ' transparent=' + transparentInputCount +
                    ' nearBg=' + nearBgCount + ' keep=' + keepCount + ' keepRatio=' + (keepRatio * 100).toFixed(1) + '%' +
                    ' dist(mean/min/max)=' + (opaqueInputCount > 0 ? (distSum / opaqueInputCount).toFixed(2) : '0.00') + '/' +
                    (opaqueInputCount > 0 ? distMin.toFixed(2) : '0.00') + '/' +
                    (opaqueInputCount > 0 ? distMax.toFixed(2) : '0.00') +
                    ' hit@20/26/34/42=' + hit20 + '/' + hit26 + '/' + hit34 + '/' + hit42 +
                    ' edgeCleanup=' + edgeCleanup);
            }
        } else {
            var gradAlphaCut = Number(params.alphaCutoff || 40);
            var contrast = Number(params.contrast || 1);
            var gamma = Number(params.gamma || 1);
            var invertStrength = Number(params.invertStrength || 1);
            var gradTransparent = 0;
            var gradGraySum = 0;
            var gradGrayMin = 255;
            var gradGrayMax = 0;
            var gradCount = 0;
            for (var j = 0; j < data.length; j += 4) {
                var rr = data[j];
                var gg = data[j + 1];
                var bb = data[j + 2];
                var aa = data[j + 3];

                var gray = 0.299 * rr + 0.587 * gg + 0.114 * bb;
                var normalized = gray / 255;
                var gammaAdjusted = Math.pow(normalized, 1 / Math.max(0.05, gamma));
                var contrasted = clamp((gammaAdjusted - 0.5) * contrast + 0.5, 0, 1);
                var invertedN = 1 - contrasted;
                var mixedN = contrasted * (1 - invertStrength) + invertedN * invertStrength;
                var inverted = clamp(Math.round(mixedN * 255), 0, 255);
                if (aa < gradAlphaCut) {
                    inverted = 0;
                    gradTransparent++;
                } else {
                    gradGraySum += gray;
                    gradCount++;
                    if (gray < gradGrayMin) gradGrayMin = gray;
                    if (gray > gradGrayMax) gradGrayMax = gray;
                }

                data[j] = inverted;
                data[j + 1] = inverted;
                data[j + 2] = inverted;
                data[j + 3] = 255;
            }

            if (!isSilent) {
                log('[AUTO-MASK] gradient stats: alphaCut=' + gradAlphaCut + ' total=' + (data.length / 4) +
                    ' transparent=' + gradTransparent + ' gray(mean/min/max)=' +
                    (gradCount > 0 ? (gradGraySum / gradCount).toFixed(2) : '0.00') + '/' +
                    (gradCount > 0 ? gradGrayMin.toFixed(2) : '0.00') + '/' +
                    (gradCount > 0 ? gradGrayMax.toFixed(2) : '0.00') +
                    ' contrast=' + contrast.toFixed(2) + ' gamma=' + gamma.toFixed(2) + ' invert=' + invertStrength.toFixed(2));
            }
        }

        ctx2.putImageData(imageData, 0, 0);
        forceGpuSync(canvas);

        var maskDataURL = canvas.toDataURL('image/png');
        var maskImg = new Image();
        maskImg.onload = function () { onDone(maskImg, maskDataURL); };
        maskImg.onerror = function () { onFail(new Error('Generated mask decode failed')); };
        maskImg.src = maskDataURL;
    } catch (err) {
        onFail(err);
    }
}

function applyGeneratedMask(maskImg, maskDataURL) {
    step2Img = maskImg;
    step2Ready = true;
    step2Preview.querySelector('img').src = maskDataURL;

    requestAnimationFrame(function() {
        step2Preview.style.display = '';
        dropZone2.style.display = 'none';
        if (editMaskOverlay) {
            editMaskOverlay.style.display = step2GeneratedByAutoMask ? '' : 'none';
        }
        autoMaskBtn.disabled = false;
        updateAutoMaskButtonLabel();
        updateModalUI();
    });
}

function updateAutoMaskModeHint(mode) {
    if (!autoMaskModeHint) return;
    autoMaskModeHint.textContent = 'Automatic mask generation is still in testing. It may produce jagged edges or other artifacts, so please use with caution.';
    autoMaskModeHint.style.display = 'block';
}

function updateAutoMaskButtonLabel() {
    if (!autoMaskBtn) return;

    if (!step1Img) {
        autoMaskBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate mask automatically';
        return;
    }

    if (step2GeneratedByAutoMask) {
        autoMaskBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Regenerate mask automatically';
    } else {
        autoMaskBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate mask automatically';
    }
}

function hasMaskStructureIssues(validationResult) {
    if (!validationResult || validationResult.valid || !validationResult.errors) return false;
    return validationResult.errors.some(function (err) {
        var text = err && err.text ? err.text : '';
        return text.indexOf('grayscale range') !== -1 || text.indexOf('shape information') !== -1;
    });
}

function getValidationSummary(validationResult) {
    if (!validationResult || validationResult.valid || !validationResult.errors || !validationResult.errors.length) {
        return '';
    }
    return validationResult.errors.map(function (err) {
        return (err && err.text) ? err.text.replace(/<[^>]*>/g, '') : '';
    }).filter(Boolean).join(' | ');
}

function generateMaskAutomatically() {
    if (!step1Img) {
        showAutoMaskError('Please upload a color image first.');
        return;
    }

    autoMaskError.textContent = '';
    autoMaskError.classList.remove('visible');

    if (!autoMaskAnalysis) {
        autoMaskAnalysis = analyzeMaskRuleFromColorImage(step1Img);
        log('[AUTO-MASK] Analyze: size=' + step1Img.width + 'x' + step1Img.height +
            ' mode=' + autoMaskAnalysis.mode +
            ' dominant=' + formatRgb(autoMaskAnalysis.dominantColor) +
            ' dominantRatio=' + (autoMaskAnalysis.dominantRatio * 100).toFixed(1) + '%' +
            ' transparentRatio=' + (autoMaskAnalysis.transparentRatio * 100).toFixed(1) + '%' +
            ' borderBgRatio=' + (autoMaskAnalysis.borderBgRatio * 100).toFixed(1) + '%' +
            ' borderDist(mean/min/max)=' + autoMaskAnalysis.borderDistMean.toFixed(2) + '/' +
            autoMaskAnalysis.borderDistMin.toFixed(2) + '/' + autoMaskAnalysis.borderDistMax.toFixed(2) +
            ' thresholds(mode): transparent>8% OR dominant>50% & borderBg>60%');
    }

    autoMaskMode = autoMaskAnalysis.mode;
    maskEditorState.mode = autoMaskMode;
    resetMaskEditorModeDefaults(autoMaskMode);

    autoMaskBtn.disabled = true;
    autoMaskBtn.classList.add('is-loading');
    autoMaskBtn.style.display = 'none';
    autoMaskBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
    updateAutoMaskModeHint(autoMaskMode);

    var attemptedFallback = false;

    function generateForMode(mode) {
        var params = getMaskParams(mode, null);
        renderMaskByMode(mode, autoMaskAnalysis, function (maskImg, maskDataURL) {
            var validation = validateBorderPair(step1Img, maskImg, mode);
            if (!validation.valid) {
                if (!attemptedFallback && mode === 'gradient' && hasMaskStructureIssues(validation)) {
                    attemptedFallback = true;
                    log('[AUTO-MASK] Gradient result too flat, fallback to binary mode. reason=' + getValidationSummary(validation));
                    autoMaskMode = 'binary';
                    maskEditorState.mode = 'binary';
                    resetMaskEditorModeDefaults('binary');
                    generateForMode('binary');
                    return;
                }

                log('[AUTO-MASK] Validation failed: ' + getValidationSummary(validation));
                showAutoMaskError('Generated mask quality is too low. Please edit mask or upload manually.');
                autoMaskBtn.disabled = false;
                autoMaskBtn.classList.remove('is-loading');
                autoMaskBtn.style.display = '';
                updateAutoMaskButtonLabel();
                return;
            }

            autoMaskMode = mode;
            step2GeneratedByAutoMask = true;
            applyGeneratedMask(maskImg, maskDataURL);
            updateAutoMaskModeHint(autoMaskMode);
            log('[AUTO-MASK] Generated default mode=' + autoMaskMode + ' size=' + step1Img.width + 'x' + step1Img.height);
            autoMaskBtn.disabled = false;
            autoMaskBtn.classList.remove('is-loading');
            updateAutoMaskButtonLabel();
        }, function (error) {
            console.error('[AUTO-MASK] default generate error:', error);
            showAutoMaskError('Failed to generate mask automatically. Please upload manually.');
            autoMaskBtn.disabled = false;
            autoMaskBtn.classList.remove('is-loading');
            autoMaskBtn.style.display = '';
            updateAutoMaskButtonLabel();
        }, {
            sourceImg: step1Img,
            params: params
        });
    }

    requestAnimationFrame(function () {
        setTimeout(function () {
            generateForMode(autoMaskMode);
        }, 0);
    });
}

function updateMaskEditorControls() {
    borderThresholdEl.value = String(maskEditorState.border.threshold);
    borderAlphaCutoffEl.value = String(maskEditorState.border.alphaCutoff);
    borderEdgeCleanupEl.value = String(maskEditorState.border.edgeCleanup);

    artAlphaCutoffEl.value = String(maskEditorState.art.alphaCutoff);
    artContrastEl.value = String(maskEditorState.art.contrast);
    artGammaEl.value = String(maskEditorState.art.gamma);
    artInvertStrengthEl.value = String(maskEditorState.art.invertStrength);

    borderThresholdValueEl.textContent = Number(maskEditorState.border.threshold).toFixed(1);
    borderAlphaCutoffValueEl.textContent = String(maskEditorState.border.alphaCutoff);
    borderEdgeCleanupValueEl.textContent = String(maskEditorState.border.edgeCleanup);
    artAlphaCutoffValueEl.textContent = String(maskEditorState.art.alphaCutoff);
    artContrastValueEl.textContent = Number(maskEditorState.art.contrast).toFixed(2);
    artGammaValueEl.textContent = Number(maskEditorState.art.gamma).toFixed(2);
    artInvertStrengthValueEl.textContent = Number(maskEditorState.art.invertStrength).toFixed(2);

    var isBorder = maskEditorState.mode === 'binary';
    maskModeBorderBtn.classList.toggle('active', isBorder);
    maskModeArtBtn.classList.toggle('active', !isBorder);
    borderControlsEl.style.display = isBorder ? '' : 'none';
    artControlsEl.style.display = isBorder ? 'none' : '';
}

function readMaskEditorControls() {
    maskEditorState.border.threshold = Number(borderThresholdEl.value);
    maskEditorState.border.alphaCutoff = Number(borderAlphaCutoffEl.value);
    maskEditorState.border.edgeCleanup = Number(borderEdgeCleanupEl.value);

    maskEditorState.art.alphaCutoff = Number(artAlphaCutoffEl.value);
    maskEditorState.art.contrast = Number(artContrastEl.value);
    maskEditorState.art.gamma = Number(artGammaEl.value);
    maskEditorState.art.invertStrength = Number(artInvertStrengthEl.value);
}

function resetMaskEditorModeDefaults(mode) {
    if (mode === 'binary') {
        maskEditorState.border.threshold = maskEditorDefaults.border.threshold;
        maskEditorState.border.alphaCutoff = maskEditorDefaults.border.alphaCutoff;
        maskEditorState.border.edgeCleanup = maskEditorDefaults.border.edgeCleanup;
    } else {
        maskEditorState.art.alphaCutoff = maskEditorDefaults.art.alphaCutoff;
        maskEditorState.art.contrast = maskEditorDefaults.art.contrast;
        maskEditorState.art.gamma = maskEditorDefaults.art.gamma;
        maskEditorState.art.invertStrength = maskEditorDefaults.art.invertStrength;
    }
}

function createDownscaledPreviewSource(img, maxSide) {
    if (!img) return null;
    var ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
    var w = Math.max(1, Math.round(img.width * ratio));
    var h = Math.max(1, Math.round(img.height * ratio));
    var previewCanvas = document.createElement('canvas');
    previewCanvas.width = w;
    previewCanvas.height = h;
    previewCanvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return previewCanvas;
}

function createMaskEditorPreviewSource() {
    if (!step1Img) return null;
    return createDownscaledPreviewSource(step1Img, 960);
}

function getDefaultCompositeBaseSource() {
    var defaultPhoto = photoList && photoList.length ? photoList[0] : null;
    if (defaultPhoto && defaultPhoto.img) return defaultPhoto.img;
    if (mainImg) return mainImg;
    return null;
}

function createCompositePreviewDataURL(baseSource, colorSource, maskImg) {
    if (!baseSource || !colorSource || !maskImg) return '';

    var basePreview = createDownscaledPreviewSource(baseSource, 960);
    if (!basePreview) return '';

    var w = basePreview.width;
    var h = basePreview.height;
    var outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    var outCtx = outCanvas.getContext('2d');

    var baseCanvas = document.createElement('canvas');
    baseCanvas.width = w;
    baseCanvas.height = h;
    var baseCtx = baseCanvas.getContext('2d');
    baseCtx.drawImage(basePreview, 0, 0, w, h);
    var baseData = baseCtx.getImageData(0, 0, w, h).data;

    var colorCanvas = document.createElement('canvas');
    colorCanvas.width = w;
    colorCanvas.height = h;
    var colorCtx = colorCanvas.getContext('2d');
    colorCtx.drawImage(colorSource, 0, 0, w, h);
    var colorData = colorCtx.getImageData(0, 0, w, h).data;

    var maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    var maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(maskImg, 0, 0, w, h);
    var maskData = maskCtx.getImageData(0, 0, w, h).data;

    var outImage = outCtx.createImageData(w, h);
    var outData = outImage.data;

    for (var i = 0; i < outData.length; i += 4) {
        var alpha = maskData[i] / 255;
        outData[i] = Math.round(baseData[i] * (1 - alpha) + colorData[i] * alpha);
        outData[i + 1] = Math.round(baseData[i + 1] * (1 - alpha) + colorData[i + 1] * alpha);
        outData[i + 2] = Math.round(baseData[i + 2] * (1 - alpha) + colorData[i + 2] * alpha);
        outData[i + 3] = 255;
    }

    outCtx.putImageData(outImage, 0, 0);
    return outCanvas.toDataURL('image/png');
}

function updateMaskPreviewModeUI() {
    var isComposite = maskEditorPreviewMode === 'composite';
    previewModeCompositeBtn.classList.toggle('active', isComposite);
    previewModeMaskBtn.classList.toggle('active', !isComposite);
    if (maskPreviewTitleEl) {
        maskPreviewTitleEl.textContent = isComposite ? 'Composite Preview' : 'Mask Preview';
    }
}

function switchMaskPreviewMode(mode) {
    maskEditorPreviewMode = mode;
    updateMaskPreviewModeUI();
    scheduleMaskEditorPreview();
}

function scheduleMaskEditorPreview() {
    if (maskEditorPreviewTimer) {
        clearTimeout(maskEditorPreviewTimer);
        maskEditorPreviewTimer = null;
    }
    maskEditorPreviewTimer = setTimeout(function () {
        if (!maskEditorPreviewSource || !autoMaskAnalysis) return;
        var mode = maskEditorState.mode;
        var params = getMaskParams(mode, null);
        renderMaskByMode(mode, autoMaskAnalysis, function (maskImg, maskDataURL) {
            if (maskEditorPreviewMode === 'mask') {
                maskEditorPreviewEl.src = maskDataURL;
            } else {
                var compositeBase = getDefaultCompositeBaseSource();
                var compositeURL = createCompositePreviewDataURL(compositeBase, maskEditorPreviewSource, maskImg);
                maskEditorPreviewEl.src = compositeURL || maskDataURL;
            }
        }, function (error) {
            console.error('[MASK-EDITOR] preview error:', error);
            showAutoMaskError('Failed to preview mask.');
        }, {
            sourceImg: maskEditorPreviewSource,
            params: params,
            silent: true
        });
    }, 60);
}

function switchMaskEditorMode(mode) {
    maskEditorState.mode = mode;
    resetMaskEditorModeDefaults(mode);
    updateMaskEditorControls();
    scheduleMaskEditorPreview();
}

function openMaskEditor() {
    if (!step1Img) {
        showAutoMaskError('Please upload a color image first.');
        return;
    }

    autoMaskError.textContent = '';
    autoMaskError.classList.remove('visible');

    if (!autoMaskAnalysis) {
        autoMaskAnalysis = analyzeMaskRuleFromColorImage(step1Img);
        autoMaskMode = autoMaskAnalysis.mode;
        log('[AUTO-MASK] Analyze: size=' + step1Img.width + 'x' + step1Img.height +
            ' mode=' + autoMaskAnalysis.mode +
            ' dominant=' + formatRgb(autoMaskAnalysis.dominantColor) +
            ' dominantRatio=' + (autoMaskAnalysis.dominantRatio * 100).toFixed(1) + '%' +
            ' transparentRatio=' + (autoMaskAnalysis.transparentRatio * 100).toFixed(1) + '%' +
            ' borderBgRatio=' + (autoMaskAnalysis.borderBgRatio * 100).toFixed(1) + '%' +
            ' borderDist(mean/min/max)=' + autoMaskAnalysis.borderDistMean.toFixed(2) + '/' +
            autoMaskAnalysis.borderDistMin.toFixed(2) + '/' + autoMaskAnalysis.borderDistMax.toFixed(2) +
            ' thresholds(mode): transparent>8% OR dominant>50% & borderBg>60%');
    }

    if (!step2GeneratedByAutoMask) {
        maskEditorState.mode = autoMaskAnalysis.mode;
    }

    modalViewMode = 'editor';
    importViewEl.style.display = 'none';
    maskEditorViewEl.style.display = '';
    if (modalStepperEl) modalStepperEl.style.display = 'none';
    if (modalFooterEl) modalFooterEl.style.display = 'none';
    if (modalTitleEl) modalTitleEl.textContent = 'Mask Editor';
    modalOverlay.classList.add('editor-mode');
    maskEditorPreviewMode = 'composite';

    maskEditorPreviewSource = createMaskEditorPreviewSource();
    updateMaskEditorControls();
    updateMaskPreviewModeUI();
    scheduleMaskEditorPreview();
}

function closeMaskEditor(skipRefresh) {
    if (modalViewMode !== 'editor') return;
    modalViewMode = 'import';
    importViewEl.style.display = '';
    maskEditorViewEl.style.display = 'none';
    if (modalStepperEl) modalStepperEl.style.display = '';
    if (modalFooterEl) modalFooterEl.style.display = 'flex';
    if (modalTitleEl) modalTitleEl.textContent = 'Add New Effect';
    modalOverlay.classList.remove('editor-mode');
    if (maskEditorPreviewTimer) {
        clearTimeout(maskEditorPreviewTimer);
        maskEditorPreviewTimer = null;
    }
    maskEditorPreviewSource = null;
    if (!skipRefresh) updateModalUI();
}

function onMaskEditorControlInput() {
    readMaskEditorControls();
    updateMaskEditorControls();
    scheduleMaskEditorPreview();
}

function applyMaskEditorResult() {
    if (!step1Img || !autoMaskAnalysis) return;

    readMaskEditorControls();
    maskEditorApplyBtn.disabled = true;
    maskEditorApplyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Applying...';

    var finalMode = maskEditorState.mode;
    var finalParams = getMaskParams(finalMode, null);
    renderMaskByMode(finalMode, autoMaskAnalysis, function (maskImg, maskDataURL) {
        var validation = validateBorderPair(step1Img, maskImg, finalMode);
        var hasWarnings = !validation.valid;
        if (hasWarnings) {
            log('[AUTO-MASK] Editor result warning: ' + getValidationSummary(validation));
            showAutoMaskError('Mask may be too flat and could fail final import validation.');
        }

        autoMaskMode = finalMode;
        step2GeneratedByAutoMask = true;
        applyGeneratedMask(maskImg, maskDataURL);
        updateAutoMaskModeHint(finalMode);
        closeMaskEditor();
        log('[AUTO-MASK] Applied via editor mode=' + finalMode + ' size=' + step1Img.width + 'x' + step1Img.height +
            ' params=' + JSON.stringify(finalParams) + (hasWarnings ? ' [WITH-WARNING]' : ''));

        maskEditorApplyBtn.disabled = false;
        maskEditorApplyBtn.innerHTML = '<i class="fa-solid fa-check"></i> OK';
    }, function (error) {
        console.error('[AUTO-MASK] apply error:', error);
        showAutoMaskError('Failed to apply generated mask.');
        maskEditorApplyBtn.disabled = false;
        maskEditorApplyBtn.innerHTML = '<i class="fa-solid fa-check"></i> OK';
    }, {
        sourceImg: step1Img,
        params: finalParams
    });
}

function validateBorderPair(colorImg, bwImg, mode) {
    mode = mode || 'gradient';
    var errors = [];
    var warnings = [];

    if (colorImg.width !== bwImg.width || colorImg.height !== bwImg.height) {
        errors.push({
            icon: 'fa-ruler-combined',
            text: 'Image dimensions do not match.' +
                  ' Color image is <code>' + colorImg.width + '\u00d7' + colorImg.height + '</code>,' +
                  ' mask image is <code>' + bwImg.width + '\u00d7' + bwImg.height + '</code>.',
            expected: 'Both images must have identical width and height (e.g. 640\u00d7480).'
        });
    }

    var cCvs = document.createElement('canvas');
    cCvs.width = colorImg.width; cCvs.height = colorImg.height;
    var cCtx = cCvs.getContext('2d');
    cCtx.drawImage(colorImg, 0, 0);
    var cData = cCtx.getImageData(0, 0, colorImg.width, colorImg.height).data;

    var totalPx = colorImg.width * colorImg.height;
    var sampleStep = Math.max(1, Math.floor(totalPx / 5000));
    var sampledCount = 0;
    var colorVariance = 0;
    for (var i = 0; i < cData.length; i += 4 * sampleStep) {
        var maxC = Math.max(cData[i], cData[i + 1], cData[i + 2]);
        var minC = Math.min(cData[i], cData[i + 1], cData[i + 2]);
        colorVariance += (maxC - minC);
        sampledCount++;
    }
    var avgColorVariance = colorVariance / sampledCount;
    if (mode !== 'binary' && avgColorVariance < 3) {
        errors.push({
            icon: 'fa-palette',
            text: 'The "color image" appears to be grayscale (avg channel deviation: <code>' + avgColorVariance.toFixed(1) + '</code>).',
            expected: 'Color image should have visible color (R/G/B channels differ). Did you select the mask as color?'
        });
    }

    var mCvs = document.createElement('canvas');
    mCvs.width = bwImg.width; mCvs.height = bwImg.height;
    var mCtx = mCvs.getContext('2d');
    mCtx.drawImage(bwImg, 0, 0);
    var mData = mCtx.getImageData(0, 0, bwImg.width, bwImg.height).data;

    var bwSampleStep = Math.max(1, Math.floor((bwImg.width * bwImg.height) / 5000));
    var bwSampled = 0;
    var bwVariance = 0;
    for (var j = 0; j < mData.length; j += 4 * bwSampleStep) {
        var bMax = Math.max(mData[j], mData[j + 1], mData[j + 2]);
        var bMin = Math.min(mData[j], mData[j + 1], mData[j + 2]);
        bwVariance += (bMax - bMin);
        bwSampled++;
    }
    var avgBwVariance = bwVariance / bwSampled;
    if (avgBwVariance > 15) {
        errors.push({
            icon: 'fa-circle-half-stroke',
            text: 'The "mask image" appears to be a color image (avg channel deviation: <code>' + avgBwVariance.toFixed(1) + '</code>).',
            expected: 'Mask must be grayscale (R \u2248 G \u2248 B). Did you select the color as mask?'
        });
    }

    var bwMinGray = 255, bwMaxGray = 0;
    for (var k = 0; k < mData.length; k += 4 * bwSampleStep) {
        var g = Math.round(0.299 * mData[k] + 0.587 * mData[k + 1] + 0.114 * mData[k + 2]);
        if (g < bwMinGray) bwMinGray = g;
        if (g > bwMaxGray) bwMaxGray = g;
    }
    if (bwMaxGray - bwMinGray < 10) {
        warnings.push({
            icon: 'fa-chart-simple',
            text: 'Mask has almost no grayscale range (min: <code>' + bwMinGray + '</code>, max: <code>' + bwMaxGray + '</code>).',
            expected: 'This is allowed, but the effect may look uniformly blended (around a fixed opacity).'
        });
    }

    var bwGraySum = 0;
    var bwGraySqSum = 0;
    var bwGrayCount = 0;
    for (var m = 0; m < mData.length; m += 4 * bwSampleStep) {
        var gv = Math.round(0.299 * mData[m] + 0.587 * mData[m + 1] + 0.114 * mData[m + 2]);
        bwGraySum += gv;
        bwGraySqSum += gv * gv;
        bwGrayCount++;
    }
    var bwMean = bwGraySum / bwGrayCount;
    var bwStdDev = Math.sqrt(bwGraySqSum / bwGrayCount - bwMean * bwMean);
    if (bwStdDev < 5) {
        warnings.push({
            icon: 'fa-shapes',
            text: 'Mask lacks shape information (std dev: <code>' + bwStdDev.toFixed(1) + '</code>).',
            expected: 'This is allowed, but local structure/texture control will be limited.'
        });
    }

    var bgPixels = 0;
    for (var p = 0; p < cData.length; p += 4 * sampleStep) {
        if (Math.abs(cData[p] - 28) <= TOLERANCE &&
            Math.abs(cData[p + 1] - 28) <= TOLERANCE &&
            Math.abs(cData[p + 2] - 28) <= TOLERANCE) {
            bgPixels++;
        }
    }
    var bgRatio = bgPixels / sampledCount;
    if (mode !== 'binary' && bgRatio > 0.95) {
        errors.push({
            icon: 'fa-image',
            text: 'Over <code>' + (bgRatio * 100).toFixed(0) + '%</code> of color image is #1C1C1C background.',
            expected: 'Color image should have visible border elements on #1C1C1C background.'
        });
    }

    return errors.length > 0
        ? { valid: false, errors: errors, warnings: warnings }
        : { valid: true, warnings: warnings };
}

function showErrorModal(errors) {
    var listEl = document.getElementById('errorList');
    listEl.innerHTML = '';
    errors.forEach(function (err) {
        var item = document.createElement('div');
        item.className = 'error-item';
        item.innerHTML =
            '<i class="fa-solid ' + err.icon + '"></i>' +
            '<div class="error-copy">' +
                '<div class="error-main">' + err.text + '</div>' +
                (err.expected ? '<div class="expected"><i class="fa-solid fa-circle-info" style="margin-right:4px;font-size:10px;"></i>' + err.expected + '</div>' : '') +
            '</div>';
        listEl.appendChild(item);
    });
    closeModal();
    step1Img = null;
    step2Img = null;
    step2Ready = false;
    step1Preview.style.display = 'none';
    step2Preview.style.display = 'none';
    document.getElementById('errorOverlay').classList.add('visible');
}