/**
 * ================================================================
 * JL2058 Border Effect WebTool - Main Logic
 * ================================================================
 *
 * 【核心原理】
 * 边框效果的本质是：用一张灰度图作为蒙版，
 * 控制颜色图以不同透明度叠加到原图上。
 *
 *   灰度 255 = 完全不透明 = 完全显示边框颜色
 *   灰度 0   = 完全透明   = 完全显示原图
 *   灰度 128 = 半透明     = 原图和边框各混合 50%
 *
 * 【两种素材格式】
 * 1. 预设格式（border_x.jpg）：
 *    - 单张图片，上半部分是彩色边框，下半部分是灰度蒙版
 *    - 背景色为 #1c1c1c (RGB 28,28,28)，需要过滤掉
 *    - 过滤方式：检测颜色图中 #1c1c1c 的像素，将蒙版对应位置置为 0
 *
 * 2. 用户导入格式（两张独立图片）：
 *    - 第一张：颜色图（包含边框的彩色元素）
 *    - 第二张：灰度蒙版图
 *    - 需要自动检测颜色图是否含 #1c1c1c 背景：
 *      a. 含 #1c1c1c → 当作传统边框图，执行过滤
 *      b. 不含 #1c1c1c → 当作全画面素材，完全信任蒙版
 *
 * 【渲染流程】
 * 1. 在离屏 canvas 上预处理边框（只执行一次，结果缓存）
 * 2. 每次切换效果时，在 render() 中：
 *    a. 画原图到主 canvas
 *    b. 将缓存的 colorCvs 和 maskCvs 缩放到原图尺寸
 *    c. 逐像素混合：output = photo × (1-alpha) + color × alpha
 *    d. 写回主 canvas
 *
 * 【已知的 Canvas GPU 同步问题】
 * 在某些浏览器/显卡组合下，离屏 canvas 写入后如果立刻被
 * drawImage 读取，可能会拿到未完成的 GPU 数据，导致 alpha
 * 通道异常。解决方法是在写入后立即调用一次 getImageData
 * 强制 GPU→CPU 同步。见 forceGpuSync() 函数。
 *
 * 【为什么不用 globalCompositeOperation = 'destination-in'】
 * 该合成模式在理论上可以用 mask 的 alpha 裁切 color，
 * 但实测中在某些浏览器下表现不一致（效果"隐形"）。
 * 手动逐像素混合虽然性能略低，但结果 100% 可控可靠。
 * ================================================================
 */
(function () {
    'use strict';

    // ====== 配置 ======
    var RES_DIR      = 'Resources/';   // 素材目录
    var TOLERANCE    = 2;             // #1c1c1c 匹配容差（JPEG 有损压缩后像素值会偏移）
    var DEFAULT_PHOTO = '1.jpg';      // 默认原图文件名
    var MAX_BORDER_ATTEMPTS = 99;     // 自动检测边框文件的最大尝试次数
    var CONSECUTIVE_FAILURE_THRESHOLD = 3; // 连续失败阈值

    // ====== DOM 引用 ======
    var effectListEl = document.getElementById('effectList');
    var previewArea  = document.getElementById('previewArea');
    var canvas       = document.getElementById('previewCanvas');
    var ctx          = canvas.getContext('2d');
    var debugLog     = document.getElementById('debugLog');

    // ====== 运行时状态 ======
    var currentEffect = 'none';       // 当前选中的效果 ID（'none' 或文件名或 'custom_N'）
    var mainImg       = null;         // 当前原图 Image 对象
    var customCount   = 0;            // 用户导入效果的自增编号
    var effectItemsContainer = null;  // 预设 + 自定义效果项的容器
    
    // ====== 预览图管理 ======
    var photoList = [
        { type: 'default', src: RES_DIR + DEFAULT_PHOTO, img: null }
    ];
    var currentPhotoIndex = 0;        // 当前显示的预览图索引
    var MAX_USER_PHOTOS = 10;         // 用户上传照片上限
    var MAX_EFFECTS = 20;             // 效果按钮上限
    var isLoadingPhoto = false;       // 照片加载锁，防止竞态

    // ====== 缓存 ======
    // imageCache: { 文件名: Image } —— 避免重复加载同一张图
    var imageCache = {};
    // processedBorders: { 效果ID: { colorCvs: Canvas, maskCvs: Canvas, filtered: Number } }
    // 预处理结果在启动时计算一次，切换效果时直接复用
    var processedBorders = {};
    // renderedCache: { 效果ID: Canvas } —— 记录已经合成好的最终预览结果，避免重复像素混合
    var renderedCache = {};
    var previewTransitionTimer = null;

    // ================================================================
    //  调试日志
    // ================================================================
    function log(msg) {
        if (!debugLog) return;
        var t = new Date();
        var ts = String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0');
        debugLog.value += '[' + ts + '] ' + msg + '\n';
        debugLog.scrollTop = debugLog.scrollHeight;
    }

    // ================================================================
    //  获取缓存键（效果 + 照片索引）
    // ================================================================
    function getCacheKey() {
        return currentEffect + '_' + currentPhotoIndex;
    }

    // ================================================================
    //  图片压缩与裁切（4:3）
    // ================================================================
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
                    
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
                    
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

    // ================================================================
    //  添加用户上传的照片
    // ================================================================
    function addUserPhoto(file) {
        var userPhotoCount = photoList.length - 1;
        if (userPhotoCount >= MAX_USER_PHOTOS) {
            log('[PHOTO] Upload limit reached');
            return Promise.reject(new Error('Upload limit reached'));
        }
        
        log('[PHOTO] Processing: ' + file.name);
        
        return compressAndCrop(file).then(function(dataUrl) {
            var photoObj = { type: 'user', src: dataUrl, img: null };
            
            // 判断当前是否有选中效果
            if (currentEffect === 'none') {
                // 无效果：替换索引0的图
                photoList[0] = photoObj;
                currentPhotoIndex = 0;
                log('[PHOTO] Replaced default photo');
            } else {
                // 有效果：追加新图
                photoList.push(photoObj);
                currentPhotoIndex = photoList.length - 1;
                log('[PHOTO] Added new photo, total: ' + photoList.length);
            }
            
            return new Promise(function(resolve) {
                var newImg = new Image();
                newImg.onload = function() {
                    photoObj.img = newImg;
                    updatePhotoSwitchButtons();
                    updateAddPhotoButton();
                    render();
                    resolve();
                };
                newImg.src = dataUrl;
            });
        });
    }

    // ================================================================
    //  切换预览图（左右循环）
    // ================================================================
    function switchPhoto(direction) {
        if (photoList.length <= 1) return;
        
        if (direction === 'left') {
            currentPhotoIndex = (currentPhotoIndex - 1 + photoList.length) % photoList.length;
        } else {
            currentPhotoIndex = (currentPhotoIndex + 1) % photoList.length;
        }
        
        log('[PHOTO] Switched to index ' + currentPhotoIndex);
        
        // 清除当前效果下其他照片的缓存
        Object.keys(renderedCache).forEach(function(key) {
            if (key.startsWith(currentEffect + '_') && key !== getCacheKey()) {
                delete renderedCache[key];
            }
        });
        
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

    // ================================================================
    //  更新照片切换按钮的显示状态
    // ================================================================
    function updatePhotoSwitchButtons() {
        var btnPrev = document.getElementById('btnPrevPhoto');
        var btnNext = document.getElementById('btnNextPhoto');
        
        if (photoList.length > 1) {
            btnPrev.style.display = 'flex';
            btnNext.style.display = 'flex';
        } else {
            btnPrev.style.display = 'none';
            btnNext.style.display = 'none';
        }
    }

    // ================================================================
    //  更新上传按钮的状态
    // ================================================================
    function updateAddPhotoButton() {
        var btnAdd = document.getElementById('btnAddPhoto');
        var userPhotoCount = photoList.length - 1;
        
        if (userPhotoCount >= MAX_USER_PHOTOS) {
            btnAdd.disabled = true;
        } else {
            btnAdd.disabled = false;
        }
    }

    // ================================================================
    //  更新效果按钮的状态
    // ================================================================
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

    // ================================================================
    //  图片加载
    //  使用 fetch → blob → createObjectURL 方式，
    //  生成的 Blob URL 是同源的，不会污染 Canvas，
    //  因此后续的 getImageData() 不会抛出 SecurityError。
    //  这比直接 <img src="..."> 或加 crossOrigin 属性更可靠。
    // ================================================================
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

    /**
     * 从用户选择的 File 对象加载图片
     * 使用 FileReader 读为 DataURL，不涉及跨域问题
     */
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

    // ================================================================
    //  GPU 同步修复
    //
    //  问题：在某些浏览器/显卡下，往离屏 canvas 写入像素后，
    //  如果立刻用 drawImage 读取并缩放，可能会拿到错误的 alpha 数据。
    //  原因是 canvas 内容还在 GPU 显存中，尚未同步回 CPU。
    //
    //  解决：写入后立即调用一次 getImageData（即使不使用返回值），
    //  这会强制浏览器将 GPU 数据同步回 CPU 内存。
    //  后续的 drawImage 就能读到正确数据了。
    //
    //  这个操作有微小性能开销，但只在预处理时执行一次，
    //  不影响渲染时的性能。
    // ================================================================
    function forceGpuSync(cvs) {
        try {
            cvs.getContext('2d').getImageData(0, 0, 1, 1);
        } catch (e) {
            // 如果因为任何原因失败，不影响主流程
        }
    }

    // ================================================================
    //  显示自动生成 mask 的错误信息
    // ================================================================
    function showAutoMaskError(message) {
        autoMaskError.textContent = message;
        autoMaskError.classList.add('visible');
        setTimeout(function() {
            autoMaskError.classList.remove('visible');
        }, 3000);
    }

    // ================================================================
    //  自动生成 MASK（从 color 图）
    //  原理：转灰度 → 反相
    // ================================================================
    function generateMaskAutomatically() {
        if (!step1Img) {
            showAutoMaskError('Please upload a color image first.');
            return;
        }

        // Show loading state
        autoMaskBtn.disabled = true;
        autoMaskBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
        autoMaskError.style.display = 'none';

        // Use setTimeout to allow UI update before heavy processing
        setTimeout(function () {
            try {
                var canvas = document.createElement('canvas');
                canvas.width = step1Img.width;
                canvas.height = step1Img.height;
                var ctx = canvas.getContext('2d');

                // Draw color image
                ctx.drawImage(step1Img, 0, 0);

                // Get pixel data
                var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                var data = imageData.data;

                // Convert to grayscale and invert
                for (var i = 0; i < data.length; i += 4) {
                    var r = data[i];
                    var g = data[i + 1];
                    var b = data[i + 2];
                    
                    // Calculate luminance (standard formula)
                    var gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    // Invert
                    var inverted = 255 - gray;
                    
                    // Set all channels to inverted value
                    data[i] = inverted;     // R
                    data[i + 1] = inverted; // G
                    data[i + 2] = inverted; // B
                    // Alpha stays 255
                }

                // Put processed data back
                ctx.putImageData(imageData, 0, 0);

                // Force GPU sync
                forceGpuSync(canvas);

                // Export as DataURL
                var maskDataURL = canvas.toDataURL('image/jpeg', 0.95);

                // Create new Image object
                var maskImg = new Image();
                maskImg.onload = function () {
                    // Set as step2 image
                    step2Img = maskImg;
                    step2Ready = true;
                    
                    // Update preview immediately
                    step2Preview.querySelector('img').src = maskDataURL;
                    
                    // Force display update before calling updateModalUI
                    requestAnimationFrame(function() {
                        step2Preview.style.display = '';
                        dropZone2.style.display = 'none';
                        
                        // Reset button state
                        autoMaskBtn.disabled = false;
                        autoMaskBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate mask automatically';
                        
                        // Update UI (stepper, hint, OK button)
                        updateModalUI();
                    });
                    
                    log('[AUTO-MASK] Generated successfully: ' + canvas.width + 'x' + canvas.height);
                };
                maskImg.src = maskDataURL;

            } catch (error) {
                console.error('[AUTO-MASK] Error:', error);
                showAutoMaskError('Failed to generate mask. Please upload manually.');
                
                // Reset button state
                autoMaskBtn.disabled = false;
                autoMaskBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate mask automatically';
            }
        }, 50);
    }

    // ================================================================
    //  校验用户导入的两张图片是否满足边框素材要求
    //
    //  检查项：
    //  1. 尺寸必须完全一致
    //  2. 颜色图不能是灰度图（通道间应有差异）
    //  3. 蒙版图必须是灰度图（通道间应一致）
    //  4. 蒙版图需要有灰度层次（min-max 差值不能太小）
    //  5. 蒙版图需要有形状信息（标准差不能太小）
    //  6. 颜色图的 #1c1c1c 背景不能占比过高（仅对传统格式有意义）
    // ================================================================
    function validateBorderPair(colorImg, bwImg) {
        var errors = [];

        // 检查 1：尺寸一致
        if (colorImg.width !== bwImg.width || colorImg.height !== bwImg.height) {
            errors.push({
                icon: 'fa-ruler-combined',
                text: 'Image dimensions do not match.' +
                      ' Color image is <code>' + colorImg.width + '\u00d7' + colorImg.height + '</code>,' +
                      ' mask image is <code>' + bwImg.width + '\u00d7' + bwImg.height + '</code>.',
                expected: 'Both images must have identical width and height (e.g. 640\u00d7480).'
            });
        }

        // 读取颜色图像素
        var cCvs = document.createElement('canvas');
        cCvs.width = colorImg.width; cCvs.height = colorImg.height;
        var cCtx = cCvs.getContext('2d');
        cCtx.drawImage(colorImg, 0, 0);
        var cData = cCtx.getImageData(0, 0, colorImg.width, colorImg.height).data;

        // 检查 2：颜色图不应是灰度图
        // 采样像素，计算 RGB 三通道最大值与最小值的平均偏差
        // 如果偏差 < 3，说明三通道几乎相同，是灰度图
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
        if (avgColorVariance < 3) {
            errors.push({
                icon: 'fa-palette',
                text: 'The "color image" appears to be grayscale (avg channel deviation: <code>' + avgColorVariance.toFixed(1) + '</code>).',
                expected: 'Color image should have visible color (R/G/B channels differ). Did you select the mask as color?'
            });
        }

        // 读取蒙版图像素
        var mCvs = document.createElement('canvas');
        mCvs.width = bwImg.width; mCvs.height = bwImg.height;
        var mCtx = mCvs.getContext('2d');
        mCtx.drawImage(bwImg, 0, 0);
        var mData = mCtx.getImageData(0, 0, bwImg.width, bwImg.height).data;

        // 检查 3：蒙版图应该是灰度图（通道偏差应很小）
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

        // 检查 4：蒙版图需要有灰度层次
        // 用 ITU-R BT.601 公式转灰度，检查 min 和 max 的差值
        var bwMinGray = 255, bwMaxGray = 0;
        for (var k = 0; k < mData.length; k += 4 * bwSampleStep) {
            var g = Math.round(0.299 * mData[k] + 0.587 * mData[k + 1] + 0.114 * mData[k + 2]);
            if (g < bwMinGray) bwMinGray = g;
            if (g > bwMaxGray) bwMaxGray = g;
        }
        if (bwMaxGray - bwMinGray < 10) {
            errors.push({
                icon: 'fa-chart-simple',
                text: 'Mask has almost no grayscale range (min: <code>' + bwMinGray + '</code>, max: <code>' + bwMaxGray + '</code>).',
                expected: 'Mask needs dark and bright areas (range \u2265 ~50). Dark = transparent, bright = visible.'
            });
        }

        // 检查 5：蒙版图需要有形状信息（不能是均匀色块）
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
            errors.push({
                icon: 'fa-shapes',
                text: 'Mask lacks shape information (std dev: <code>' + bwStdDev.toFixed(1) + '</code>).',
                expected: 'Mask should have distinct patterns with varying brightness.'
            });
        }

        // 检查 6：颜色图的 #1c1c1c 背景占比不应过高
        var bgPixels = 0;
        for (var p = 0; p < cData.length; p += 4 * sampleStep) {
            if (Math.abs(cData[p] - 28) <= TOLERANCE &&
                Math.abs(cData[p + 1] - 28) <= TOLERANCE &&
                Math.abs(cData[p + 2] - 28) <= TOLERANCE) {
                bgPixels++;
            }
        }
        var bgRatio = bgPixels / sampledCount;
        if (bgRatio > 0.95) {
            errors.push({
                icon: 'fa-image',
                text: 'Over <code>' + (bgRatio * 100).toFixed(0) + '%</code> of color image is #1C1C1C background.',
                expected: 'Color image should have visible border elements on #1C1C1C background.'
            });
        }

        return errors.length > 0 ? { valid: false, errors: errors } : { valid: true };
    }

    // ================================================================
    //  错误弹窗：显示校验失败的详细原因
    // ================================================================
    function showErrorModal(errors) {
        var listEl = document.getElementById('errorList');
        listEl.innerHTML = '';
        errors.forEach(function (err) {
            var item = document.createElement('div');
            item.className = 'error-item';
            item.innerHTML =
                '<i class="fa-solid ' + err.icon + '"></i>' +
                '<div>' +
                    err.text +
                    (err.expected ? '<span class="expected"><i class="fa-solid fa-circle-info" style="margin-right:4px;font-size:10px;"></i>' + err.expected + '</span>' : '') +
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

    // ================================================================
    //  预设边框处理（上下拆分格式）
    //
    //  输入：单张图片，上半=color，下半=灰度mask
    //  输出：{ colorCvs, maskCvs, filtered }
    //    - colorCvs: 离屏 canvas，尺寸 = 原图宽 × 半高，内容 = 上半部分颜色像素
    //    - maskCvs:  离屏 canvas，尺寸同上，RGB=(255,255,255)，Alpha = 灰度值
    //    - filtered: 被 #1c1c1c 过滤置零的像素数
    //
    //  maskCvs 的 Alpha 通道含义：
    //    Alpha=255 → 该位置完全显示边框颜色
    //    Alpha=0   → 该位置完全透明，显示原图
    //    Alpha=128 → 半透明混合
    // ================================================================
    function processBorder(borderImg) {
        var bw = borderImg.width, bh = borderImg.height;
        var halfH = Math.floor(bh / 2);

        log('[PRESET] ' + bw + 'x' + bh + ' halfH=' + halfH);

        // 将整张素材画到临时 canvas，一次性读取全部像素
        var tmpCvs = document.createElement('canvas');
        tmpCvs.width = bw; tmpCvs.height = bh;
        var tmpCtx = tmpCvs.getContext('2d');
        tmpCtx.drawImage(borderImg, 0, 0);
        var src = tmpCtx.getImageData(0, 0, bw, bh).data;

        // 分离上半部分颜色和下半部分灰度蒙版
        var colorRGBA = new Uint8ClampedArray(bw * halfH * 4);
        var maskGray  = new Uint8ClampedArray(bw * halfH);

        for (var y = 0; y < halfH; y++) {
            for (var x = 0; x < bw; x++) {
                var si = (y * bw + x) * 4;       // 源图中的索引
                var di = (y * bw + x) * 4;       // colorRGBA 中的索引

                // 上半部分：直接复制 RGBA
                colorRGBA[di]     = src[si];
                colorRGBA[di + 1] = src[si + 1];
                colorRGBA[di + 2] = src[si + 2];
                colorRGBA[di + 3] = 255;

                // 下半部分：同坐标位置，转灰度（PIL .convert("L") 使用 ITU-R BT.601 公式）
                var bi = ((y + halfH) * bw + x) * 4;
                maskGray[y * bw + x] = Math.round(
                    0.299 * src[bi] + 0.587 * src[bi + 1] + 0.114 * src[bi + 2]
                );
            }
        }

        // #1c1c1c 过滤：颜色图中接近 (28,28,28) 的像素位置，
        // 将蒙版对应位置置为 0（完全透明），这样该位置会显示原图
        // TOLERANCE=2 是因为 JPEG 有损压缩后像素值可能偏移 ±2
        var filtered = 0;
        for (var j = 0; j < colorRGBA.length; j += 4) {
            if (Math.abs(colorRGBA[j] - 28) <= TOLERANCE &&
                Math.abs(colorRGBA[j + 1] - 28) <= TOLERANCE &&
                Math.abs(colorRGBA[j + 2] - 28) <= TOLERANCE) {
                maskGray[j / 4] = 0;
                filtered++;
            }
        }

        log('[PRESET] filtered=' + filtered + '/' + (bw * halfH));

        // 将颜色数据写入独立 canvas
        var colorCvs = document.createElement('canvas');
        colorCvs.width = bw; colorCvs.height = halfH;
        colorCvs.getContext('2d').putImageData(new ImageData(colorRGBA, bw, halfH), 0, 0);

        // 将灰度蒙版转为 RGBA 格式写入独立 canvas
        // RGB 设为 (255,255,255)，Alpha 设为灰度值
        // 这样后续 drawImage 缩放时，Alpha 通道会被正确插值
        var maskRGBA = new Uint8ClampedArray(bw * halfH * 4);
        for (var k = 0; k < bw * halfH; k++) {
            maskRGBA[k * 4]     = 255;
            maskRGBA[k * 4 + 1] = 255;
            maskRGBA[k * 4 + 2] = 255;
            maskRGBA[k * 4 + 3] = maskGray[k];
        }
        var maskCvs = document.createElement('canvas');
        maskCvs.width = bw; maskCvs.height = halfH;
        maskCvs.getContext('2d').putImageData(new ImageData(maskRGBA, bw, halfH), 0, 0);

        // 关键：强制 GPU→CPU 同步，防止后续 drawImage 读到错误数据
        forceGpuSync(colorCvs);
        forceGpuSync(maskCvs);

        return { colorCvs: colorCvs, maskCvs: maskCvs, filtered: filtered };
    }

    // ================================================================
    //  用户导入边框处理（两张独立图片）
    //
    //  与 processBorder 的区别：
    //  1. 不需要上下拆分，两张图直接对应
    //  2. 自动检测颜色图是否含 #1c1c1c 背景，决定是否执行过滤
    //  3. 输出 canvas 尺寸 = 原图尺寸（不是半高）
    //
    //  检测逻辑：采样颜色图像素，计算 #1c1c1c 占比
    //    > 5% → 当作传统边框图，执行过滤（背景区域强制透明）
    //    ≤ 5% → 当作全画面素材，完全信任蒙版（蒙版灰度直接作为透明度）
    // ================================================================
    function processBorderFromTwo(colorImg, bwImg) {
        var w = colorImg.width, h = colorImg.height;

        log('[CUSTOM] color=' + w + 'x' + h + ' mask=' + bwImg.width + 'x' + bwImg.height);

        // 提取颜色像素到数组
        var tmpCvs = document.createElement('canvas');
        tmpCvs.width = w; tmpCvs.height = h;
        var tmpCtx = tmpCvs.getContext('2d');
        tmpCtx.drawImage(colorImg, 0, 0);
        var srcColor = tmpCtx.getImageData(0, 0, w, h).data;

        // 提取蒙版像素到数组
        var tmpMCvs = document.createElement('canvas');
        tmpMCvs.width = w; tmpMCvs.height = h;
        var tmpMCtx = tmpMCvs.getContext('2d');
        tmpMCtx.drawImage(bwImg, 0, 0);
        var srcMask = tmpMCtx.getImageData(0, 0, w, h).data;

        // 构建 color RGBA 数组（直接复制，A=255）
        var colorRGBA = new Uint8ClampedArray(w * h * 4);
        for (var i = 0; i < srcColor.length; i++) {
            colorRGBA[i] = srcColor[i];
        }

        // 构建 mask 灰度数组（ITU-R BT.601 公式）
        var maskGray = new Uint8ClampedArray(w * h);
        for (var j = 0; j < w * h; j++) {
            var si = j * 4;
            maskGray[j] = Math.round(0.299 * srcMask[si] + 0.587 * srcMask[si + 1] + 0.114 * srcMask[si + 2]);
        }

        // 检测 #1c1c1c 背景占比
        var bgCount = 0;
        var sampleStep = Math.max(1, Math.floor((w * h) / 5000));
        var sampledTotal = 0;
        for (var s = 0; s < w * h; s++) {
            sampledTotal++;
            // 每隔 sampleStep 个像素采样一次
            if (sampledTotal % sampleStep !== 0 && s !== 0) continue;
            var ci = s * 4;
            if (Math.abs(colorRGBA[ci] - 28) <= TOLERANCE &&
                Math.abs(colorRGBA[ci + 1] - 28) <= TOLERANCE &&
                Math.abs(colorRGBA[ci + 2] - 28) <= TOLERANCE) {
                bgCount++;
            }
        }
        var bgRatio = bgCount / Math.ceil(w * h / sampleStep);
        log('[CUSTOM] bgRatio=' + (bgRatio * 100).toFixed(1) + '%');

        var filtered = 0;
        if (bgRatio > 0.05) {
            // 传统格式：有 #1c1c1c 背景，执行过滤
            log('[CUSTOM] mode=TRADITIONAL');
            for (var f = 0; f < w * h; f++) {
                var fi = f * 4;
                if (Math.abs(colorRGBA[fi] - 28) <= TOLERANCE &&
                    Math.abs(colorRGBA[fi + 1] - 28) <= TOLERANCE &&
                    Math.abs(colorRGBA[fi + 2] - 28) <= TOLERANCE) {
                    maskGray[f] = 0;
                    filtered++;
                }
            }
        } else {
            // 全画面格式：无 #1c1c1c 背景，完全信任蒙版
            log('[CUSTOM] mode=FULLFRAME');
        }

        log('[CUSTOM] filtered=' + filtered + '/' + (w * h));

        // 写入 color canvas
        var colorCvs = document.createElement('canvas');
        colorCvs.width = w; colorCvs.height = h;
        colorCvs.getContext('2d').putImageData(new ImageData(colorRGBA, w, h), 0, 0);

        // 写入 mask canvas（RGB=255, Alpha=灰度值）
        var maskRGBA = new Uint8ClampedArray(w * h * 4);
        for (var k = 0; k < w * h; k++) {
            maskRGBA[k * 4]     = 255;
            maskRGBA[k * 4 + 1] = 255;
            maskRGBA[k * 4 + 2] = 255;
            maskRGBA[k * 4 + 3] = maskGray[k];
        }
        var maskCvs = document.createElement('canvas');
        maskCvs.width = w; maskCvs.height = h;
        maskCvs.getContext('2d').putImageData(new ImageData(maskRGBA, w, h), 0, 0);

        // 强制 GPU 同步
        forceGpuSync(colorCvs);
        forceGpuSync(maskCvs);

        return { colorCvs: colorCvs, maskCvs: maskCvs, filtered: filtered };
    }

    // ================================================================
    //  Canvas 显示尺寸适配
    //  Canvas 内部分辨率 = 原图实际像素（保证导出质量）
    //  CSS 显示尺寸 = 按可用空间等比缩放（不超过 1:1）
    // ================================================================
    function fitCanvas() {
        if (!mainImg || !mainImg.width) return;
        var maxW = previewArea.clientWidth - 60;
        var maxH = previewArea.clientHeight - 60;
        var scale = Math.min(maxW / mainImg.width, maxH / mainImg.height, 1);
        canvas.style.width  = Math.floor(mainImg.width * scale) + 'px';
        canvas.style.height = Math.floor(mainImg.height * scale) + 'px';
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

    // ================================================================
    //  渲染预览（支持多照片切换 + 修复缓存）
    // ================================================================
    function render() {
        if (isLoadingPhoto) return; // 防止加载中的竞态
        
        var currentPhoto = photoList[currentPhotoIndex];
        
        // 如果照片还没加载，先加载
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
            canvas.width = w; canvas.height = h;
            ctx.drawImage(renderedCache[cacheKey], 0, 0, w, h);
            fitCanvas();
            return;
        }

        log('[RENDER] Cache MISS: ' + cacheKey);
        startPreviewTransition();
        canvas.width = w; canvas.height = h;

        startPreviewTransition();
        canvas.width = w; canvas.height = h;

        // 1. 画原图底图
        ctx.drawImage(mainImg, 0, 0, w, h);

        // 2. 如果有选中效果，叠加边框
        if (processedBorders[currentEffect]) {
            var border = processedBorders[currentEffect];

            // 3a. 缩放 color 到原图尺寸
            var cS = document.createElement('canvas');
            cS.width = w; cS.height = h;
            cS.getContext('2d').drawImage(border.colorCvs, 0, 0, w, h);

            // 3b. 缩放 mask 到原图尺寸
            var mS = document.createElement('canvas');
            mS.width = w; mS.height = h;
            mS.getContext('2d').drawImage(border.maskCvs, 0, 0, w, h);

            // 3c. 读取像素数据
            var outPx  = ctx.getImageData(0, 0, w, h).data;
            var colPx  = cS.getContext('2d').getImageData(0, 0, w, h).data;
            var maskPx = mS.getContext('2d').getImageData(0, 0, w, h).data;

            // 3d. 逐像素混合
            // maskPx 的 Alpha 通道（第4字节）就是灰度值，范围 0-255
            // a = alpha / 255 将其归一化到 0-1
            for (var i = 0; i < w * h; i++) {
                var a = maskPx[i * 4 + 3] / 255;
                var p = i * 4;
                outPx[p]     = Math.round(outPx[p]     * (1 - a) + colPx[p]     * a);
                outPx[p + 1] = Math.round(outPx[p + 1] * (1 - a) + colPx[p + 1] * a);
                outPx[p + 2] = Math.round(outPx[p + 2] * (1 - a) + colPx[p + 2] * a);
                // Alpha 通道保持不变（始终 255，因为输出是不透明图片）
            }

            // 3e. 写回主 canvas
            ctx.putImageData(new ImageData(outPx, w, h), 0, 0);
        }

        var cachedCanvas = document.createElement('canvas');
        cachedCanvas.width = w;
        cachedCanvas.height = h;
        cachedCanvas.getContext('2d').drawImage(canvas, 0, 0, w, h);
        renderedCache[cacheKey] = cachedCanvas;

        fitCanvas();
    }

    // ================================================================
    //  切换效果
    // ================================================================
    function applyEffect(name) {
        currentEffect = name;
        log('[APPLY] ' + name);

        // 清除新效果下所有照片的缓存（让它重新渲染）
        Object.keys(renderedCache).forEach(function(key) {
            if (key.startsWith(name + '_')) {
                delete renderedCache[key];
            }
        });

        // 更新侧边栏高亮
        var items = effectListEl.querySelectorAll('.effect-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.toggle('active', items[i].dataset.border === name);
        }

        render();
        
        // 更新导出按钮状态
        updateExportButton();
    }

    // ================================================================
    //  在侧边栏添加一个效果项
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

    // ================================================================
    //  自动检测边框文件
    //  
    //  由于浏览器安全限制无法直接扫描目录，采用试探性加载策略：
    //  从 border_1.jpg 开始依次尝试加载，直到连续失败 3 次或达到最大尝试次数
    //  这样可以动态识别 Resources 文件夹中的所有 border_X.jpg 文件
    // ================================================================
    function autoDetectBorders(callback) {
        var detectedFiles = [];
        var index = 1;
        var consecutiveFailures = 0;
        
        log('[INIT] Starting auto-detection of border files...');
        
        function tryLoadNext() {
            // 停止条件：达到最大尝试次数或连续失败次数超过阈值
            if (index > MAX_BORDER_ATTEMPTS || consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
                log('[INIT] Auto-detection complete. Found ' + detectedFiles.length + ' border file(s).');
                callback(detectedFiles);
                return;
            }
            
            var filename = 'border_' + index + '.jpg';
            
            loadImage(filename).then(function(img) {
                // 加载成功
                consecutiveFailures = 0; // 重置失败计数
                detectedFiles.push(filename);
                log('[INIT] Detected: ' + filename + ' (' + img.width + 'x' + img.height + ')');
                
                index++;
                tryLoadNext(); // 继续尝试下一个
                
            }).catch(function(err) {
                // 加载失败
                consecutiveFailures++;
                log('[INIT] Not found: ' + filename + ' (failure ' + consecutiveFailures + '/' + CONSECUTIVE_FAILURE_THRESHOLD + ')');
                
                index++;
                tryLoadNext(); // 继续尝试下一个
            });
        }
        
        tryLoadNext(); // 开始探测
    }

    // ================================================================
    //  构建侧边栏：No Effect + 预设边框 + Add New Effect 按钮
    // ================================================================
    function buildUI() {
        // "No Effect" 选项
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

        // 自动检测并加载所有边框文件
        autoDetectBorders(function(detectedFiles) {
            if (detectedFiles.length === 0) {
                log('[INIT] No border files detected.');
            } else {
                // 逐个处理检测到的边框文件
                detectedFiles.forEach(function (file) {
                    var index = parseInt(file.replace('border_', '').replace('.jpg', ''));
                    var label = 'Border ' + index;
                    var placeholderItem = addEffectItem(file, label, '', 'Loading...', true);

                    loadImage(file).then(function (img) {
                        var halfH = Math.floor(img.height / 2);

                        // 生成缩略图：取素材上半部分（彩色区域）
                        var tc = document.createElement('canvas');
                        tc.width = img.width; tc.height = halfH;
                        tc.getContext('2d').drawImage(img, 0, 0, img.width, halfH, 0, 0, img.width, halfH);
                        var thumbUrl = tc.toDataURL();

                        placeholderItem.querySelector('.effect-thumb').src = thumbUrl;
                        placeholderItem.querySelector('.effect-thumb').alt = label;
                        placeholderItem.querySelector('.effect-desc').textContent = img.width + ' × ' + halfH;

                        // 预处理边框（只执行一次，结果缓存到 processedBorders）
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

        // "Add New Effect" 按钮（追加在效果列表最后）
        var addBtn = document.createElement('button');
        addBtn.className = 'add-effect-btn';
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add New Effect';
        effectListEl.appendChild(addBtn);
        addBtn.addEventListener('click', openModal);
    }

    // ================================================================
    //  导入弹窗逻辑
    //  分两步：先选颜色图，再选灰度蒙版图
    // ================================================================
    var modalOverlay, modalHint, dropZone1, dropZone2, step1Preview, step2Preview;
    var autoMaskBtn, autoMaskError;
    var step1Img   = null;   // 第一步选择的颜色图
    var step2Img   = null;   // 第二步选择的蒙版图
    var step2Ready = false;  // 第二步是否已经选择了蒙版图，OK 按钮才能启用

    function initModal() {
        modalOverlay = document.getElementById('modalOverlay');
        modalHint    = document.getElementById('modalHint');
        dropZone1    = document.getElementById('dropZone1');
        dropZone2    = document.getElementById('dropZone2');
        step1Preview = document.getElementById('step1Preview');
        step2Preview = document.getElementById('step2Preview');
        autoMaskBtn  = document.getElementById('autoMaskBtn');
        autoMaskError = document.getElementById('autoMaskError');

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
        
        // Reset UI - use display property
        step1Preview.style.display = 'none';
        step2Preview.style.display = 'none';
        
        dropZone1.style.display = '';
        dropZone1.classList.remove('disabled');
        
        dropZone2.style.display = '';
        dropZone2.classList.add('disabled');
        
        autoMaskBtn.disabled = true;
        autoMaskError.style.display = 'none';
        
        updateModalUI();
        modalOverlay.classList.add('visible');
    }

    function closeModal() {
        modalOverlay.classList.remove('visible');
    }

    function updateModalUI() {
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
            modalHint.textContent = 'Now select the grayscale mask image or generate it automatically.';
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
        var result = validateBorderPair(step1Img, bwImg);
        if (!result.valid) {
            log('[IMPORT] FAILED: ' + result.errors.length + ' error(s)');
            showErrorModal(result.errors);
            return;
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

    /**
     * 处理用户选择的文件
     * Step 1：加载为图片，显示预览，进入 Step 2
     * Step 2：加载为图片后先显示预览，等待用户点击 OK 确认导入
     */
    function handleFile(file, step) {
        if (step === 1) {
            loadImageFromFile(file).then(function (img) {
                step1Img = img;
                step1Preview.querySelector('img').src = img.src;
                
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
                    log('[UPLOAD] Color image loaded: ' + img.width + 'x' + img.height);
                });
            }).catch(function () {
                alert('Failed to load image.');
            });
        } else {
            loadImageFromFile(file).then(function (bwImg) {
                step2Img = bwImg;
                step2Ready = true;
                step2Preview.querySelector('img').src = bwImg.src;
                
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

    // ================================================================
    //  事件绑定
    // ================================================================

    // 点击效果项
    effectListEl.addEventListener('click', function (e) {
        var item = e.target.closest('.effect-item');
        if (item) applyEffect(item.dataset.border);
    });

    // 键盘支持（Tab 聚焦后 Enter/Space 选择）
    effectListEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            var item = e.target.closest('.effect-item');
            if (item) {
                e.preventDefault();
                applyEffect(item.dataset.border);
            }
        }
    });

    // 窗口缩放时重新适配 canvas 显示尺寸
    window.addEventListener('resize', fitCanvas);

    // ====== 照片上传与切换按钮事件绑定 ======
    
    var btnAddPhoto = document.getElementById('btnAddPhoto');
    if (btnAddPhoto) {
        btnAddPhoto.addEventListener('click', function() {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = function(e) {
                var file = e.target.files[0];
                if (file) {
                    addUserPhoto(file).catch(function(err) {
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

    // ====== 导出资源功能 ======
    var isExporting = false; // 防止重复触发
    
    function updateExportButton() {
        var btnExport = document.getElementById('btnExport');
        if (!btnExport) return;
        
        // 只有选中了效果（不是'none'）才能导出
        if (currentEffect !== 'none' && !isExporting) {
            btnExport.disabled = false;
        } else {
            btnExport.disabled = true;
        }
    }
    
    /**
     * 将Canvas转换为JPEG Blob（baseline格式）
     */
    function canvasToJpegBlob(canvas, quality) {
        return new Promise(function(resolve, reject) {
            try {
                canvas.toBlob(function(blob) {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, 'image/jpeg', quality || 0.95);
            } catch (err) {
                reject(err);
            }
        });
    }
    
    /**
     * 创建灰度版本的mask图（RGB三通道相同）
     */
    function createGrayscaleMask(maskCvs) {
        var w = maskCvs.width;
        var h = maskCvs.height;
        var grayCvs = document.createElement('canvas');
        grayCvs.width = w;
        grayCvs.height = h;
        var ctx = grayCvs.getContext('2d');
        
        // 从传入的maskCvs读取像素数据，而不是从空canvas读取
        var maskCtx = maskCvs.getContext('2d');
        var imageData = maskCtx.getImageData(0, 0, w, h);
        var data = imageData.data;
        
        // 将Alpha通道值复制到RGB通道
        for (var i = 0; i < w * h; i++) {
            var alpha = data[i * 4 + 3];
            data[i * 4] = alpha;     // R
            data[i * 4 + 1] = alpha; // G
            data[i * 4 + 2] = alpha; // B
            data[i * 4 + 3] = 255;   // Alpha保持255（不透明）
        }
        
        ctx.putImageData(imageData, 0, 0);
        return grayCvs;
    }
    
    /**
     * 导出资源文件
     */
    function exportResources() {
        if (isExporting) return;
        if (currentEffect === 'none') {
            log('[EXPORT] No effect selected');
            return;
        }
        
        isExporting = true;
        var btnExport = document.getElementById('btnExport');
        if (btnExport) {
            btnExport.classList.add('loading');
            btnExport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
        }
        
        log('[EXPORT] Starting export for effect: ' + currentEffect);
        
        // 获取当前预览图
        var currentPhoto = photoList[currentPhotoIndex];
        if (!currentPhoto.img || !currentPhoto.img.width) {
            log('[EXPORT] ERROR: Photo not loaded');
            isExporting = false;
            if (btnExport) {
                btnExport.classList.remove('loading');
                btnExport.innerHTML = '<i class="fa-solid fa-download"></i> Export Resources';
            }
            return;
        }
        
        var photoImg = currentPhoto.img;
        var photoW = photoImg.width;
        var photoH = photoImg.height;
        
        // 获取效果的预处理数据
        var borderData = processedBorders[currentEffect];
        if (!borderData) {
            log('[EXPORT] ERROR: Border data not found');
            isExporting = false;
            if (btnExport) {
                btnExport.classList.remove('loading');
                btnExport.innerHTML = '<i class="fa-solid fa-download"></i> Export Resources';
            }
            return;
        }
        
        // 创建ZIP对象
        var zip = new JSZip();
        
        // 并行生成所有图片
        Promise.all([
            // 1. 带效果的预览图
            canvasToJpegBlob(canvas, 0.95).then(function(blob) {
                zip.file('preview_with_effect.jpg', blob);
                log('[EXPORT] Generated preview_with_effect.jpg');
            }),
            
            // 2. 原始预览图
            (function() {
                var origCvs = document.createElement('canvas');
                origCvs.width = photoW;
                origCvs.height = photoH;
                var origCtx = origCvs.getContext('2d');
                origCtx.drawImage(photoImg, 0, 0);
                return canvasToJpegBlob(origCvs, 0.95).then(function(blob) {
                    zip.file('preview_original.jpg', blob);
                    log('[EXPORT] Generated preview_original.jpg');
                });
            })(),
            
            // 3. Color图（缩放到640x480）
            (function() {
                var colorCvs = document.createElement('canvas');
                colorCvs.width = 640;
                colorCvs.height = 480;
                var colorCtx = colorCvs.getContext('2d');
                colorCtx.drawImage(borderData.colorCvs, 0, 0, 640, 480);
                return canvasToJpegBlob(colorCvs, 0.95).then(function(blob) {
                    zip.file('effect_color_640x480.jpg', blob);
                    log('[EXPORT] Generated effect_color_640x480.jpg');
                });
            })(),
            
            // 4. Mask图（缩放到640x480，转换为灰度）
            (function() {
                var maskGrayCvs = createGrayscaleMask(borderData.maskCvs);
                var scaledMaskCvs = document.createElement('canvas');
                scaledMaskCvs.width = 640;
                scaledMaskCvs.height = 480;
                var maskCtx = scaledMaskCvs.getContext('2d');
                maskCtx.drawImage(maskGrayCvs, 0, 0, 640, 480);
                return canvasToJpegBlob(scaledMaskCvs, 0.95).then(function(blob) {
                    zip.file('effect_mask_640x480.jpg', blob);
                    log('[EXPORT] Generated effect_mask_640x480.jpg');
                });
            })(),
            
            // 5. 合并图（640x960，上color下mask）
            (function() {
                var combinedCvs = document.createElement('canvas');
                combinedCvs.width = 640;
                combinedCvs.height = 960;
                var combinedCtx = combinedCvs.getContext('2d');
                
                // 上半部分：color图
                combinedCtx.drawImage(borderData.colorCvs, 0, 0, 640, 480);
                
                // 下半部分：mask图（灰度）
                var maskGrayCvs = createGrayscaleMask(borderData.maskCvs);
                combinedCtx.drawImage(maskGrayCvs, 0, 480, 640, 480);
                
                return canvasToJpegBlob(combinedCvs, 0.95).then(function(blob) {
                    zip.file('effect_combined_640x960.jpg', blob);
                    log('[EXPORT] Generated effect_combined_640x960.jpg');
                });
            })()
            
        ]).then(function() {
            // 所有图片生成完成，生成ZIP并下载
            log('[EXPORT] Generating ZIP file...');
            return zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
        }).then(function(zipBlob) {
            // 创建下载链接
            var url = URL.createObjectURL(zipBlob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'border_resources.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            log('[EXPORT] Export completed successfully');
            
            // 恢复按钮状态
            isExporting = false;
            if (btnExport) {
                btnExport.classList.remove('loading');
                btnExport.innerHTML = '<i class="fa-solid fa-download"></i> Export Resources';
            }
        }).catch(function(err) {
            log('[EXPORT] ERROR: ' + err.message);
            console.error('[EXPORT]', err);
            
            // 恢复按钮状态
            isExporting = false;
            if (btnExport) {
                btnExport.classList.remove('loading');
                btnExport.innerHTML = '<i class="fa-solid fa-download"></i> Export Resources';
            }
            alert('Export failed: ' + err.message);
        });
    }
    
    // 绑定导出按钮事件
    var btnExport = document.getElementById('btnExport');
    if (btnExport) {
        btnExport.addEventListener('click', exportResources);
    }

    // ================================================================
    //  启动
    // ================================================================
    log('[INIT] Starting...');
    initModal();
    buildUI();

    // 加载默认原图
    loadImage(DEFAULT_PHOTO).then(function (img) {
        photoList[0].img = img;
        mainImg = img;
        log('[INIT] Photo: ' + img.width + 'x' + img.height);
        applyEffect('none');
        
        // 初始化按钮状态
        updatePhotoSwitchButtons();
        updateAddPhotoButton();
        updateExportButton(); // 初始化导出按钮状态
    }).catch(function (err) {
        log('[INIT] ERROR: ' + err.message);
    });


})();
