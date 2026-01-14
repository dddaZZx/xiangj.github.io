class NT_CAM_Tool_2 {
    constructor(container, ctx, canvas) {
        this.container = container;
        this.ctx = ctx;
        this.canvas = canvas;
        this.originalImageData = null;
        this.currentImageData = null;
        
        this.render();
        this.initEventListeners();
    }
    
    //cs8的render方法
    render() {
        this.container.innerHTML = `
            <div class="tool-section">
                <h3>CS8 Filter Tool</h3>
                
                <!-- 亮度滑块 -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Brightness:</span>
                        <span id="brightnessValue" class="slider-value">0</span>
                    </div>
                    <input type="range" id="brightnessSlider" class="slider" min="-150" max="150" value="0">
                </div>

                <!-- 对比度滑块 -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Contrast:</span>
                        <span id="contrastValue" class="slider-value">0</span>
                    </div>
                    <input type="range" id="contrastSlider" class="slider" min="-50" max="100" value="0">
                </div>
                
                <!-- 饱和度滑块 -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Saturation:</span>
                        <span id="saturationValue" class="slider-value">0</span>
                    </div>
                    <input type="range" id="saturationSlider" class="slider" min="-100" max="50" value="0">
                </div>
                
                <!-- 色相滑块 -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Hue:</span>
                        <span id="hueValue" class="slider-value">0</span>
                    </div>
                    <input type="range" id="hueSlider" class="slider" min="-60" max="60" value="0">
                </div>

                <!-- RGB滑块 -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Color Balance Red:</span>
                        <span id="redValue" class="slider-value">0</span>
                    </div>
                    <input type="range" id="redSlider" class="slider" min="-100" max="100" value="0">
                </div>

                <div class="slider-group">
                    <div class="slider-label">
                        <span>Color Balance Green:</span>
                        <span id="greenValue" class="slider-value">0</span>
                    </div>
                    <input type="range" id="greenSlider" class="slider" min="-100" max="100" value="0">
                </div>

                <div class="slider-group">
                    <div class="slider-label">
                        <span>Color Balance Blue:</span>
                        <span id="blueValue" class="slider-value">0</span>
                    </div>
                    <input type="range" id="blueSlider" class="slider" min="-100" max="100" value="0">
                </div>

                <!-- fps单选框 -->
                <div class="radio-group">
                    <label>
                        <input type="radio" name="fpsMode" value="18">FPS 18
                    </label>
                    <label>
                        <input type="radio" name="fpsMode" value="22">FPS 22
                    </label>
                    <label>
                        <input type="radio" name="fpsMode" value="30" checked>FPS 30
                    </label>
                </div>

                <!-- 按钮组 -->
                <div class="button-group">
                    <button id="importButton" class="import-button">Load Filter</button>
                    <input type="file" id="fltfileInput" accept=".flt" style="display: none;">
                    <button id="resetButton" class="reset-button">RESET</button>
                    <button id="exportButton" class="export-button">Save Filter</button>
                </div>
            </div>
        `;
    }
    
    initEventListeners() {
        // 亮度滑块事件
        const brightnessSlider = this.container.querySelector('#brightnessSlider');
        const brightnessValue = this.container.querySelector('#brightnessValue');
        brightnessSlider.addEventListener('input', () => {
            brightnessValue.textContent = brightnessSlider.value;
            this.applyAllAdjustments();
        });

        // 对比度滑块事件
        const contrastSlider = this.container.querySelector('#contrastSlider');
        const contrastValue = this.container.querySelector('#contrastValue');
        contrastSlider.addEventListener('input', () => {
            contrastValue.textContent = contrastSlider.value;
            this.applyAllAdjustments();
        });

        // 饱和度滑块事件
        const saturationSlider = this.container.querySelector('#saturationSlider');
        const saturationValue = this.container.querySelector('#saturationValue');
        saturationSlider.addEventListener('input', () => {
            saturationValue.textContent = saturationSlider.value;
            this.applyAllAdjustments();
        });

        // 色相滑块事件
        const hueSlider = this.container.querySelector('#hueSlider');
        const hueValue = this.container.querySelector('#hueValue');
        hueSlider.addEventListener('input', () => {
            hueValue.textContent = hueSlider.value;
            this.applyAllAdjustments();
        });

        // RGB滑块事件
        const redSlider = this.container.querySelector('#redSlider');
        const redValue = this.container.querySelector('#redValue');
        redSlider.addEventListener('input', () => {
            redValue.textContent = redSlider.value;
            this.applyAllAdjustments();
        });

        const greenSlider = this.container.querySelector('#greenSlider');
        const greenValue = this.container.querySelector('#greenValue');
        greenSlider.addEventListener('input', () => {
            greenValue.textContent = greenSlider.value;
            this.applyAllAdjustments();
        });

        const blueSlider = this.container.querySelector('#blueSlider');
        const blueValue = this.container.querySelector('#blueValue');
        blueSlider.addEventListener('input', () => {
            blueValue.textContent = blueSlider.value;
            this.applyAllAdjustments();
        });

        // RESET按钮事件
        const resetButton = this.container.querySelector('#resetButton');
        resetButton.addEventListener('click', () => {
            this.resetAllSliders();
            this.applyAllAdjustments();
        });

        // IMPORT按钮事件
        const importButton = this.container.querySelector('#importButton');
        const fltfileInput = this.container.querySelector('#fltfileInput');
        importButton.addEventListener('click', () => fltfileInput.click());
        fltfileInput.addEventListener('change', (e) => this.handleFltImport(e));

        // EXPORT按钮事件
        const exportButton = this.container.querySelector('#exportButton');
        exportButton.addEventListener('click', () => this.handleExport());
    }
    
    onImageUpload(img) {
        // 保持原始图片尺寸（与main.js和DefaultTool一致）
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
        
        // 重置所有滑条
        this.resetAllSliders();
    }
    
    resetAllSliders() {
        const sliders = [
            { id: 'brightnessSlider', valueId: 'brightnessValue', defaultValue: 0 },
            { id: 'contrastSlider', valueId: 'contrastValue', defaultValue: 0 },
            { id: 'saturationSlider', valueId: 'saturationValue', defaultValue: 0 },
            { id: 'hueSlider', valueId: 'hueValue', defaultValue: 0 },
            { id: 'redSlider', valueId: 'redValue', defaultValue: 0 },
            { id: 'greenSlider', valueId: 'greenValue', defaultValue: 0 },
            { id: 'blueSlider', valueId: 'blueValue', defaultValue: 0 }
        ];
        
        sliders.forEach(slider => {
            const element = this.container.querySelector(`#${slider.id}`);
            const valueElement = this.container.querySelector(`#${slider.valueId}`);
            if (element && valueElement) {
                element.value = slider.defaultValue;
                valueElement.textContent = slider.defaultValue;
            }
        });
        
        // 重置FPS单选按钮
        const fps30Radio = this.container.querySelector('input[name="fpsMode"][value="30"]');
        if (fps30Radio) fps30Radio.checked = true;
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
        const brightnessValue = parseInt(this.container.querySelector('#brightnessSlider').value);
        const contrastValue = parseInt(this.container.querySelector('#contrastSlider').value);
        const saturationValue = parseInt(this.container.querySelector('#saturationSlider').value);
        const hueValue = parseInt(this.container.querySelector('#hueSlider').value);
        const redValue = parseInt(this.container.querySelector('#redSlider').value);
        const greenValue = parseInt(this.container.querySelector('#greenSlider').value);
        const blueValue = parseInt(this.container.querySelector('#blueSlider').value);
        
        // 应用所有调整（注意顺序很重要）
        this.applyRedAdjustment(this.currentImageData, redValue);
        this.applyGreenAdjustment(this.currentImageData, greenValue);
        this.applyBlueAdjustment(this.currentImageData, blueValue);
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

    // 使用Canvas 滤镜 API 实现
    // applyContrast(imageData, contrastValue) {
    //     // 创建临时 canvas
    //     const tempCanvas = document.createElement('canvas');
    //     tempCanvas.width = imageData.width;
    //     tempCanvas.height = imageData.height;
    //     const tempCtx = tempCanvas.getContext('2d');
        
    //     // 映射 contrastValue 到 CSS filter 的 contrast() 值
    //     let cssContrast;
    //     if (contrastValue < 0) {
    //         // [-50, 0] → [0.5, 1] 降低对比度
    //         cssContrast = 1 + (contrastValue / 100); 
    //     } else {
    //         // [0, 100] → [1, 3] 增强对比度
    //         cssContrast = 1 + (contrastValue / 50); 
    //     }
        
    //     // 应用滤镜
    //     tempCtx.putImageData(imageData, 0, 0);
    //     tempCtx.filter = `contrast(${cssContrast})`;
    //     tempCtx.drawImage(tempCanvas, 0, 0);
        
    //     // 获取处理后的数据
    //     const adjustedData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        
    //     // 将结果复制回原 imageData（保持引用不变）
    //     imageData.data.set(adjustedData.data);
        
    //     // 清理临时 canvas
    //     tempCanvas.width = 0;
    //     tempCanvas.height = 0;
    // }


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
        // 1. 首先获取RGB滑条值
        const redValue = parseInt(this.container.querySelector('#redSlider').value);
        const greenValue = parseInt(this.container.querySelector('#greenSlider').value);
        const blueValue = parseInt(this.container.querySelector('#blueSlider').value);
        
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
    
    // RGB调整
    applyRedAdjustment(imageData, redValue) {
        const rangeSettings = { min: -60, default: 0, max: 60 };
        let rAdj = this.calcSingleChannelAdjustment(redValue, rangeSettings);
        
        // 正数为限制 负数为补偿 范围±1
        const redLimits = {
            positive: 0.6,  // 正值控制
            negative: -0.5   // 负值控制
        };
        
        // 获取其他通道的当前调整值
        const greenValue = parseInt(this.container.querySelector('#greenSlider').value);
        const blueValue = parseInt(this.container.querySelector('#blueSlider').value);
        const gAdj = this.calcSingleChannelAdjustment(greenValue, rangeSettings);
        const bAdj = this.calcSingleChannelAdjustment(blueValue, rangeSettings);
        
        // 渐进式能量限制（当其他通道有调整时）
        if (greenValue !== 0 || blueValue !== 0) {
            // 计算其他通道的调整能量（基于平方和）
            const otherEnergy = Math.sqrt(gAdj**2 + bAdj**2);
            const maxEnergy = Math.sqrt(2 * 60**2); // 两个通道最大可能能量
            
            // 计算动态限制系数（0-1）
            let limitFactor = Math.min(1, otherEnergy / maxEnergy);
            // 使用平方根使变化更平滑
            limitFactor = Math.sqrt(limitFactor);
            
            // 应用限制（正值和负值分开处理）
            if (rAdj > 0) {
                rAdj *= (1 - limitFactor * redLimits.positive);
            } else if (rAdj < 0) {
                rAdj *= (1 - limitFactor * redLimits.negative);
            }
        }
        
        // 应用调整
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = this.clamp(imageData.data[i] + rAdj);
        }
    }

    applyGreenAdjustment(imageData, greenValue) {
        const rangeSettings = { min: -60, default: 0, max: 60 };
        let gAdj = this.calcSingleChannelAdjustment(greenValue, rangeSettings);
        
        // 配置参数
        const greenLimits = {
            positive: 0.5,   // 正值最大限制50%
            negative: 0.3,   // 负值最大限制30%
            soloBoost: 0.6   // 单独调整时,控制显示范围
        };
        
        // 获取其他通道的实际调整值
        const redValue = parseInt(this.container.querySelector('#redSlider').value);
        const blueValue = parseInt(this.container.querySelector('#blueSlider').value);
        const rAdj = this.calcSingleChannelAdjustment(redValue, rangeSettings);
        const bAdj = this.calcSingleChannelAdjustment(blueValue, rangeSettings);
        
        // 单独调整绿色通道时的增强
        if (redValue === 0 && blueValue === 0) {
            gAdj *= (1*greenLimits.soloBoost); // 增强60%
        } 
        // 多通道调整时的限制
        else if (redValue !== 0 || blueValue !== 0) {
            const otherEnergy = Math.sqrt(rAdj**2 + bAdj**2);
            const maxEnergy = Math.sqrt(2 * 60**2);
            let limitFactor = Math.sqrt(Math.min(1, otherEnergy / maxEnergy));
            
            if (gAdj > 0) {
                gAdj *= (1 - limitFactor * greenLimits.positive);
            } else if (gAdj < 0) {
                gAdj *= (1 - limitFactor * greenLimits.negative);
            }
        }
        
        // 应用调整
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i+1] = this.clamp(imageData.data[i+1] + gAdj);
        }
    }

    applyBlueAdjustment(imageData, blueValue) {
        const rangeSettings = { min: -60, default: 0, max: 60 };
        let bAdj = this.calcSingleChannelAdjustment(blueValue, rangeSettings);
        
        // 正数为限制 负数为补偿 范围±1
        const blueLimits = {
            positive: 0.4,  // 正值最大限制40%
            negative: 0.2   // 负值最大限制20%
        };
        
        // 获取其他通道的实际调整值
        const redValue = parseInt(this.container.querySelector('#redSlider').value);
        const greenValue = parseInt(this.container.querySelector('#greenSlider').value);
        const rAdj = this.calcSingleChannelAdjustment(redValue, rangeSettings);
        const gAdj = this.calcSingleChannelAdjustment(greenValue, rangeSettings);
        
        // 渐进式能量限制
        if (redValue !== 0 || greenValue !== 0) {
            const otherEnergy = Math.sqrt(rAdj**2 + gAdj**2);
            const maxEnergy = Math.sqrt(2 * 60**2);
            let limitFactor = Math.sqrt(Math.min(1, otherEnergy / maxEnergy));
            
            if (bAdj > 0) {
                bAdj *= (1 - limitFactor * blueLimits.positive);
            } else if (bAdj < 0) {
                bAdj *= (1 - limitFactor * blueLimits.negative);
            }
        }
        
        // 应用调整
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i+2] = this.clamp(imageData.data[i+2] + bAdj);
        }
    }

    // 判断是否需要限制（两个及以上滑块不为0）
    shouldLimitRGB(currentValue, value1, value2) {
        let nonZeroCount = 0;
        if (currentValue !== 0) nonZeroCount++;
        if (value1 !== 0) nonZeroCount++;
        if (value2 !== 0) nonZeroCount++;
        return nonZeroCount >= 2;
    }

    // 应用通道限制
    applyChannelLimit(adjustment, {positive, negative}) {
        if (adjustment > 0) {
            return Math.min(adjustment, positive * adjustment);
        } else if (adjustment < 0) {
            return Math.max(adjustment, negative * adjustment);
        }
        return adjustment;
    }

    // 计算单通道调整值
    calcSingleChannelAdjustment(value, { min, default: def, max }) {
        if (value < 0) {
            return def + (value / 100) * (def - min);
        } else if (value === 0) {
            return def;
        } else {
            return def + (value / 100) * (max - def);
        }
    }


    //RGB同时限制 - 无法单独控制R,G,B，暂时弃用
    applyRGBAdjustment(imageData, redValue, greenValue, blueValue) {
        const rangeSettings = {
            red: { min: -60, default: 0, max: 60 },
            green: { min: -60, default: 0, max: 60 },
            blue: { min: -60, default: 0, max: 60 }
        };
    
        // 计算各通道调整值
        const calcAdjustment = (value, channel) => {
            const { min, default: def, max } = rangeSettings[channel];
            if (value < 0) {
                return def + (value / 100) * (def - min);
            } else if (value === 0) {
                return def;
            } else {
                return def + (value / 100) * (max - def);
            }
        };
    
        let rAdj = calcAdjustment(redValue, 'red');
        let gAdj = calcAdjustment(greenValue, 'green');
        let bAdj = calcAdjustment(blueValue, 'blue');
    
        // 计算总强度
        const totalAdjustment = Math.sqrt(rAdj ** 2 + gAdj ** 2 + bAdj ** 2);
    
        // 动态选择强度限制系数
        const maxStrengthPercentage = this.shouldUseStrictLimit(rAdj, gAdj, bAdj) ? 0.35 : 0.5;
        const maxTotalAdjustment = 103.92 * maxStrengthPercentage;
    
        // 强度限制
        if (totalAdjustment > maxTotalAdjustment) {
            const scale = maxTotalAdjustment / totalAdjustment;
            rAdj *= scale;
            gAdj *= scale;
            bAdj *= scale;
        }
    
        // 应用调整
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = this.clamp(imageData.data[i] + rAdj);
            imageData.data[i+1] = this.clamp(imageData.data[i+1] + gAdj);
            imageData.data[i+2] = this.clamp(imageData.data[i+2] + bAdj);
        }
    }
    
    // 判断是否使用更严格的限制（新增方法）
    shouldUseStrictLimit(rAdj, gAdj, bAdj) {
        // 情况1：两个或以上通道为负值
        const negativeCount = [rAdj, gAdj, bAdj].filter(v => v < 0).length;
        if (negativeCount >= 2) return true;
    
        // 情况2：影响最大的通道是负值
        const maxImpactValue = Math.max(
            Math.abs(rAdj), 
            Math.abs(gAdj), 
            Math.abs(bAdj)
        );
        return [rAdj, gAdj, bAdj].some(v => 
            Math.abs(v) === maxImpactValue && v < 0
        );
    }

    clamp(value) {
        return Math.max(0, Math.min(255, value));
    }
    
    cleanup() {
        // 清理工作
    }
    
    // FLT文件导入处理
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
            
            // 设置滑块值
            this.container.querySelector('#brightnessSlider').value = fltParams.lum;
            this.container.querySelector('#contrastSlider').value = fltParams.contrast;
            this.container.querySelector('#saturationSlider').value = fltParams.sat;
            this.container.querySelector('#hueSlider').value = fltParams.hue;
            this.container.querySelector('#redSlider').value = fltParams.rgain;
            this.container.querySelector('#greenSlider').value = fltParams.ggain;
            this.container.querySelector('#blueSlider').value = fltParams.bgain;
            
            // 更新显示值
            this.container.querySelector('#brightnessValue').textContent = fltParams.lum;
            this.container.querySelector('#contrastValue').textContent = fltParams.contrast;
            this.container.querySelector('#saturationValue').textContent = fltParams.sat;
            this.container.querySelector('#hueValue').textContent = fltParams.hue;
            this.container.querySelector('#redValue').textContent = fltParams.rgain;
            this.container.querySelector('#greenValue').textContent = fltParams.ggain;
            this.container.querySelector('#blueValue').textContent = fltParams.bgain;
            
            // 设置FPS
            const fpsRadio = this.container.querySelector(`input[name="fpsMode"][value="${fltParams.fps}"]`);
            if (fpsRadio) fpsRadio.checked = true;
            
            // 应用调整
            this.applyAllAdjustments();
            
            // 重置文件输入
            event.target.value = '';
        };
        reader.readAsText(file);
    }
    
    // 解析FLT文件
    parseFltFile(content) {
        const fltParams = {
            fps: 30,
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
    
    // 导出处理
    async handleExport() {
        try {
            const fps = this.container.querySelector('input[name="fpsMode"]:checked').value;
            const lum = this.container.querySelector('#brightnessSlider').value;
            const contrast = this.container.querySelector('#contrastSlider').value;
            const sat = this.container.querySelector('#saturationSlider').value;
            const hue = this.container.querySelector('#hueSlider').value;
            const rgain = this.container.querySelector('#redSlider').value;
            const ggain = this.container.querySelector('#greenSlider').value;
            const bgain = this.container.querySelector('#blueSlider').value;

            let content = "\n";//第一行添加一个换行符
            content += `fps:${fps}\n`;
            // content += `mode:1\n`;
            content += `lum:${lum}\n`;
            content += `contrast:${contrast}\n`;
            content += `rgain:${rgain}\n`;
            content += `ggain:${ggain}\n`;
            content += `bgain:${bgain}\n`;
            content += `hue:${hue}\n`;
            content += `sat:${sat}\n`;

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

    // 兼容方案的下载函数（保持不变）
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

    
    
}//class CSTool end