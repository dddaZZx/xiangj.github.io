'use strict';

// ================================================================
//  通用工具、缓存、图片加载与预览照片管理
// ================================================================
function log(msg) {
    if (!debugLog) return;
    var t = new Date();
    var ts = String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0');
    debugLog.value += '[' + ts + '] ' + msg + '\n';
    debugLog.scrollTop = debugLog.scrollHeight;
}

function formatRgb(color) {
    return '(' + color.r + ',' + color.g + ',' + color.b + ')';
}

function getCacheKey() {
    return currentEffect + '_' + currentPhotoIndex;
}

function updatePhotoCounter() {
    var counterEl = document.getElementById('photoCounter');
    if (!counterEl) return;
    if (photoList.length <= 1) {
        counterEl.classList.remove('visible');
        counterEl.style.display = 'none';
        return;
    }

    counterEl.style.display = 'inline-flex';
    counterEl.textContent = (currentPhotoIndex + 1) + '/' + photoList.length;
}

function flashPhotoCounter() {
    var counterEl = document.getElementById('photoCounter');
    if (!counterEl || photoList.length <= 1) return;

    updatePhotoCounter();
    counterEl.classList.add('visible');

    if (photoCounterTimer) {
        clearTimeout(photoCounterTimer);
    }

    photoCounterTimer = setTimeout(function () {
        counterEl.classList.remove('visible');
        photoCounterTimer = null;
    }, 900);
}

function showPhotoNotice(message, isError) {
    var noticeEl = document.getElementById('photoNotice');
    if (!noticeEl || !message) return;

    if (photoNoticeTimer) {
        clearTimeout(photoNoticeTimer);
        photoNoticeTimer = null;
    }

    if (photoNoticeHideTimer) {
        clearTimeout(photoNoticeHideTimer);
        photoNoticeHideTimer = null;
    }

    if (photoNoticeRaf) {
        cancelAnimationFrame(photoNoticeRaf);
        photoNoticeRaf = null;
    }

    noticeEl.classList.toggle('error', !!isError);
    noticeEl.textContent = message;
    noticeEl.style.display = 'inline-flex';
    noticeEl.classList.remove('visible');

    photoNoticeRaf = requestAnimationFrame(function () {
        noticeEl.classList.add('visible');
        photoNoticeRaf = null;
    });

    photoNoticeTimer = setTimeout(function () {
        noticeEl.classList.remove('visible');
        noticeEl.classList.remove('error');
        photoNoticeHideTimer = setTimeout(function () {
            noticeEl.style.display = 'none';
            photoNoticeHideTimer = null;
        }, 220);
        photoNoticeTimer = null;
    }, 2200);
}

function getCacheKeyByEffect(effectId, photoIndex) {
    return effectId + '_' + photoIndex;
}

function getCacheBudgetBytes() {
    if (navigator && typeof navigator.deviceMemory === 'number') {
        if (navigator.deviceMemory >= 8) return 512 * 1024 * 1024;
        if (navigator.deviceMemory >= 4) return 384 * 1024 * 1024;
        return 256 * 1024 * 1024;
    }
    return 384 * 1024 * 1024;
}

function estimateCanvasBytes(cvs) {
    if (!cvs || !cvs.width || !cvs.height) return 0;
    return cvs.width * cvs.height * 4;
}

function createPreviewCacheCanvas(sourceCanvas) {
    if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) return sourceCanvas;

    var sourceWidth = sourceCanvas.width;
    var sourceHeight = sourceCanvas.height;
    var longestSide = Math.max(sourceWidth, sourceHeight);

    if (longestSide <= PREVIEW_CACHE_MAX_SIDE) {
        return sourceCanvas;
    }

    var scale = PREVIEW_CACHE_MAX_SIDE / longestSide;
    var targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    var targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    var cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = targetWidth;
    cacheCanvas.height = targetHeight;
    cacheCanvas.getContext('2d').drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return cacheCanvas;
}

function rememberRenderedCache(effectId, photoIndex, cvs) {
    var key = getCacheKeyByEffect(effectId, photoIndex);
    var bytes = estimateCanvasBytes(cvs);
    var prevMeta = renderedCacheMeta[key];

    if (prevMeta && effectCacheGroups[prevMeta.effectId]) {
        effectCacheGroups[prevMeta.effectId].bytes -= prevMeta.bytes;
        delete effectCacheGroups[prevMeta.effectId].keys[key];
    }

    renderedCache[key] = cvs;
    renderedCacheMeta[key] = {
        effectId: effectId,
        photoIndex: photoIndex,
        bytes: bytes,
        usedAt: ++cacheClock
    };

    if (!effectCacheGroups[effectId]) {
        effectCacheGroups[effectId] = {
            keys: {},
            bytes: 0,
            usedAt: 0
        };
    }

    effectCacheGroups[effectId].keys[key] = true;
    effectCacheGroups[effectId].bytes += bytes;
    effectCacheGroups[effectId].usedAt = cacheClock;
}

function touchRenderedCache(key) {
    var meta = renderedCacheMeta[key];
    if (!meta) return;
    meta.usedAt = ++cacheClock;
    if (effectCacheGroups[meta.effectId]) {
        effectCacheGroups[meta.effectId].usedAt = cacheClock;
    }
}

function evictEffectCacheGroup(effectId) {
    var group = effectCacheGroups[effectId];
    if (!group) return;

    Object.keys(group.keys).forEach(function (key) {
        delete renderedCache[key];
        delete renderedCacheMeta[key];
    });

    delete effectCacheGroups[effectId];
    log('[CACHE] Evicted effect group: ' + effectId);
}

function getTotalCacheBytes() {
    var total = 0;
    Object.keys(effectCacheGroups).forEach(function (effectId) {
        total += effectCacheGroups[effectId].bytes;
    });
    return total;
}

function enforceCacheBudget(protectedEffectId) {
    var budgetBytes = getCacheBudgetBytes();
    var totalBytes = getTotalCacheBytes();

    if (totalBytes <= budgetBytes) return;

    var groupIds = Object.keys(effectCacheGroups).sort(function (a, b) {
        return effectCacheGroups[a].usedAt - effectCacheGroups[b].usedAt;
    });

    for (var i = 0; i < groupIds.length && totalBytes > budgetBytes; i++) {
        var effectId = groupIds[i];
        if (effectId === protectedEffectId) continue;

        totalBytes -= effectCacheGroups[effectId].bytes;
        evictEffectCacheGroup(effectId);
    }

    if (totalBytes > budgetBytes) {
        log('[CACHE] Budget still exceeded by active group: ' + Math.round(totalBytes / (1024 * 1024)) + 'MB / ' + Math.round(budgetBytes / (1024 * 1024)) + 'MB');
    }
}

function compressAndCrop(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var maxWidth = 1920;
                var maxHeight = 1440;

                var width = img.width;
                var height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    var scale = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.floor(width * scale);
                    height = Math.floor(height * scale);
                }

                var targetRatio = 4 / 3;
                var srcRatio = img.width / img.height;

                var cropX, cropY, cropWidth, cropHeight;

                if (srcRatio > targetRatio) {
                    cropHeight = img.height;
                    cropWidth = Math.floor(cropHeight * targetRatio);
                    cropX = Math.floor((img.width - cropWidth) / 2);
                    cropY = 0;
                } else {
                    cropWidth = img.width;
                    cropHeight = Math.floor(cropWidth / targetRatio);
                    cropX = 0;
                    cropY = Math.floor((img.height - cropHeight) / 2);
                }

                var canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = Math.floor(width / targetRatio);

                var ctx2 = canvas.getContext('2d');
                ctx2.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

                var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl);
            };
            img.onerror = function() { reject(new Error('Image decode failed')); };
            img.src = e.target.result;
        };
        reader.onerror = function() { reject(new Error('File read failed')); };
        reader.readAsDataURL(file);
    });
}

function addUserPhoto(file, options) {
    options = options || {};
    var shouldRender = options.shouldRender !== false;
    var shouldFocus = options.shouldFocus !== false;
    var userPhotoCount = photoList.length - 1;
    if (userPhotoCount >= MAX_USER_PHOTOS) {
        log('[PHOTO] Upload limit reached');
        showPhotoNotice('Preview limit reached. No more photos were added.', true);
        return Promise.reject(new Error('Upload limit reached'));
    }

    log('[PHOTO] Processing: ' + file.name);

    return compressAndCrop(file).then(function(dataUrl) {
        var photoObj = { type: 'user', src: dataUrl, img: null };

        photoList.push(photoObj);
        currentPhotoIndex = photoList.length - 1;
        log('[PHOTO] Added new photo, total: ' + photoList.length);

        return new Promise(function(resolve) {
            var newImg = new Image();
            newImg.onload = function() {
                photoObj.img = newImg;
                updatePhotoSwitchButtons();
                updateAddPhotoButton();
                if (shouldFocus) {
                    currentPhotoIndex = photoList.length - 1;
                }
                updatePhotoCounter();
                if (shouldRender) {
                    if (currentEffect === 'none') {
                        render();
                    } else {
                        renderCurrentView(false);
                    }
                }
                resolve();
            };
            newImg.src = dataUrl;
        });
    });
}

function addUserPhotos(files) {
    var fileList = Array.prototype.slice.call(files || []);
    if (fileList.length === 0) return Promise.resolve({ added: 0, skipped: 0 });

    var startedCount = photoList.length - 1;
    var added = 0;
    var skipped = 0;

    function processNext(index) {
        if (index >= fileList.length) {
            return Promise.resolve();
        }

        if ((photoList.length - 1) >= MAX_USER_PHOTOS) {
            skipped += (fileList.length - index);
            return Promise.resolve();
        }

        return addUserPhoto(fileList[index], {
            shouldRender: false,
            shouldFocus: false
        }).then(function () {
            added++;
            return processNext(index + 1);
        }).catch(function (err) {
            skipped++;
            log('[PHOTO] Upload failed: ' + err.message);
            return processNext(index + 1);
        });
    }

    return processNext(0).then(function () {
        if (added > 0) {
            currentPhotoIndex = photoList.length - 1;
            updatePhotoSwitchButtons();
            updateAddPhotoButton();
            updatePhotoCounter();
            if (currentEffect === 'none') {
                render();
            } else {
                renderCurrentView(false);
            }
        }

        if (skipped > 0) {
            log('[PHOTO] Batch import skipped ' + skipped + ' file(s) due to limit.');
            if (added > 0) {
                showPhotoNotice('Imported ' + added + ' photo(s), skipped ' + skipped + ' over the limit.', true);
            } else {
                showPhotoNotice('Preview limit reached. ' + skipped + ' photo(s) were skipped.', true);
            }
        } else if (added > 1) {
            showPhotoNotice('Imported ' + added + ' photos.', false);
        }

        return {
            added: added,
            skipped: skipped,
            startedCount: startedCount
        };
    });
}

function switchPhoto(direction) {
    if (photoList.length <= 1) return;

    if (direction === 'left') {
        currentPhotoIndex = (currentPhotoIndex - 1 + photoList.length) % photoList.length;
    } else {
        currentPhotoIndex = (currentPhotoIndex + 1) % photoList.length;
    }

    log('[PHOTO] Switched to index ' + currentPhotoIndex);
    flashPhotoCounter();

    var photo = photoList[currentPhotoIndex];
    if (!photo.img) {
        if (isLoadingPhoto) return;
        isLoadingPhoto = true;
        var img = new Image();
        img.onload = function() {
            photo.img = img;
            isLoadingPhoto = false;
            render();
        };
        img.src = photo.src;
    } else {
        render();
    }
}

function updatePhotoSwitchButtons() {
    var btnPrev = document.getElementById('btnPrevPhoto');
    var btnNext = document.getElementById('btnNextPhoto');
    updatePhotoCounter();

    if (photoList.length > 1) {
        btnPrev.style.display = 'flex';
        btnNext.style.display = 'flex';
    } else {
        btnPrev.style.display = 'none';
        btnNext.style.display = 'none';
    }
}

function updateAddPhotoButton() {
    var btnAdd = document.getElementById('btnAddPhoto');
    var userPhotoCount = photoList.length - 1;

    if (userPhotoCount >= MAX_USER_PHOTOS) {
        btnAdd.disabled = true;
    } else {
        btnAdd.disabled = false;
    }
}

function updateEffectButton() {
    var addBtn = document.querySelector('.add-effect-btn');
    if (!addBtn) return;

    var effectCount = document.querySelectorAll('.effect-item[data-border]').length;

    if (effectCount >= MAX_EFFECTS) {
        addBtn.disabled = true;
        addBtn.style.opacity = '0.4';
        addBtn.style.cursor = 'not-allowed';
    } else {
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
        addBtn.style.cursor = 'pointer';
    }
}

function loadImage(filename) {
    if (imageCache[filename]) return Promise.resolve(imageCache[filename]);
    return fetch(RES_DIR + filename)
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.blob();
        })
        .then(function (blob) {
            var url = URL.createObjectURL(blob);
            return new Promise(function (resolve, reject) {
                var img = new Image();
                img.onload = function () {
                    imageCache[filename] = img;
                    resolve(img);
                };
                img.onerror = function () {
                    URL.revokeObjectURL(url);
                    reject(new Error('Load failed: ' + filename));
                };
                img.src = url;
            });
        });
}

function loadImageFromFile(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { reject(new Error('Decode failed')); };
            img.src = e.target.result;
        };
        reader.onerror = function () { reject(new Error('Read failed')); };
        reader.readAsDataURL(file);
    });
}

function forceGpuSync(cvs) {
    try {
        cvs.getContext('2d').getImageData(0, 0, 1, 1);
    } catch (e) {
        // ignore
    }
}

function showAutoMaskError(message) {
    autoMaskError.textContent = message;
    autoMaskError.classList.add('visible');
    setTimeout(function() {
        autoMaskError.classList.remove('visible');
    }, 3000);
}

function rgbDistance(r1, g1, b1, r2, g2, b2) {
    var dr = r1 - r2;
    var dg = g1 - g2;
    var db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}
