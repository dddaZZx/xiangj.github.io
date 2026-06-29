'use strict';

// ================================================================
//  边框素材处理（预设上下拼图 / 用户双图）
// ================================================================
function processBorder(borderImg) {
    var bw = borderImg.width, bh = borderImg.height;
    var halfH = Math.floor(bh / 2);

    log('[PRESET] ' + bw + 'x' + bh + ' halfH=' + halfH);

    var tmpCvs = document.createElement('canvas');
    tmpCvs.width = bw; tmpCvs.height = bh;
    var tmpCtx = tmpCvs.getContext('2d');
    tmpCtx.drawImage(borderImg, 0, 0);
    var src = tmpCtx.getImageData(0, 0, bw, bh).data;

    var colorRGBA = new Uint8ClampedArray(bw * halfH * 4);
    var maskGray = new Uint8ClampedArray(bw * halfH);

    for (var y = 0; y < halfH; y++) {
        for (var x = 0; x < bw; x++) {
            var si = (y * bw + x) * 4;
            var di = (y * bw + x) * 4;

            colorRGBA[di] = src[si];
            colorRGBA[di + 1] = src[si + 1];
            colorRGBA[di + 2] = src[si + 2];
            colorRGBA[di + 3] = 255;

            var bi = ((y + halfH) * bw + x) * 4;
            maskGray[y * bw + x] = Math.round(0.299 * src[bi] + 0.587 * src[bi + 1] + 0.114 * src[bi + 2]);
        }
    }

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

    var colorCvs = document.createElement('canvas');
    colorCvs.width = bw; colorCvs.height = halfH;
    colorCvs.getContext('2d').putImageData(new ImageData(colorRGBA, bw, halfH), 0, 0);

    var maskRGBA = new Uint8ClampedArray(bw * halfH * 4);
    for (var k = 0; k < bw * halfH; k++) {
        maskRGBA[k * 4] = 255;
        maskRGBA[k * 4 + 1] = 255;
        maskRGBA[k * 4 + 2] = 255;
        maskRGBA[k * 4 + 3] = maskGray[k];
    }
    var maskCvs = document.createElement('canvas');
    maskCvs.width = bw; maskCvs.height = halfH;
    maskCvs.getContext('2d').putImageData(new ImageData(maskRGBA, bw, halfH), 0, 0);

    forceGpuSync(colorCvs);
    forceGpuSync(maskCvs);

    return { colorCvs: colorCvs, maskCvs: maskCvs, filtered: filtered };
}

function processBorderFromTwo(colorImg, bwImg) {
    var w = colorImg.width, h = colorImg.height;

    log('[CUSTOM] color=' + w + 'x' + h + ' mask=' + bwImg.width + 'x' + bwImg.height);

    var tmpCvs = document.createElement('canvas');
    tmpCvs.width = w; tmpCvs.height = h;
    var tmpCtx = tmpCvs.getContext('2d');
    tmpCtx.drawImage(colorImg, 0, 0);
    var srcColor = tmpCtx.getImageData(0, 0, w, h).data;

    var tmpMCvs = document.createElement('canvas');
    tmpMCvs.width = w; tmpMCvs.height = h;
    var tmpMCtx = tmpMCvs.getContext('2d');
    tmpMCtx.drawImage(bwImg, 0, 0);
    var srcMask = tmpMCtx.getImageData(0, 0, w, h).data;

    var colorRGBA = new Uint8ClampedArray(w * h * 4);
    for (var i = 0; i < srcColor.length; i++) {
        colorRGBA[i] = srcColor[i];
    }

    var maskGray = new Uint8ClampedArray(w * h);
    for (var j = 0; j < w * h; j++) {
        var si = j * 4;
        maskGray[j] = Math.round(0.299 * srcMask[si] + 0.587 * srcMask[si + 1] + 0.114 * srcMask[si + 2]);
    }

    var bgCount = 0;
    var bgCountTol6 = 0;
    var bgCountTol10 = 0;
    var bgDeltaSum = 0;
    var bgDeltaMin = Infinity;
    var bgDeltaMax = 0;
    var sampleStep = Math.max(1, Math.floor((w * h) / 5000));
    var sampledTotal = 0;
    var sampledPoints = 0;
    for (var s = 0; s < w * h; s++) {
        sampledTotal++;
        if (sampledTotal % sampleStep !== 0 && s !== 0) continue;
        sampledPoints++;
        var ci = s * 4;
        var dr = Math.abs(colorRGBA[ci] - 28);
        var dg = Math.abs(colorRGBA[ci + 1] - 28);
        var db = Math.abs(colorRGBA[ci + 2] - 28);
        var maxDelta = Math.max(dr, dg, db);
        bgDeltaSum += maxDelta;
        if (maxDelta < bgDeltaMin) bgDeltaMin = maxDelta;
        if (maxDelta > bgDeltaMax) bgDeltaMax = maxDelta;
        if (maxDelta <= TOLERANCE) bgCount++;
        if (maxDelta <= 6) bgCountTol6++;
        if (maxDelta <= 10) bgCountTol10++;
    }

    var bgRatio = bgCount / Math.ceil(w * h / sampleStep);
    log('[CUSTOM] bgRatio=' + (bgRatio * 100).toFixed(1) + '%');
    log('[CUSTOM] bgProbe(sample=' + sampledPoints + '): tol2=' + (sampledPoints > 0 ? (bgCount * 100 / sampledPoints).toFixed(1) : '0.0') +
        '% tol6=' + (sampledPoints > 0 ? (bgCountTol6 * 100 / sampledPoints).toFixed(1) : '0.0') +
        '% tol10=' + (sampledPoints > 0 ? (bgCountTol10 * 100 / sampledPoints).toFixed(1) : '0.0') +
        '% maxDelta(mean/min/max)=' +
        (sampledPoints > 0 ? (bgDeltaSum / sampledPoints).toFixed(2) : '0.00') + '/' +
        (sampledPoints > 0 ? bgDeltaMin.toFixed(2) : '0.00') + '/' +
        (sampledPoints > 0 ? bgDeltaMax.toFixed(2) : '0.00') +
        ' baseTolerance=' + TOLERANCE + ')');

    var filtered = 0;
    if (bgRatio > 0.05) {
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
        log('[CUSTOM] mode=FULLFRAME');
    }

    log('[CUSTOM] filtered=' + filtered + '/' + (w * h));

    var colorCvs = document.createElement('canvas');
    colorCvs.width = w; colorCvs.height = h;
    colorCvs.getContext('2d').putImageData(new ImageData(colorRGBA, w, h), 0, 0);

    var maskRGBA = new Uint8ClampedArray(w * h * 4);
    for (var k = 0; k < w * h; k++) {
        maskRGBA[k * 4] = 255;
        maskRGBA[k * 4 + 1] = 255;
        maskRGBA[k * 4 + 2] = 255;
        maskRGBA[k * 4 + 3] = maskGray[k];
    }
    var maskCvs = document.createElement('canvas');
    maskCvs.width = w; maskCvs.height = h;
    maskCvs.getContext('2d').putImageData(new ImageData(maskRGBA, w, h), 0, 0);

    forceGpuSync(colorCvs);
    forceGpuSync(maskCvs);

    return { colorCvs: colorCvs, maskCvs: maskCvs, filtered: filtered };
}
