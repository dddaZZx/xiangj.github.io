// NT_CAM_FilterTemp.js
// 滤镜模板折叠栏组件，包含多个预设滤镜模板，点击快速应用参数到Color Controls
class NT_CAM_FilterTemp {
    constructor(tool, container) {
        this.tool = tool;
        this.container = container;
        
        // 定义滤镜模板，参数范围适配 NT 工具（总共25个，与JL一致）
        this.filterTemplates = [
            // 基础滤镜（4个）
            {
                name: "B&W",
                params: {
                    lum: 0,
                    contrast: 0,
                    sat: -100,
                    hue: 0,
                    rgain: 0,
                    ggain: 0,
                    bgain: 0
                }
            },
            {
                name: "Warm Gold",
                params: {
                    lum: -20,
                    contrast: -8,
                    sat: -7,
                    hue: 0,
                    rgain: -11,
                    ggain: -7,
                    bgain: 32
                }
            },
            {
                name: "Forest",
                params: {
                    lum: 0,
                    contrast: 0,
                    sat: 0,
                    hue: 0,
                    rgain: 26,
                    ggain: 0,
                    bgain: 0
                }
            },
            {
                name: "Ocean",
                params: {
                    lum: 30,
                    contrast: 7,
                    sat: 31,
                    hue: 0,
                    rgain: 7,
                    ggain: 9,
                    bgain: 24
                }
            },
            
            // 微调滤镜（16个）
            {
                name: "Soft Light",
                params: {
                    lum: 15,
                    contrast: -2,
                    sat: -5,
                    hue: 8,
                    rgain: 2,
                    ggain: -1,
                    bgain: -3
                }
            },
            {
                name: "Vintage",
                params: {
                    lum: 9,
                    contrast: 5,
                    sat: -12,
                    hue: 20,
                    rgain: -5,
                    ggain: -8,
                    bgain: -15
                }
            },
            {
                name: "Cool Breeze",
                params: {
                    lum: 24,
                    contrast: 3,
                    sat: 5,
                    hue: -8,
                    rgain: -4,
                    ggain: 1,
                    bgain: 8
                }
            },
            {
                name: "Golden Hour",
                params: {
                    lum: 18,
                    contrast: 8,
                    sat: 12,
                    hue: 13,
                    rgain: 5,
                    ggain: 2,
                    bgain: -8
                }
            },
            {
                name: "Muted",
                params: {
                    lum: 4,
                    contrast: -5,
                    sat: -25,
                    hue: 0,
                    rgain: 3,
                    ggain: 1,
                    bgain: -2
                }
            },
            {
                name: "Pop Color",
                params: {
                    lum: 2,
                    contrast: 12,
                    sat: 25,
                    hue: 3,
                    rgain: -2,
                    ggain: 4,
                    bgain: -4
                }
            },
            {
                name: "Morning",
                params: {
                    lum: 25,
                    contrast: 1,
                    sat: 8,
                    hue: -3,
                    rgain: -7,
                    ggain: 0,
                    bgain: 5
                }
            },
            {
                name: "Evening",
                params: {
                    lum: -5,
                    contrast: 9,
                    sat: 15,
                    hue: 15,
                    rgain: 8,
                    ggain: 3,
                    bgain: -4
                }
            },
            {
                name: "Cinematic",
                params: {
                    lum: -12,
                    contrast: 15,
                    sat: 18,
                    hue: -13,
                    rgain: -8,
                    ggain: 2,
                    bgain: 10
                }
            },
            {
                name: "Portrait",
                params: {
                    lum: 21,
                    contrast: 4,
                    sat: -8,
                    hue: 3,
                    rgain: 1,
                    ggain: -2,
                    bgain: -4
                }
            },
            {
                name: "Urban",
                params: {
                    lum: 3,
                    contrast: 18,
                    sat: 22,
                    hue: -3,
                    rgain: -1,
                    ggain: 6,
                    bgain: 3
                }
            },
            {
                name: "Clear Sky",
                params: {
                    lum: 30,
                    contrast: 2,
                    sat: 28,
                    hue: -15,
                    rgain: -6,
                    ggain: 1,
                    bgain: 12
                }
            },
            {
                name: "Warm Tone",
                params: {
                    lum: 12,
                    contrast: 6,
                    sat: 9,
                    hue: 8,
                    rgain: 4,
                    ggain: 1,
                    bgain: -10
                }
            },
            {
                name: "Cool Tone",
                params: {
                    lum: 25,
                    contrast: 3,
                    sat: 14,
                    hue: -10,
                    rgain: -5,
                    ggain: 0,
                    bgain: 7
                }
            },
            {
                name: "Subtle",
                params: {
                    lum: 8,
                    contrast: -1,
                    sat: -15,
                    hue: 2,
                    rgain: 0,
                    ggain: -1,
                    bgain: -2
                }
            },
            {
                name: "Vibrant",
                params: {
                    lum: 12,
                    contrast: 14,
                    sat: 35,
                    hue: 7,
                    rgain: -3,
                    ggain: 5,
                    bgain: -6
                }
            },
            {
                name: "Dreamy",
                params: {
                    lum: 20,
                    contrast: -3,
                    sat: -22,
                    hue: 5,
                    rgain: 2,
                    ggain: -4,
                    bgain: -1
                }
            },
            
            // 风格化滤镜（5个，与JL对应）
            {
                name: "Noir",
                params: {
                    lum: -36,
                    contrast: 25,
                    sat: -85,
                    hue: 0,
                    rgain: 18,
                    ggain: 15,
                    bgain: -15
                }
            },
            {
                name: "Cyanotype",
                params: {
                    lum: 38,
                    contrast: 8,
                    sat: -55,
                    hue: 195,
                    rgain: -12,
                    ggain: -5,
                    bgain: 22
                }
            },
            {
                name: "Sepia",
                params: {
                    lum: 24,
                    contrast: 12,
                    sat: -65,
                    hue: 63,
                    rgain: -8,
                    ggain: -12,
                    bgain: -25
                }
            },
            {
                name: "Lomo",
                params: {
                    lum: -12,
                    contrast: 28,
                    sat: 42,
                    hue: -22,
                    rgain: 15,
                    ggain: 8,
                    bgain: -8
                }
            },
            {
                name: "HDR",
                params: {
                    lum: 6,
                    contrast: 45,
                    sat: 65,
                    hue: 8,
                    rgain: 22,
                    ggain: 18,
                    bgain: 15
                }
            }
        ];
        
        this.render();
        this.initEventListeners();
    }

    // 渲染滤镜模板折叠栏（默认折叠）
    render() {
        // 拼接滤镜按钮，每行2个布局
        let filterButtonsHtml = '';
        this.filterTemplates.forEach((filter, index) => {
            filterButtonsHtml += `
                <button class="filter-template-btn" data-index="${index}">
                    ${filter.name}
                </button>
            `;
        });

        // 折叠栏HTML结构：默认折叠
        const filterTempHtml = `
            <details class="collapsible-section filter-temp-section">
                <summary class="collapsible-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span>Filter template</span>
                    </div>
                    <!-- 根据原始样式：折叠时显示朝上图标 -->
                    <i class="fas fa-chevron-up collapsible-arrow"></i>
                </summary>
                <div class="filter-template-buttons">
                    ${filterButtonsHtml}
                </div>
            </details>
        `;

        // 将滤镜模板折叠栏插入到容器最顶部（在Color Controls上方）
        this.container.insertAdjacentHTML('afterbegin', filterTempHtml);
    }

    // 初始化事件监听
    initEventListeners() {
        // 折叠箭头切换逻辑 - 改回原始逻辑
        const details = this.container.querySelector('.filter-temp-section');
        const arrow = details.querySelector('.collapsible-arrow');
        details.addEventListener('toggle', () => {
            if (details.open) {
                // 展开状态 → 显示朝下的图标 (原始逻辑)
                arrow.classList.remove('fa-chevron-up');
                arrow.classList.add('fa-chevron-down');
            } else {
                // 折叠状态 → 显示朝上的图标 (原始逻辑)
                arrow.classList.remove('fa-chevron-down');
                arrow.classList.add('fa-chevron-up');
            }
        });

        // 滤镜按钮点击事件：应用对应参数到Color Controls
        const filterButtons = this.container.querySelectorAll('.filter-template-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                const { params } = this.filterTemplates[index];
                this.applyFilterParams(params);
            });
        });
    }

    // 应用滤镜参数到Color Controls和图像
    applyFilterParams(params) {
        const { colorControls } = this.tool;
        if (!colorControls) return;

        // 1. 更新Color Controls所有滑块值
        colorControls.brightnessSlider.value = params.lum;
        colorControls.contrastSlider.value = params.contrast;
        colorControls.saturationSlider.value = params.sat;
        colorControls.hueSlider.value = params.hue;
        colorControls.redSlider.value = params.rgain;
        colorControls.greenSlider.value = params.ggain;
        colorControls.blueSlider.value = params.bgain;

        // 2. 更新滑块显示文本
        colorControls.brightnessValue.textContent = params.lum;
        colorControls.contrastValue.textContent = params.contrast;
        colorControls.saturationValue.textContent = params.sat;
        colorControls.hueValue.textContent = params.hue;
        colorControls.redValue.textContent = params.rgain;
        colorControls.greenValue.textContent = params.ggain;
        colorControls.blueValue.textContent = params.bgain;

        // 3. 更新LUT表并应用所有调整
        this.tool.updateRGBLUT();
        this.tool.applyAllAdjustments();
    }
}