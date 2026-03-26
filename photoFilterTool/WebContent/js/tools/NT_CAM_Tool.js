// 文件名: NT_CAM_Tool.js
// 用途: 负责 NT CAM 工具的核心图像处理逻辑、LUT管理及文件解析

class NT_CAM_Tool {
    constructor(container, ctx, canvas) {
        this.container = container;
        this.ctx = ctx;
        this.canvas = canvas;
        this.originalImageData = null;
        this.currentImageData = null;

        // 初始化1024字节LUT表（恒等变换）
        this.rgbLUT = this.createIdentityLUT();

        // 初始化颜色控制组件
        this.colorControls = new NT_CAM_ColorControls(this, container);

        // 初始化滤镜模板组件
        new NT_CAM_FilterTemp(this, container);  // 添加这一行

        // 界面渲染已移到 NT_CAM_ColorControls 中
    }

    onImageUpload(img) {
        // 保持原始图片尺寸
        this.imgWidth = img.width;
        this.imgHeight = img.height;

        // 设置canvas尺寸
        this.canvas.width = this.imgWidth;
        this.canvas.height = this.imgHeight;

        // 绘制图像并保存原始数据
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.currentImageData = new ImageData(
            new Uint8ClampedArray(this.originalImageData.data),
            this.originalImageData.width,
            this.originalImageData.height
        );

        // 重置所有滑条和LUT表
        this.colorControls.resetAllSliders();
        this.resetLUT();
    }

    applyAllAdjustments() {
        if (!this.originalImageData) return;

        // 从原始数据开始
        this.currentImageData = new ImageData(
            new Uint8ClampedArray(this.originalImageData.data),
            this.originalImageData.width,
            this.originalImageData.height
        );

        // 获取当前滑块值
        const values = this.colorControls.getCurrentValues();
        const brightnessValue = parseInt(values.lum);
        const contrastValue = parseInt(values.contrast);
        const saturationValue = parseInt(values.sat);
        const hueValue = parseInt(values.hue);

        // 应用所有调整（注意顺序很重要）
        this.applyLUT(this.currentImageData);
        this.applyHue(this.currentImageData, hueValue);
        this.applyBrightness(this.currentImageData, brightnessValue);
        this.applyContrast(this.currentImageData, contrastValue);
        this.applySaturation(this.currentImageData, saturationValue);

        // 输出结果到canvas
        this.ctx.putImageData(this.currentImageData, 0, 0);
    }

    // 亮度调整
    applyBrightness(imageData, brightnessValue) {
        const factorMin = 0.6;
        const factorDefault = 1;
        const factorMax = 1.88;

        let factor;

        if (brightnessValue < 0) {
            factor = factorDefault + (brightnessValue / 150) * (factorDefault - factorMin);
        } else if (brightnessValue === 0) {
            factor = factorDefault;
        } else {
            factor = factorDefault + (brightnessValue / 150) * (factorMax - factorDefault);
        }

        factor = Math.max(factorMin, Math.min(factorMax, factor));

        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = this.clamp(imageData.data[i] * factor);
            imageData.data[i+1] = this.clamp(imageData.data[i+1] * factor);
            imageData.data[i+2] = this.clamp(imageData.data[i+2] * factor);
        }
    }

    // 对比度调整
    applyContrast(imageData, contrastValue) {
        const factorMin = 0.8;
        const factorDefault = 1;
        const factorMax = 1.5;

        let factor;

        if (contrastValue < 0) {
            factor = factorDefault + (contrastValue / 50) * (factorDefault - factorMin);
        } else if (contrastValue === 0) {
            factor = factorDefault;
        } else {
            factor = factorDefault + (contrastValue / 100) * (factorMax - factorDefault);
        }

        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = this.clamp(factor * (imageData.data[i] - 128) + 128);
            imageData.data[i+1] = this.clamp(factor * (imageData.data[i+1] - 128) + 128);
            imageData.data[i+2] = this.clamp(factor * (imageData.data[i+2] - 128) + 128);
        }
    }

    // 饱和度调整
    applySaturation(imageData, saturationValue) {
        const values = this.colorControls.getCurrentValues();
        const redValue = parseInt(values.rgain);
        const greenValue = parseInt(values.ggain);
        const blueValue = parseInt(values.bgain);

        // 2. 计算RGB调整的总强度 (0-1)
        const rgbAdjustmentStrength =
            (Math.abs(redValue) + Math.abs(greenValue) + Math.abs(blueValue)) / 300;

        // 3. 根据RGB调整强度计算饱和度减弱系数
        const c = 0.9; // 饱和度减弱系数（0-1），1表示完全减弱，0表示不减弱
        let saturationReductionFactor = 1 - (c * rgbAdjustmentStrength);

        // 4. 新逻辑：当饱和度为负值时，根据接近-100的程度线性减小减弱效果
        if (saturationValue < 0) {
            // 计算接近-100的程度（0到1之间，-100时为1，0时为0）
            const negativeFactor = Math.abs(saturationValue) / 100;
            // 线性调整减弱系数：越接近-100，减弱效果越小
            saturationReductionFactor = 1 - (c * rgbAdjustmentStrength * (1 - negativeFactor));
        }

        // 5. 调整原始饱和度值
        let adjustedSaturationValue = saturationValue;
        if (saturationValue !== 0) {
            // 保持原有方向(正负)，但应用调整后的减弱幅度
            adjustedSaturationValue = saturationValue * saturationReductionFactor;
        }

        // 6. 使用调整后的饱和度值进行原有计算
        const factorMin = 0;
        const factorDefault = 1;
        const factorMax = 2.5;

        let factor;

        if (adjustedSaturationValue < 0) {
            factor = factorDefault + (adjustedSaturationValue / 100) * (factorDefault - factorMin);
        } else if (adjustedSaturationValue === 0) {
            factor = factorDefault;
        } else {
            factor = factorDefault + (adjustedSaturationValue / 50) * (factorMax - factorDefault);
        }

        // 7. 应用饱和度调整
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i+1];
            const b = imageData.data[i+2];
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;

            imageData.data[i] = this.clamp(gray + factor * (r - gray));
            imageData.data[i+1] = this.clamp(gray + factor * (g - gray));
            imageData.data[i+2] = this.clamp(gray + factor * (b - gray));
        }
    }

    // 色相调整
    applyHue(imageData, hueValue) {
        const hue = hueValue * Math.PI / 180;
        const cos = Math.cos(hue);
        const sin = Math.sin(hue);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i+1];
            const b = imageData.data[i+2];

            imageData.data[i] = this.clamp(
                r * (cos + (1.0 - cos) / 3.0) +
                g * ((1.0/3.0) * (1.0 - cos) - Math.sqrt(1.0/3.0) * sin) +
                b * ((1.0/3.0) * (1.0 - cos) + Math.sqrt(1.0/3.0) * sin)
            );

            imageData.data[i+1] = this.clamp(
                r * ((1.0/3.0) * (1.0 - cos) + Math.sqrt(1.0/3.0) * sin) +
                g * (cos + (1.0 - cos)/3.0) +
                b * ((1.0/3.0) * (1.0 - cos) - Math.sqrt(1.0/3.0) * sin)
            );

            imageData.data[i+2] = this.clamp(
                r * ((1.0/3.0) * (1.0 - cos) - Math.sqrt(1.0/3.0) * sin) +
                g * ((1.0/3.0) * (1.0 - cos) + Math.sqrt(1.0/3.0) * sin) +
                b * (cos + (1.0 - cos)/3.0)
            );
        }
    }

    // 创建初始1024字节LUT表（恒等变换）
    createIdentityLUT() {
        // 1024字节LUT，每个通道1024个值
        return {
            red: Array.from({length: 1024}, (_, i) => Math.floor(i / 4)),    // R通道
            green: Array.from({length: 1024}, (_, i) => Math.floor(i / 4)), // G通道
            blue: Array.from({length: 1024}, (_, i) => Math.floor(i / 4))   // B通道
        };
    }

    // 重置LUT表为恒等变换
    resetLUT() {
        this.rgbLUT = this.createIdentityLUT();
    }

    // 线性插值方法
    linearInterpolate(start, end, steps, currentStep) {
        return Math.round(start + (end - start) * currentStep / steps);
    }

    // 将256字节的LUT插值为1024字节
    interpolateLUT() {
        const interpolated = {
            red: new Array(1024),
            green: new Array(1024),
            blue: new Array(1024)
        };

        // 原始LUT每两个值之间需要插入3个新值(因为 256×4=1024)
        for (let i = 0; i < 256; i++) {
            const nextIdx = (i === 255) ? 255 : i + 1;

            // 对R、G、B三个通道分别插值
            for (let j = 0; j < 4; j++) {
                const newIdx = i * 4 + j;
                interpolated.red[newIdx] = this.linearInterpolate(
                    this.rgbLUT.red[i],
                    this.rgbLUT.red[nextIdx],
                    4, j
                );
                interpolated.green[newIdx] = this.linearInterpolate(
                    this.rgbLUT.green[i],
                    this.rgbLUT.green[nextIdx],
                    4, j
                );
                interpolated.blue[newIdx] = this.linearInterpolate(
                    this.rgbLUT.blue[i],
                    this.rgbLUT.blue[nextIdx],
                    4, j
                );
            }
        }

        return interpolated;
    }

    // 更新RGB LUT表（使用V105的RGB逻辑，但保持-100到100的范围）
    updateRGBLUT() {
        const values = this.colorControls.getCurrentValues();
        const redValue = parseInt(values.rgain);
        const greenValue = parseInt(values.ggain);
        const blueValue = parseInt(values.bgain);

        // 将-100到100的范围映射到0.1到2.0的范围（V105的gamma范围）
        const mapToGammaRange = (value) => {
            // 将-100到100映射到0.1到2.0
            // 0对应1.0 (中间值)
            if (value === 0) return 1.0;
            else if (value > 0) return 1.0 + (value / 100) * (2.0 - 1.0); // 正数映射到1.0-2.0
            else return 1.0 + (value / 100) * (1.0 - 0.1); // 负数映射到0.1-1.0
        };

        const gammaR = mapToGammaRange(redValue);
        const gammaG = mapToGammaRange(greenValue);
        const gammaB = mapToGammaRange(blueValue);

        // 更新1024字节LUT表
        for (let i = 0; i < 1024; i++) {
            const originalValue = Math.floor(i / 4);

            // 应用V105的gamma校正逻辑
            const gammaRMapped = 1 / gammaR;
            const gammaGMapped = 1 / gammaG;
            const gammaBMapped = 1 / gammaB;

            this.rgbLUT.red[i] = Math.pow(originalValue / 255.0, gammaRMapped) * 255.0;
            this.rgbLUT.green[i] = Math.pow(originalValue / 255.0, gammaGMapped) * 255.0;
            this.rgbLUT.blue[i] = Math.pow(originalValue / 255.0, gammaBMapped) * 255.0;
        }
    }

    // 应用LUT表到图像数据（适配1024字节LUT）
    applyLUT(imageData) {
        const data = imageData.data;
        const { red, green, blue } = this.rgbLUT;

        for (let i = 0; i < data.length; i += 4) {
            // 将8位输入值(0-255)映射到1024字节LUT
            const rIndex = data[i] * 4;
            const gIndex = data[i + 1] * 4;
            const bIndex = data[i + 2] * 4;

            data[i] = red[rIndex];         // R
            data[i + 1] = green[gIndex];   // G
            data[i + 2] = blue[bIndex];    // B
            // Alpha通道保持不变
        }
    }

    clamp(value) {
        return Math.max(0, Math.min(255, value));
    }

    cleanup() {
        // 清理工作
    }

    // FLT文件导入处理 (仅保留解析逻辑，UI更新交给ColorControls)
    handleFltImport(event) {
        const file = event.target.files[0];
        if (!file || !file.name.endsWith('.flt')) {
            console.warn('请选择.flt文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const fltParams = this.parseFltFile(content);

            // 调用ColorControls的方法来更新UI
            this.colorControls.setControlValues(fltParams);

            // 更新RGB LUT表
            this.updateRGBLUT();
            this.applyAllAdjustments();

            // 重置文件输入
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    // 解析FLT文件
    parseFltFile(content) {
        const fltParams = {
            lum: 0,
            contrast: 0,
            rgain: 0,
            ggain: 0,
            bgain: 0,
            hue: 0,
            sat: 0
        };

        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && line.includes(':')) {
                const parts = line.split(':');
                const key = parts[0].trim().toLowerCase();
                const value = parseFloat(parts[1].trim()) || 0;

                if (key in fltParams) {
                    fltParams[key] = value;
                }
            }
        }

        return fltParams;
    }

    // 导出处理 (UI获取数据部分由ColorControls辅助)
    async handleExport() {
        try {
            const values = this.colorControls.getCurrentValues();
            
            let content = "\n";//按客户需求第一行添加一个换行符
            content += `lum:${values.lum}\n`;
            content += `contrast:${values.contrast}\n`;
            content += `rgain:${values.rgain}\n`;
            content += `ggain:${values.ggain}\n`;
            content += `bgain:${values.bgain}\n`;
            content += `hue:${values.hue}\n`;
            content += `sat:${values.sat}\n`;

            // 优先尝试使用现代API
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'Std.flt',//默认用Std.flt为生成的文件名
                        types: [{
                            description: 'FLT Files',
                            accept: { 'text/plain': ['.flt'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    return; // 成功保存后直接返回
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        // 不是用户取消的错误才继续尝试兼容方案
                        throw error;
                    }
                    // 用户取消操作，直接返回不执行后续操作
                    return;
                }
            }

            // 现代API不可用或失败时使用兼容方案
            this.startDownload(content);
        } catch (error) {
            console.error('Export failed:', error);
            // 这里不再自动调用startDownload，让用户决定是否重试
        }
    }

    // 兼容方案的下载函数
    startDownload(content) {
        var fileName = prompt("请输入文件名:", "config");
        if (!fileName) return; // 用户取消

        var blob = new Blob([content], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = fileName + '.flt';
        link.click();

        // 清理
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 100);
    }
}