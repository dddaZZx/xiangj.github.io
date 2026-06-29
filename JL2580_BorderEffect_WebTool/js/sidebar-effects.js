'use strict';

// ================================================================
//  侧边栏效果列表构建与边框自动探测
// ================================================================
function addEffectItem(id, label, thumbUrl, desc, compact) {
    var item = document.createElement('div');
    item.className = 'effect-item' + (compact ? ' compact-effect' : '');
    item.dataset.border = id;
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    var safeSrc = thumbUrl || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    item.innerHTML =
        '<img class="effect-thumb" src="' + safeSrc + '" alt="' + label + '">' +
        '<div class="effect-meta">' +
            '<div class="effect-name">' + label + '</div>' +
            '<div class="effect-desc">' + desc + '</div>' +
        '</div>';
    if (effectItemsContainer) {
        effectItemsContainer.appendChild(item);
    } else {
        effectListEl.appendChild(item);
    }
    return item;
}

function autoDetectBorders(callback) {
    var detectedFiles = [];
    var index = 1;
    var consecutiveFailures = 0;

    log('[INIT] Starting auto-detection of border files...');

    function tryLoadNext() {
        if (index > MAX_BORDER_ATTEMPTS || consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
            log('[INIT] Auto-detection complete. Found ' + detectedFiles.length + ' border file(s).');
            callback(detectedFiles);
            return;
        }

        var filename = 'border_' + index + '.jpg';

        loadImage(filename).then(function(img) {
            consecutiveFailures = 0;
            detectedFiles.push(filename);
            log('[INIT] Detected: ' + filename + ' (' + img.width + 'x' + img.height + ')');
            index++;
            tryLoadNext();
        }).catch(function() {
            consecutiveFailures++;
            log('[INIT] Not found: ' + filename + ' (failure ' + consecutiveFailures + '/' + CONSECUTIVE_FAILURE_THRESHOLD + ')');
            index++;
            tryLoadNext();
        });
    }

    tryLoadNext();
}

function buildUI() {
    var noneItem = document.createElement('div');
    noneItem.className = 'effect-item active compact-effect';
    noneItem.dataset.border = 'none';
    noneItem.setAttribute('tabindex', '0');
    noneItem.setAttribute('role', 'button');
    noneItem.innerHTML =
        '<div class="no-effect-icon"><i class="fa-solid fa-ban"></i></div>' +
        '<div class="effect-meta">' +
            '<div class="effect-name">No Effect</div>' +
            '<div class="effect-desc">Original photo</div>' +
        '</div>';
    effectListEl.appendChild(noneItem);

    effectItemsContainer = document.createElement('div');
    effectItemsContainer.className = 'effect-items-group';
    effectListEl.appendChild(effectItemsContainer);

    autoDetectBorders(function(detectedFiles) {
        if (detectedFiles.length === 0) {
            log('[INIT] No border files detected.');
        } else {
            detectedFiles.forEach(function (file) {
                var index = parseInt(file.replace('border_', '').replace('.jpg', ''));
                var label = 'Border ' + index;
                var placeholderItem = addEffectItem(file, label, '', 'Loading...', true);

                loadImage(file).then(function (img) {
                    var halfH = Math.floor(img.height / 2);

                    var tc = document.createElement('canvas');
                    tc.width = img.width; tc.height = halfH;
                    tc.getContext('2d').drawImage(img, 0, 0, img.width, halfH, 0, 0, img.width, halfH);
                    var thumbUrl = tc.toDataURL();

                    placeholderItem.querySelector('.effect-thumb').src = thumbUrl;
                    placeholderItem.querySelector('.effect-thumb').alt = label;
                    placeholderItem.querySelector('.effect-desc').textContent = img.width + ' × ' + halfH;

                    log('[INIT] Processing: ' + file);
                    var result = processBorder(img);
                    processedBorders[file] = result;
                }).catch(function (err) {
                    log('[INIT] ERROR: ' + file + ' - ' + err.message);
                    placeholderItem.querySelector('.effect-desc').textContent = 'Load failed';
                });
            });
        }
    });

    var addBtn = document.createElement('button');
    addBtn.className = 'add-effect-btn';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add New Effect';
    effectListEl.appendChild(addBtn);
    addBtn.addEventListener('click', openModal);
}
