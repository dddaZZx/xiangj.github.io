// 文件名: JL_CAM_ColorControls.js
// 用途: 负责 JL CAM 工具中亮度、对比度等滑块区域的界面控制和交互逻辑
class JL_CAM_ColorControls {
    constructor(tool, container) {
        this.tool = tool;
        this.container = container;
        // 控件引用
        this.brightnessControl = null;
        this.contrastControl = null;
        this.saturationControl = null;
        this.hueControl = null;
        this.gammaRControl = null;
        this.gammaGControl = null;
        this.gammaBControl = null;
        this.grainControl = null;
        // 显示值引用
        this.brightnessValue = null;
        this.contrastValue = null;
        this.saturationValue = null;
        this.hueValue = null;
        this.gammaRValues = null;
        this.gammaGValues = null;
        this.gammaBValues = null;
        this.grainValue = null;
        // 特效选择
        this.effectRadios = null;
        
        this.render();
        // 初始化滤镜模板组件
        new JL_CAM_FilterTemp(tool, container);
        this.initEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="tool-section">
                <div style="display: none;">
                    <table id="colorCorrectionMatrixTable" class="matrix-table">
                        <caption>Color Correction Matrix</caption>
                        <tbody></tbody>
                    </table>
                    <table id="segDLookupTable" class="matrix-table">
                        <caption>Segmented Lookup Table</caption>
                        <tbody></tbody>
                    </table>
                </div>
                <!-- 可折叠的 Color Controls 区域，默认展开 -->
                <details class="collapsible-section color-controls-section" open>
                    <summary class="collapsible-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span>Color Controls</span>
                        </div>
                        <!-- 修改为朝下（默认展开，与NT一致） -->
                        <i class="fas fa-chevron-down collapsible-arrow"></i>
                    </summary>
                    <!-- Brightness slider -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Brightness:</span>
                            <span id="brightnessValue">0</span>
                        </div>
                        <input type="range" id="brightness" class="slider" min="-255" max="255" value="0">
                    </div>
                    <!-- Contrast slider -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Contrast:</span>
                            <span id="contrastValue">1.0</span>
                        </div>
                        <input type="range" id="contrast" class="slider" min="0.0" max="2.0" step="0.01" value="1.0">
                    </div>
                    <!-- Saturation slider -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Saturation:</span>
                            <span id="saturationValue">1.0</span>
                        </div>
                        <input type="range" id="saturation" class="slider" min="0.0" max="4.0" step="0.01" value="1.0">
                    </div>
                    <!-- HUE slider -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Hue:</span>
                            <span id="hueValue">0</span>
                        </div>
                        <input type="range" id="hue" class="slider" min="0" max="360" value="0">
                    </div>
                    <!-- Gamma sliders -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>GammaR:</span>
                            <span id="gammaRValues">1.0</span>
                        </div>
                        <input type="range" id="gammaR" class="slider" min="0.1" max="2.0" step="0.01" value="1.0" title="Red">
                    </div>
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>GammaG:</span>
                            <span id="gammaGValues">1.0</span>
                        </div>
                        <input type="range" id="gammaG" class="slider" min="0.1" max="2.0" step="0.01" value="1.0" title="Green">
                    </div>
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>GammaB:</span>
                            <span id="gammaBValues">1.0</span>
                        </div>
                        <input type="range" id="gammaB" class="slider" min="0.1" max="2.0" step="0.01" value="1.0" title="Blue">
                    </div>
                    <!-- Grain slider -->
                    <div class="slider-group">
                        <div class="slider-label">
                            <span>Grain: <span class="tooltip"><i class="fas fa-info-circle"></i><span class="tooltiptext">The higher the grain intensity, the longer it will take to switch filters and take photos.</span></span></span>
                            <span id="grainValue">0</span>
                        </div>
                        <input type="range" id="grain" class="slider" min="0" max="64" step="1" value="0" title="Grain">
                    </div>
                </details>
                <!-- Button group -->
                <div class="button-group">
                    <button id="loadButton" class="import-button">Load Filter</button>
                    <input type="file" id="filterUpload" accept=".flt" style="display: none;">
                    <button id="resetButton" class="reset-button">RESET</button>
                    <button id="exportButton" class="export-button">Save Filter</button>
                </div>
            </div>
        `;
    }

    initEventListeners() {
        // 获取所有控件引用
        this.brightnessControl = this.container.querySelector('#brightness');
        this.contrastControl = this.container.querySelector('#contrast');
        this.saturationControl = this.container.querySelector('#saturation');
        this.hueControl = this.container.querySelector('#hue');
        this.gammaRControl = this.container.querySelector('#gammaR');
        this.gammaGControl = this.container.querySelector('#gammaG');
        this.gammaBControl = this.container.querySelector('#gammaB');
        this.grainControl = this.container.querySelector('#grain');
        this.brightnessValue = this.container.querySelector('#brightnessValue');
        this.contrastValue = this.container.querySelector('#contrastValue');
        this.saturationValue = this.container.querySelector('#saturationValue');
        this.hueValue = this.container.querySelector('#hueValue');
        this.gammaRValues = this.container.querySelector('#gammaRValues');
        this.gammaGValues = this.container.querySelector('#gammaGValues');
        this.gammaBValues = this.container.querySelector('#gammaBValues');
        this.grainValue = this.container.querySelector('#grainValue');
        this.resetButton = this.container.querySelector('#resetButton');
        this.exportButton = this.container.querySelector('#exportButton');

        // 绑定滑块事件
        this.brightnessControl.addEventListener('input', () => this.updateValue(this.brightnessControl, this.brightnessValue));
        this.contrastControl.addEventListener('input', () => this.updateValue(this.contrastControl, this.contrastValue));
        this.saturationControl.addEventListener('input', () => this.updateValue(this.saturationControl, this.saturationValue));
        this.hueControl.addEventListener('input', () => this.updateValue(this.hueControl, this.hueValue));
        this.gammaRControl.addEventListener('input', () => this.updateGammaValues());
        this.gammaGControl.addEventListener('input', () => this.updateGammaValues());
        this.gammaBControl.addEventListener('input', () => this.updateGammaValues());
        this.grainControl.addEventListener('input', () => this.updateValue(this.grainControl, this.grainValue));

        // 按钮事件
        this.resetButton.addEventListener('click', () => this.tool.resetFilters());
        this.exportButton.addEventListener('click', () => this.tool.exportTablesAsTxt());
        const loadButton = this.container.querySelector('#loadButton');
        const filterUpload = this.container.querySelector('#filterUpload');
        loadButton.addEventListener('click', () => filterUpload.click());
        filterUpload.addEventListener('change', (e) => this.tool.handleFilterUpload(e));

        // 折叠区域箭头切换逻辑：改为与NT一致
        const details = this.container.querySelector('.color-controls-section');
        const arrow = details.querySelector('.collapsible-arrow');
        details.addEventListener('toggle', () => {
            if (details.open) {
                // 展开状态 → 显示朝下的图标 (与NT一致)
                arrow.classList.remove('fa-chevron-up');
                arrow.classList.add('fa-chevron-down');
            } else {
                // 折叠状态 → 显示朝上的图标 (与NT一致)
                arrow.classList.remove('fa-chevron-down');
                arrow.classList.add('fa-chevron-up');
            }
        });
    }

    updateValue(control, display) {
        display.textContent = control.value;
        this.tool.applyFilters();
    }

    updateGammaValues() {
        const selectedEffect = this.container.querySelector('input[name="effect"]:checked')?.value;
        if (selectedEffect === 'gray') {
            const unifiedGammaValue = this.gammaRControl.value;
            this.gammaGControl.value = unifiedGammaValue;
            this.gammaBControl.value = unifiedGammaValue;
            this.gammaGValues.textContent = unifiedGammaValue;
            this.gammaBValues.textContent = unifiedGammaValue;
        }
        this.gammaRValues.textContent = this.gammaRControl.value;
        this.gammaGValues.textContent = this.gammaGControl.value;
        this.gammaBValues.textContent = this.gammaBControl.value;
        this.tool.applyFilters();
    }

    getCurrentValues() {
        return {
            brightness: parseFloat(this.brightnessControl.value),
            contrast: parseFloat(this.contrastControl.value),
            saturation: parseFloat(this.saturationControl.value),
            hue: parseFloat(this.hueControl.value),
            gammaR: parseFloat(this.gammaRControl.value),
            gammaG: parseFloat(this.gammaGControl.value),
            gammaB: parseFloat(this.gammaBControl.value),
            grain: parseFloat(this.grainControl.value),
            selectedEffect: this.container.querySelector('input[name="effect"]:checked')?.value || 'custom'
        };
    }

    resetControls() {
        this.brightnessControl.value = 0;
        this.brightnessValue.textContent = "0";
        this.contrastControl.value = 1.0;
        this.contrastValue.textContent = "1.0";
        this.saturationControl.value = 1.0;
        this.saturationValue.textContent = "1.0";
        [this.gammaRControl, this.gammaGControl, this.gammaBControl].forEach(control => control.value = 1.0);
        [this.gammaRValues, this.gammaGValues, this.gammaBValues].forEach(display => display.textContent = "1.0");
        this.hueControl.value = 0;
        this.hueValue.textContent = 0;
        this.grainControl.value = 0;
        this.grainValue.textContent = "0";
        // 重置特效选择（如果存在）
        const customEffect = this.container.querySelector('#customEffect');
        if (customEffect) {
            customEffect.checked = true;
            this.tool.handleEffectChange?.();
        }
    }

    disableControl(controlId, disabled) {
        const control = this.container.querySelector(`#${controlId}`);
        if (control) {
            control.disabled = disabled;
        }
    }
}