// 文件名: NT_CAM_ColorControls.js
// 用途: 负责 NT CAM 工具中亮度、对比度、RGB平衡等滑块区域的界面控制和交互逻辑

class NT_CAM_ColorControls {
    constructor(tool, container) {
        this.tool = tool;
        this.container = container;

        // 控件引用
        this.brightnessSlider = null;
        this.contrastSlider = null;
        this.saturationSlider = null;
        this.hueSlider = null;
        this.redSlider = null;
        this.greenSlider = null;
        this.blueSlider = null;

        // 显示值引用
        this.brightnessValue = null;
        this.contrastValue = null;
        this.saturationValue = null;
        this.hueValue = null;
        this.redValue = null;
        this.greenValue = null;
        this.blueValue = null;

        this.render();
        this.initEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="tool-section">
                <!-- 可折叠的 Color Controls 区域，默认展开 -->
                <details class="collapsible-section" open>
                    <summary class="collapsible-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span>Color Controls</span>
                        </div>
                        <i class="fas fa-chevron-down collapsible-arrow"></i>
                    </summary>

                    <!-- 亮度滑块 -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Brightness:</span>
                            <span id="brightnessValue">0</span>
                        </div>
                        <input type="range" id="brightnessSlider" class="slider" min="-150" max="150" value="0">
                    </div>

                    <!-- 对比度滑块 -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Contrast:</span>
                            <span id="contrastValue">0</span>
                        </div>
                        <input type="range" id="contrastSlider" class="slider" min="-50" max="100" value="0">
                    </div>

                    <!-- 饱和度滑块 -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Saturation:</span>
                            <span id="saturationValue">0</span>
                        </div>
                        <input type="range" id="saturationSlider" class="slider" min="-100" max="50" value="0">
                    </div>

                    <!-- 色相滑块 -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Hue:</span>
                            <span id="hueValue">0</span>
                        </div>
                        <input type="range" id="hueSlider" class="slider" min="-60" max="60" value="0">
                    </div>

                    <!-- RGB滑块 -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Color Balance Red:</span>
                            <span id="redValue">0</span>
                        </div>
                        <input type="range" id="redSlider" class="slider" min="-100" max="100" style="accent-color: #ff7675;" value="0">
                    </div>

                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Color Balance Green:</span>
                            <span id="greenValue">0</span>
                        </div>
                        <input type="range" id="greenSlider" class="slider" min="-100" max="100" style="accent-color: #55efc4;" value="0">
                    </div>

                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Color Balance Blue:</span>
                            <span id="blueValue">0</span>
                        </div>
                        <input type="range" id="blueSlider" class="slider" min="-100" max="100" style="accent-color: #74b9ff;" value="0">
                    </div>
                </details>

                <!-- Button group -->
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
        // 获取控件引用
        this.brightnessSlider = this.container.querySelector('#brightnessSlider');
        this.contrastSlider = this.container.querySelector('#contrastSlider');
        this.saturationSlider = this.container.querySelector('#saturationSlider');
        this.hueSlider = this.container.querySelector('#hueSlider');
        this.redSlider = this.container.querySelector('#redSlider');
        this.greenSlider = this.container.querySelector('#greenSlider');
        this.blueSlider = this.container.querySelector('#blueSlider');

        this.brightnessValue = this.container.querySelector('#brightnessValue');
        this.contrastValue = this.container.querySelector('#contrastValue');
        this.saturationValue = this.container.querySelector('#saturationValue');
        this.hueValue = this.container.querySelector('#hueValue');
        this.redValue = this.container.querySelector('#redValue');
        this.greenValue = this.container.querySelector('#greenValue');
        this.blueValue = this.container.querySelector('#blueValue');

        // 绑定基础滑块事件
        const updateAndApply = (slider, valueDisplay) => {
            slider.addEventListener('input', () => {
                valueDisplay.textContent = slider.value;
                this.tool.applyAllAdjustments();
            });
        };

        updateAndApply(this.brightnessSlider, this.brightnessValue);
        updateAndApply(this.contrastSlider, this.contrastValue);
        updateAndApply(this.saturationSlider, this.saturationValue);
        updateAndApply(this.hueSlider, this.hueValue);

        // 绑定 RGB 滑块事件 (特殊处理：需要更新 LUT)
        const updateRGBAndApply = (slider, valueDisplay) => {
            slider.addEventListener('input', () => {
                valueDisplay.textContent = slider.value;
                this.tool.updateRGBLUT(); // 调用工具类方法更新 LUT
                this.tool.applyAllAdjustments();
            });
        };

        updateRGBAndApply(this.redSlider, this.redValue);
        updateRGBAndApply(this.greenSlider, this.greenValue);
        updateRGBAndApply(this.blueSlider, this.blueValue);

        // 按钮事件
        const resetButton = this.container.querySelector('#resetButton');
        resetButton.addEventListener('click', () => this.resetAllSliders());

        const importButton = this.container.querySelector('#importButton');
        const fltfileInput = this.container.querySelector('#fltfileInput');
        
        importButton.addEventListener('click', () => fltfileInput.click());
        fltfileInput.addEventListener('change', (e) => this.tool.handleFltImport(e));

        const exportButton = this.container.querySelector('#exportButton');
        exportButton.addEventListener('click', () => this.tool.handleExport());

        // 折叠区域箭头切换
        const details = this.container.querySelector('.collapsible-section');
        const arrow = this.container.querySelector('.collapsible-arrow');
        details.addEventListener('toggle', () => {
            if (details.open) {
                arrow.classList.remove('fa-chevron-up');
                arrow.classList.add('fa-chevron-down');
            } else {
                arrow.classList.remove('fa-chevron-down');
                arrow.classList.add('fa-chevron-up');
            }
        });
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

        // 重置后也需要更新工具类的状态
        this.tool.resetLUT();
        this.tool.applyAllAdjustments();
    }

    // 供外部类（如解析文件后）更新界面控件值的辅助方法
    setControlValues(params) {
        if(params.lum !== undefined) {
            this.brightnessSlider.value = params.lum;
            this.brightnessValue.textContent = params.lum;
        }
        if(params.contrast !== undefined) {
            this.contrastSlider.value = params.contrast;
            this.contrastValue.textContent = params.contrast;
        }
        if(params.sat !== undefined) {
            this.saturationSlider.value = params.sat;
            this.saturationValue.textContent = params.sat;
        }
        if(params.hue !== undefined) {
            this.hueSlider.value = params.hue;
            this.hueValue.textContent = params.hue;
        }
        if(params.rgain !== undefined) {
            this.redSlider.value = params.rgain;
            this.redValue.textContent = params.rgain;
        }
        if(params.ggain !== undefined) {
            this.greenSlider.value = params.ggain;
            this.greenValue.textContent = params.ggain;
        }
        if(params.bgain !== undefined) {
            this.blueSlider.value = params.bgain;
            this.blueValue.textContent = params.bgain;
        }
    }

    getCurrentValues() {
        return {
            lum: this.brightnessSlider.value,
            contrast: this.contrastSlider.value,
            sat: this.saturationSlider.value,
            hue: this.hueSlider.value,
            rgain: this.redSlider.value,
            ggain: this.greenSlider.value,
            bgain: this.blueSlider.value
        };
    }
}