'use strict';

// ================================================================
//  入口与全局状态（实现逻辑已拆分到多个模块）
// ================================================================

// ====== 配置 ======
var RES_DIR = 'Resources/';
var TOLERANCE = 2;
var DEFAULT_PHOTO = '1.jpg';
var MAX_BORDER_ATTEMPTS = 99;
var CONSECUTIVE_FAILURE_THRESHOLD = 3;

// ====== DOM 引用 ======
var effectListEl = document.getElementById('effectList');
var previewArea = document.getElementById('previewArea');
var canvas = document.getElementById('previewCanvas');
var ctx = canvas.getContext('2d');
var debugLog = document.getElementById('debugLog');
var loadingOverlay = document.getElementById('previewLoadingOverlay');
var loadingOverlayTimer = null;
var loadingOverlayMaxTimer = null;
var loadingOverlayMinDuration = 1000;
var loadingOverlayMaxDuration = 3000;

// ====== 运行时状态 ======
var currentEffect = 'none';
var mainImg = null;
var customCount = 0;
var effectItemsContainer = null;

// ====== 预览图管理 ======
var photoList = [
    { type: 'default', src: RES_DIR + DEFAULT_PHOTO, img: null }
];
var currentPhotoIndex = 0;
var MAX_USER_PHOTOS = 10;
var MAX_EFFECTS = 20;
var PREVIEW_CACHE_MAX_SIDE = 1600;
var isLoadingPhoto = false;

// ====== 缓存 ======
var imageCache = {};
var processedBorders = {};
var renderedCache = {};
var renderedCacheMeta = {};
var effectCacheGroups = {};
var cacheClock = 0;
var previewTransitionTimer = null;
var photoCounterTimer = null;
var photoNoticeTimer = null;
var photoNoticeRaf = null;
var photoNoticeHideTimer = null;

// ====== 事件绑定 ======
effectListEl.addEventListener('click', function (e) {
    var item = e.target.closest('.effect-item');
    if (item) applyEffect(item.dataset.border);
});

effectListEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
        var item = e.target.closest('.effect-item');
        if (item) {
            e.preventDefault();
            applyEffect(item.dataset.border);
        }
    }
});

window.addEventListener('resize', fitCanvas);

var btnAddPhoto = document.getElementById('btnAddPhoto');
if (btnAddPhoto) {
    btnAddPhoto.addEventListener('click', function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = function(e) {
            var files = e.target.files;
            if (files && files.length) {
                addUserPhotos(files).catch(function(err) {
                    log('[PHOTO] Upload failed: ' + err.message);
                });
            }
        };
        input.click();
    });
}

var btnPrevPhoto = document.getElementById('btnPrevPhoto');
if (btnPrevPhoto) {
    btnPrevPhoto.addEventListener('click', function() {
        switchPhoto('left');
    });
}

var btnNextPhoto = document.getElementById('btnNextPhoto');
if (btnNextPhoto) {
    btnNextPhoto.addEventListener('click', function() {
        switchPhoto('right');
    });
}

// ====== 启动 ======
log('[INIT] Starting...');
initModal();
buildUI();

loadImage(DEFAULT_PHOTO).then(function (img) {
    photoList[0].img = img;
    mainImg = img;
    log('[INIT] Photo: ' + img.width + 'x' + img.height);
    updatePhotoCounter();
    if (photoCounterTimer) {
        clearTimeout(photoCounterTimer);
        photoCounterTimer = null;
    }
    applyEffect('none');

    updatePhotoSwitchButtons();
    updateAddPhotoButton();
    updateExportButton();
}).catch(function (err) {
    log('[INIT] ERROR: ' + err.message);
});