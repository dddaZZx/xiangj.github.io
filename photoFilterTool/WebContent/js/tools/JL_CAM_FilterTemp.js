// JL_CAM_FilterTemp.js
// 滤镜模板折叠栏组件，包含4个预设滤镜模板，点击快速应用参数到Color Controls
class JL_CAM_FilterTemp {
    constructor(tool, container) {
        this.tool = tool;
        this.container = container;
        this.filterTemplates = [
            // 保留原始4个滤镜，重新命名
            {
                name: "B&W",  // 原B&W
                params: {
                    brightness: 0,
                    contrast: 1,
                    saturation: 0,
                    hue: 0,
                    gammaR: 1,
                    gammaG: 1,
                    gammaB: 1,
                    grain: 0,
                    effect: 'custom'
                }
            },
            {
                name: "Warm Gold",  // 原YELLOW
                params: {
                    brightness: -8,
                    contrast: 0.93,
                    saturation: 0.93,
                    hue: 0,
                    gammaR: 0.89,
                    gammaG: 0.93,
                    gammaB: 0.68,
                    grain: 0,
                    effect: 'custom'
                }
            },
            {
                name: "Forest",  // 原GREEN
                params: {
                    brightness: 0,
                    contrast: 1,
                    saturation: 1,
                    hue: 0,
                    gammaR: 0.74,
                    gammaG: 1,
                    gammaB: 1,
                    grain: 6,
                    effect: 'custom'
                }
            },
            {
                name: "Ocean",  // 原BLUE
                params: {
                    brightness: 13,
                    contrast: 1.07,
                    saturation: 1.31,
                    hue: 0,
                    gammaR: 1.07,
                    gammaG: 1.09,
                    gammaB: 1.24,
                    grain: 0,
                    effect: 'custom'
                }
            },
            
            // 新增16个微调滤镜
            {
                name: "Soft Light",
                params: {
                    brightness: 5,
                    contrast: 0.98,
                    saturation: 0.95,
                    hue: 5,
                    gammaR: 1.02,
                    gammaG: 0.99,
                    gammaB: 0.97,
                    grain: 2,
                    effect: 'custom'
                }
            },
            {
                name: "Vintage",
                params: {
                    brightness: 3,
                    contrast: 1.05,
                    saturation: 0.88,
                    hue: 12,
                    gammaR: 0.95,
                    gammaG: 0.92,
                    gammaB: 0.85,
                    grain: 8,
                    effect: 'custom'
                }
            },
            {
                name: "Cool Breeze",
                params: {
                    brightness: 8,
                    contrast: 1.03,
                    saturation: 1.05,
                    hue: -5,
                    gammaR: 0.96,
                    gammaG: 1.01,
                    gammaB: 1.08,
                    grain: 1,
                    effect: 'custom'
                }
            },
            {
                name: "Golden Hour",
                params: {
                    brightness: 6,
                    contrast: 1.08,
                    saturation: 1.12,
                    hue: 8,
                    gammaR: 1.05,
                    gammaG: 1.02,
                    gammaB: 0.92,
                    grain: 3,
                    effect: 'custom'
                }
            },
            {
                name: "Muted",
                params: {
                    brightness: 4,
                    contrast: 0.95,
                    saturation: 0.75,
                    hue: 0,
                    gammaR: 1.03,
                    gammaG: 1.01,
                    gammaB: 0.98,
                    grain: 4,
                    effect: 'custom'
                }
            },
            {
                name: "Pop Color",
                params: {
                    brightness: 2,
                    contrast: 1.12,
                    saturation: 1.25,
                    hue: 3,
                    gammaR: 0.98,
                    gammaG: 1.04,
                    gammaB: 0.96,
                    grain: 0,
                    effect: 'custom'
                }
            },
            {
                name: "Morning",
                params: {
                    brightness: 10,
                    contrast: 1.01,
                    saturation: 1.08,
                    hue: -3,
                    gammaR: 0.93,
                    gammaG: 1.00,
                    gammaB: 1.05,
                    grain: 2,
                    effect: 'custom'
                }
            },
            {
                name: "Evening",
                params: {
                    brightness: -2,
                    contrast: 1.09,
                    saturation: 1.15,
                    hue: 10,
                    gammaR: 1.08,
                    gammaG: 1.03,
                    gammaB: 0.94,
                    grain: 5,
                    effect: 'custom'
                }
            },
            {
                name: "Cinematic",
                params: {
                    brightness: -4,
                    contrast: 1.15,
                    saturation: 1.18,
                    hue: -8,
                    gammaR: 0.92,
                    gammaG: 1.02,
                    gammaB: 1.10,
                    grain: 7,
                    effect: 'custom'
                }
            },
            {
                name: "Portrait",
                params: {
                    brightness: 7,
                    contrast: 1.04,
                    saturation: 0.92,
                    hue: 2,
                    gammaR: 1.01,
                    gammaG: 0.98,
                    gammaB: 0.96,
                    grain: 1,
                    effect: 'custom'
                }
            },
            {
                name: "Urban",
                params: {
                    brightness: 1,
                    contrast: 1.18,
                    saturation: 1.22,
                    hue: -2,
                    gammaR: 0.99,
                    gammaG: 1.06,
                    gammaB: 1.03,
                    grain: 3,
                    effect: 'custom'
                }
            },
            {
                name: "Clear Sky",
                params: {
                    brightness: 12,
                    contrast: 1.02,
                    saturation: 1.28,
                    hue: -10,
                    gammaR: 0.94,
                    gammaG: 1.01,
                    gammaB: 1.12,
                    grain: 0,
                    effect: 'custom'
                }
            },
            {
                name: "Warm Tone",
                params: {
                    brightness: 5,
                    contrast: 1.06,
                    saturation: 1.09,
                    hue: 6,
                    gammaR: 1.04,
                    gammaG: 1.01,
                    gammaB: 0.90,
                    grain: 2,
                    effect: 'custom'
                }
            },
            {
                name: "Cool Tone",
                params: {
                    brightness: 9,
                    contrast: 1.03,
                    saturation: 1.14,
                    hue: -7,
                    gammaR: 0.95,
                    gammaG: 1.00,
                    gammaB: 1.07,
                    grain: 1,
                    effect: 'custom'
                }
            },
            {
                name: "Subtle",
                params: {
                    brightness: 3,
                    contrast: 0.99,
                    saturation: 0.85,
                    hue: 1,
                    gammaR: 1.00,
                    gammaG: 0.99,
                    gammaB: 0.98,
                    grain: 2,
                    effect: 'custom'
                }
            },
            {
                name: "Vibrant",
                params: {
                    brightness: 4,
                    contrast: 1.14,
                    saturation: 1.35,
                    hue: 4,
                    gammaR: 0.97,
                    gammaG: 1.05,
                    gammaB: 0.94,
                    grain: 0,
                    effect: 'custom'
                }
            },
            {
                name: "Dreamy",
                params: {
                    brightness: 8,
                    contrast: 0.97,
                    saturation: 0.78,
                    hue: 3,
                    gammaR: 1.02,
                    gammaG: 0.96,
                    gammaB: 0.99,
                    grain: 9,
                    effect: 'custom'
                }
            },
            // 新增5个风格化滤镜（放在已有滤镜后面）
{
    name: "Noir",
    params: {
        brightness: -12,
        contrast: 1.25,
        saturation: 0.15,
        hue: 0,
        gammaR: 1.18,
        gammaG: 1.15,
        gammaB: 0.85,
        grain: 12,
        effect: 'custom'
    }
},
{
    name: "Cyanotype",
    params: {
        brightness: 15,
        contrast: 1.08,
        saturation: 0.45,
        hue: 195,
        gammaR: 0.88,
        gammaG: 0.95,
        gammaB: 1.22,
        grain: 15,
        effect: 'custom'
    }
},
{
    name: "Sepia",
    params: {
        brightness: 8,
        contrast: 1.12,
        saturation: 0.35,
        hue: 38,
        gammaR: 0.92,
        gammaG: 0.88,
        gammaB: 0.75,
        grain: 18,
        effect: 'custom'
    }
},
{
    name: "Lomo",
    params: {
        brightness: -5,
        contrast: 1.28,
        saturation: 1.42,
        hue: -15,
        gammaR: 1.15,
        gammaG: 1.08,
        gammaB: 0.92,
        grain: 22,
        effect: 'custom'
    }
},
{
    name: "HDR",
    params: {
        brightness: 2,
        contrast: 1.45,
        saturation: 1.65,
        hue: 5,
        gammaR: 1.22,
        gammaG: 1.18,
        gammaB: 1.15,
        grain: 5,
        effect: 'custom'
    }
}
            
        ];
        this.render();
        this.initEventListeners();
    }

    // 渲染滤镜模板折叠栏（默认折叠，放在Color Controls上方）
    render() {
        // 拼接4个滤镜按钮，每行2个布局
        let filterButtonsHtml = '';
        this.filterTemplates.forEach((filter, index) => {
            filterButtonsHtml += `
                <button class="filter-template-btn" data-index="${index}">
                    ${filter.name}
                </button>
            `;
        });

        // 折叠栏HTML结构：默认折叠，初始图标为朝上（与NT一致）
        const filterTempHtml = `
            <details class="collapsible-section filter-temp-section">
                <summary class="collapsible-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span>Filter template</span>
                    </div>
                    <!-- 修改为朝上（默认折叠，与NT一致） -->
                    <i class="fas fa-chevron-up collapsible-arrow"></i>
                </summary>
                <div class="filter-template-buttons">
                    ${filterButtonsHtml}
                </div>
            </details>
        `;

        // 将滤镜模板折叠栏插入到容器最顶部（确保在Color Controls上方）
        this.container.insertAdjacentHTML('afterbegin', filterTempHtml);
    }

    // 初始化事件监听（按钮点击应用滤镜+图标类名切换）
    initEventListeners() {
        // 折叠箭头切换逻辑：改为与NT一致
        const details = this.container.querySelector('.filter-temp-section');
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

        // 滤镜按钮点击事件：应用对应参数到Color Controls并刷新图片
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
        colorControls.brightnessControl.value = params.brightness;
        colorControls.contrastControl.value = params.contrast;
        colorControls.saturationControl.value = params.saturation;
        colorControls.hueControl.value = params.hue;
        colorControls.gammaRControl.value = params.gammaR;
        colorControls.gammaGControl.value = params.gammaG;
        colorControls.gammaBControl.value = params.gammaB;
        colorControls.grainControl.value = params.grain;

        // 2. 更新滑块显示文本
        colorControls.brightnessValue.textContent = params.brightness;
        colorControls.contrastValue.textContent = params.contrast;
        colorControls.saturationValue.textContent = params.saturation;
        colorControls.hueValue.textContent = params.hue;
        colorControls.gammaRValues.textContent = params.gammaR;
        colorControls.gammaGValues.textContent = params.gammaG;
        colorControls.gammaBValues.textContent = params.gammaB;
        colorControls.grainValue.textContent = params.grain;

        // 3. 强制设置为custom效果，确保参数生效
        const customRadio = this.tool.container.querySelector('input[name="effect"][value="custom"]');
        if (customRadio) {
            customRadio.checked = true;
            this.tool.handleEffectChange?.();
        }

        // 4. 应用滤镜到图像
        this.tool.applyFilters();
    }
}