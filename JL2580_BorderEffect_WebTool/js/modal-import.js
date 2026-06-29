'use strict';

// ================================================================
//  导入弹窗逻辑
//  分两步：先选颜色图，再选灰度蒙版图
// ================================================================
var modalOverlay, modalHint, dropZone1, dropZone2, step1Preview, step2Preview;
var autoMaskBtn, autoMaskError, autoMaskModeHint;
var editMaskOverlay, editMaskBtn;
var modalTitleEl, modalStepperEl, modalFooterEl;
var importViewEl, maskEditorViewEl, maskEditorPreviewEl;
var maskModeBorderBtn, maskModeArtBtn;
var maskResetBtn;
var previewModeCompositeBtn, previewModeMaskBtn, maskPreviewTitleEl;
var borderControlsEl, artControlsEl;
var maskEditorApplyBtn, maskEditorCancelBtn;

var borderThresholdEl, borderAlphaCutoffEl, borderEdgeCleanupEl;
var artAlphaCutoffEl, artContrastEl, artGammaEl, artInvertStrengthEl;
var borderThresholdValueEl, borderAlphaCutoffValueEl, borderEdgeCleanupValueEl;
var artAlphaCutoffValueEl, artContrastValueEl, artGammaValueEl, artInvertStrengthValueEl;

var step1Img   = null;   // 第一步选择的颜色图
var step2Img   = null;   // 第二步选择的蒙版图
var step2Ready = false;  // 第二步是否已经选择了蒙版图，OK 按钮才能启用
var step2GeneratedByAutoMask = false;
var autoMaskAnalysis = null;
var autoMaskMode = 'gradient';
var modalViewMode = 'import';
var maskEditorPreviewMode = 'composite';
var maskEditorPreviewSource = null;
var maskEditorPreviewTimer = null;
var maskEditorDefaults = {
    border: {
        threshold: 34,
        alphaCutoff: 40,
        edgeCleanup: 0
    },
    art: {
        alphaCutoff: 40,
        contrast: 1,
        gamma: 1,
        invertStrength: 1
    }
};
var maskEditorState = {
    mode: 'binary',
    border: {
        threshold: maskEditorDefaults.border.threshold,
        alphaCutoff: maskEditorDefaults.border.alphaCutoff,
        edgeCleanup: maskEditorDefaults.border.edgeCleanup
    },
    art: {
        alphaCutoff: maskEditorDefaults.art.alphaCutoff,
        contrast: maskEditorDefaults.art.contrast,
        gamma: maskEditorDefaults.art.gamma,
        invertStrength: maskEditorDefaults.art.invertStrength
    }
};

function countStepDecimals(stepValue) {
    var stepStr = String(stepValue || '1');
    var dot = stepStr.indexOf('.');
    return dot === -1 ? 0 : (stepStr.length - dot - 1);
}

function clampRangeValue(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function applyRangeValue(inputEl, value) {
    var step = Number(inputEl.step || 1);
    var min = Number(inputEl.min || 0);
    var max = Number(inputEl.max || 100);
    var decimals = countStepDecimals(step);
    var normalized = clampRangeValue(value, min, max);
    inputEl.value = decimals > 0 ? normalized.toFixed(decimals) : String(Math.round(normalized));
}

function onMaskRangeWheel(e) {
    e.preventDefault();
    var inputEl = e.currentTarget;
    var baseStep = Number(inputEl.step || 1);
    var min = Number(inputEl.min || 0);
    var max = Number(inputEl.max || 100);
    var current = Number(inputEl.value || 0);
    var deltaStep = e.shiftKey ? baseStep * 0.2 : baseStep;
    var nextValue = current + (e.deltaY < 0 ? deltaStep : -deltaStep);
    nextValue = clampRangeValue(nextValue, min, max);
    applyRangeValue(inputEl, nextValue);
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
}

function initModal() {
    modalOverlay = document.getElementById('modalOverlay');
    modalHint    = document.getElementById('modalHint');
    dropZone1    = document.getElementById('dropZone1');
    dropZone2    = document.getElementById('dropZone2');
    step1Preview = document.getElementById('step1Preview');
    step2Preview = document.getElementById('step2Preview');
    autoMaskBtn  = document.getElementById('autoMaskBtn');
    autoMaskError = document.getElementById('autoMaskError');
    autoMaskModeHint = document.getElementById('autoMaskModeHint');
    editMaskOverlay = document.getElementById('editMaskOverlay');
    editMaskBtn = document.getElementById('editMaskBtn');
    modalTitleEl = document.querySelector('.modal-title');
    modalStepperEl = document.querySelector('.modal-stepper');
    modalFooterEl = document.querySelector('#modalOverlay .modal-footer');
    importViewEl = document.getElementById('importView');
    maskEditorViewEl = document.getElementById('maskEditorView');
    maskEditorPreviewEl = document.querySelector('#maskEditorPreview img');
    maskModeBorderBtn = document.getElementById('maskModeBorder');
    maskModeArtBtn = document.getElementById('maskModeArt');
    maskResetBtn = document.getElementById('maskResetBtn');
    previewModeCompositeBtn = document.getElementById('previewModeComposite');
    previewModeMaskBtn = document.getElementById('previewModeMask');
    maskPreviewTitleEl = document.getElementById('maskPreviewTitle');
    borderControlsEl = document.getElementById('borderControls');
    artControlsEl = document.getElementById('artControls');
    maskEditorApplyBtn = document.getElementById('maskEditorApply');
    maskEditorCancelBtn = document.getElementById('maskEditorCancel');

    borderThresholdEl = document.getElementById('borderThreshold');
    borderAlphaCutoffEl = document.getElementById('borderAlphaCutoff');
    borderEdgeCleanupEl = document.getElementById('borderEdgeCleanup');
    artAlphaCutoffEl = document.getElementById('artAlphaCutoff');
    artContrastEl = document.getElementById('artContrast');
    artGammaEl = document.getElementById('artGamma');
    artInvertStrengthEl = document.getElementById('artInvertStrength');

    borderThresholdValueEl = document.getElementById('borderThresholdValue');
    borderAlphaCutoffValueEl = document.getElementById('borderAlphaCutoffValue');
    borderEdgeCleanupValueEl = document.getElementById('borderEdgeCleanupValue');
    artAlphaCutoffValueEl = document.getElementById('artAlphaCutoffValue');
    artContrastValueEl = document.getElementById('artContrastValue');
    artGammaValueEl = document.getElementById('artGammaValue');
    artInvertStrengthValueEl = document.getElementById('artInvertStrengthValue');

    // 点击拖放区域 → 打开文件选择器
    dropZone1.addEventListener('click', function () {
        chooseFileForStep(1);
    });

    dropZone2.addEventListener('click', function () {
        if (!dropZone2.classList.contains('disabled')) {
            chooseFileForStep(2);
        }
    });

    // Drag & Drop support for dropZone1
    dropZone1.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropZone1.style.borderColor = '#d4a24e';
        dropZone1.style.background = 'rgba(212, 162, 78, 0.08)';
    });

    dropZone1.addEventListener('dragleave', function () {
        dropZone1.style.borderColor = '';
        dropZone1.style.background = '';
    });

    dropZone1.addEventListener('drop', function (e) {
        e.preventDefault();
        dropZone1.style.borderColor = '';
        dropZone1.style.background = '';
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], 1);
    });

    // Drag & Drop support for dropZone2
    dropZone2.addEventListener('dragover', function (e) {
        if (dropZone2.classList.contains('disabled')) return;
        e.preventDefault();
        dropZone2.style.borderColor = '#d4a24e';
        dropZone2.style.background = 'rgba(212, 162, 78, 0.08)';
    });

    dropZone2.addEventListener('dragleave', function () {
        dropZone2.style.borderColor = '';
        dropZone2.style.background = '';
    });

    dropZone2.addEventListener('drop', function (e) {
        if (dropZone2.classList.contains('disabled')) return;
        e.preventDefault();
        dropZone2.style.borderColor = '';
        dropZone2.style.background = '';
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], 2);
    });

    // Auto mask button
    autoMaskBtn.addEventListener('click', generateMaskAutomatically);

    if (editMaskBtn) {
        editMaskBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openMaskEditor();
        });
    }

    // Mask editor mode tabs
    maskModeBorderBtn.addEventListener('click', function () {
        switchMaskEditorMode('binary');
    });
    maskModeArtBtn.addEventListener('click', function () {
        switchMaskEditorMode('gradient');
    });

    maskResetBtn.addEventListener('click', function () {
        resetMaskEditorModeDefaults(maskEditorState.mode);
        updateMaskEditorControls();
        scheduleMaskEditorPreview();
    });

    previewModeCompositeBtn.addEventListener('click', function () {
        switchMaskPreviewMode('composite');
    });
    previewModeMaskBtn.addEventListener('click', function () {
        switchMaskPreviewMode('mask');
    });

    // Mask editor controls
    [
        borderThresholdEl,
        borderAlphaCutoffEl,
        borderEdgeCleanupEl,
        artAlphaCutoffEl,
        artContrastEl,
        artGammaEl,
        artInvertStrengthEl
    ].forEach(function (inputEl) {
        inputEl.addEventListener('input', onMaskEditorControlInput);
        inputEl.addEventListener('wheel', onMaskRangeWheel, { passive: false });
    });

    maskEditorApplyBtn.addEventListener('click', applyMaskEditorResult);
    maskEditorCancelBtn.addEventListener('click', function () {
        closeMaskEditor(false);
    });

    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalOk').addEventListener('click', function () {
        if (!step1Img || !step2Ready || !step2Img) return;
        finishImport(step2Img);
    });
    document.getElementById('errorOk').addEventListener('click', function () {
        document.getElementById('errorOverlay').classList.remove('visible');
    });
}

function chooseFileForStep(step) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function () {
        if (input.files[0]) handleFile(input.files[0], step);
        input.value = '';
    };
    input.click();
}

function openModal() {
    step1Img    = null;
    step2Img    = null;
    step2Ready  = false;
    step2GeneratedByAutoMask = false;
    autoMaskAnalysis = null;
    autoMaskMode = 'gradient';
    modalViewMode = 'import';
    maskEditorPreviewMode = 'composite';
    maskEditorPreviewSource = null;
    if (maskEditorPreviewTimer) {
        clearTimeout(maskEditorPreviewTimer);
        maskEditorPreviewTimer = null;
    }
    
    // Reset UI - use display property
    step1Preview.style.display = 'none';
    step2Preview.style.display = 'none';
    
    dropZone1.style.display = '';
    dropZone1.classList.remove('disabled');
    
    dropZone2.style.display = '';
    dropZone2.classList.add('disabled');
    
    autoMaskBtn.disabled = true;
    autoMaskBtn.style.display = '';
    autoMaskBtn.classList.remove('is-loading');
    autoMaskBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate mask automatically';
    autoMaskError.style.display = 'none';
    if (autoMaskModeHint) {
        autoMaskModeHint.style.display = 'none';
        autoMaskModeHint.textContent = '';
    }
    if (editMaskOverlay) {
        editMaskOverlay.style.display = 'none';
    }

    if (importViewEl) importViewEl.style.display = '';
    if (maskEditorViewEl) maskEditorViewEl.style.display = 'none';
    if (modalStepperEl) modalStepperEl.style.display = '';
    if (modalFooterEl) modalFooterEl.style.display = 'flex';
    if (modalTitleEl) modalTitleEl.textContent = 'Add New Effect';
    modalOverlay.classList.remove('editor-mode');
    updateMaskPreviewModeUI();
    
    updateModalUI();
    modalOverlay.classList.add('visible');
}

function closeModal() {
    closeMaskEditor(true);
    modalOverlay.classList.remove('visible');
}

function updateModalUI() {
    if (modalViewMode === 'editor') return;

    var stepItems = document.querySelectorAll('.step-item');
    for (var i = 0; i < stepItems.length; i++) {
        var stepNum = Number(stepItems[i].dataset.step);
        if (stepNum === 1 && step1Img) {
            stepItems[i].className = 'step-item done';
        } else if (stepNum === 2 && step2Ready) {
            stepItems[i].className = 'step-item done';
        } else if (stepNum === 1 && !step1Img) {
            stepItems[i].className = 'step-item active';
        } else if (stepNum === 2 && step1Img && !step2Ready) {
            stepItems[i].className = 'step-item active';
        } else {
            stepItems[i].className = 'step-item disabled';
        }
    }

    var modalOk = document.getElementById('modalOk');
    
    // Update hint
    if (!step1Img) {
        modalHint.textContent = 'Select the color image for the border effect.';
    } else if (!step2Ready) {
        modalHint.textContent = 'Upload mask image manually, or click auto-generate button.';
    } else {
        modalHint.textContent = 'Both images are ready. Click OK to import.';
    }

    // Update previews and drop-zones - use display for clean layout
    requestAnimationFrame(function() {
        if (step1Img) {
            step1Preview.style.display = '';
            dropZone1.style.display = 'none';
        } else {
            step1Preview.style.display = 'none';
            dropZone1.style.display = '';
        }

        if (step2Img) {
            step2Preview.style.display = '';
            dropZone2.style.display = 'none';
        } else {
            step2Preview.style.display = 'none';
            dropZone2.style.display = '';
        }
    });
    
    // Enable/disable step 2
    if (step1Img) {
        dropZone2.classList.remove('disabled');
        autoMaskBtn.disabled = false;
        updateAutoMaskButtonLabel();
    } else {
        dropZone2.classList.add('disabled');
        autoMaskBtn.disabled = true;
    }

    // OK button state
    modalOk.disabled = !step2Ready;
}


function finishImport(bwImg) {
    step2Preview.querySelector('img').src = bwImg.src;
    step2Preview.style.display = '';

    log('[IMPORT] Validating...');
    if (!autoMaskAnalysis) {
        autoMaskAnalysis = analyzeMaskRuleFromColorImage(step1Img);
    }
    var validationMode = step2GeneratedByAutoMask ? (autoMaskMode || autoMaskAnalysis.mode || 'gradient') : (autoMaskAnalysis.mode || 'gradient');
    var result = validateBorderPair(step1Img, bwImg, validationMode);
    if (!result.valid) {
        log('[IMPORT] FAILED: ' + result.errors.length + ' error(s)');
        showErrorModal(result.errors);
        return;
    }
    if (result.warnings && result.warnings.length) {
        var warningText = result.warnings.map(function (w) {
            return w && w.text ? w.text.replace(/<[^>]*>/g, '') : '';
        }).filter(Boolean).join(' | ');
        log('[IMPORT] WARNINGS: ' + warningText);
    }
    log('[IMPORT] Passed');

    log('[IMPORT] Processing...');
    var processed = processBorderFromTwo(step1Img, bwImg);
    customCount++;
    var id = 'custom_' + customCount;
    var label = 'Custom ' + customCount;
    var desc = step1Img.width + ' × ' + step1Img.height + ' (' + processed.filtered + 'px filtered)';
    var thumbUrl = step1Img.src;

    processedBorders[id] = processed;
    var item = addEffectItem(id, label, thumbUrl, desc, true);
    var badge = document.createElement('div');
    badge.className = 'custom-label';
    badge.textContent = label;
    item.insertBefore(badge, item.firstChild);

    // 更新效果按钮状态
    updateEffectButton();

    applyEffect(id);
    closeModal();
}

function cropImageToAspect(img, targetW, targetH) {
    return new Promise(function(resolve, reject) {
        try {
            var targetRatio = targetW / targetH;
            var srcRatio = img.width / img.height;

            var sx = 0;
            var sy = 0;
            var sw = img.width;
            var sh = img.height;

            if (srcRatio > targetRatio) {
                sw = Math.round(img.height * targetRatio);
                sx = Math.floor((img.width - sw) / 2);
            } else if (srcRatio < targetRatio) {
                sh = Math.round(img.width / targetRatio);
                sy = Math.floor((img.height - sh) / 2);
            }

            var cvs = document.createElement('canvas');
            cvs.width = sw;
            cvs.height = sh;
            var ctx = cvs.getContext('2d');
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

            var out = new Image();
            out.onload = function() { resolve(out); };
            out.onerror = function() { reject(new Error('Cropped image decode failed')); };
            out.src = cvs.toDataURL('image/png');
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * 处理用户选择的文件
 * Step 1：加载为图片，显示预览，进入 Step 2
 * Step 2：加载为图片后先显示预览，等待用户点击 OK 确认导入
 */
function handleFile(file, step) {
    if (step === 1) {
        loadImageFromFile(file).then(function (img) {
            return cropImageToAspect(img, 4, 3).then(function(croppedImg) {
                step1Img = croppedImg;
                if (croppedImg.width !== img.width || croppedImg.height !== img.height) {
                    log('[UPLOAD] Color image cropped to 4:3 from ' + img.width + 'x' + img.height + ' to ' + croppedImg.width + 'x' + croppedImg.height);
                }
            });
        }).then(function () {
            autoMaskAnalysis = null;
            step2GeneratedByAutoMask = false;
            step1Preview.querySelector('img').src = step1Img.src;
            autoMaskBtn.style.display = '';
            autoMaskBtn.classList.remove('is-loading');
            if (autoMaskModeHint) {
                autoMaskModeHint.style.display = 'none';
                autoMaskModeHint.textContent = '';
            }
            if (editMaskOverlay) {
                editMaskOverlay.style.display = 'none';
            }
            
            // Use display for clean layout
            requestAnimationFrame(function() {
                step1Preview.style.display = '';
                dropZone1.style.display = 'none';
                
                // Reset step 2
                step2Ready = false;
                step2Img = null;
                step2Preview.style.display = 'none';
                dropZone2.style.display = '';
                
                updateModalUI();
                log('[UPLOAD] Color image loaded: ' + step1Img.width + 'x' + step1Img.height);
            });
        }).catch(function () {
            alert('Failed to load image.');
        });
    } else {
        loadImageFromFile(file).then(function (bwImg) {
            step2Img = bwImg;
            step2Ready = true;
            step2GeneratedByAutoMask = false;
            step2Preview.querySelector('img').src = bwImg.src;
            if (autoMaskModeHint) {
                autoMaskModeHint.style.display = 'none';
                autoMaskModeHint.textContent = '';
            }
            if (editMaskOverlay) {
                editMaskOverlay.style.display = 'none';
            }
            
            // Use display for clean layout
            requestAnimationFrame(function() {
                step2Preview.style.display = '';
                dropZone2.style.display = 'none';
                
                updateModalUI();
                log('[UPLOAD] Mask image loaded: ' + bwImg.width + 'x' + bwImg.height);
            });
        }).catch(function () {
            alert('Failed to load image.');
        });
    }
}
