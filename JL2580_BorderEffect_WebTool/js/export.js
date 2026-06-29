'use strict';

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
