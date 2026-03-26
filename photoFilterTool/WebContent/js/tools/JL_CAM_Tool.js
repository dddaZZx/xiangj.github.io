class JL_CAM_Tool {
    constructor(container, ctx, canvas) {
        this.container = container;
        this.ctx = ctx;
        this.canvas = canvas;
        this.originalImageData = null;
        this.currentImageData = null;
        this.imgWidth = 0;
        this.imgHeight = 0;
        
        // 初始化颜色控制组件
        this.colorControls = new JL_CAM_ColorControls(this, container);
        
        this.render();
    }
    
    render() {
        // 界面渲染已移到 JL_CAM_ColorControls 中
        // 这里可以添加其他核心功能的初始化
    }
    
    onImageUpload(img) {
        this.imgWidth = img.width;
        this.imgHeight = img.height;
        
        this.canvas.width = this.imgWidth;
        this.canvas.height = this.imgHeight;
        
        this.ctx.drawImage(img, 0, 0);
        
        const imageData = this.ctx.getImageData(0, 0, this.imgWidth, this.imgHeight);
        this.preprocessImage(imageData);
        this.processedPixels = new Uint8ClampedArray(imageData.data);
        
        this.ctx.putImageData(imageData, 0, 0);
        this.applyFilters();
        
        this.originalImage = img;
    }
    
    preprocessImage(imageData) {
        if (window.V105Filters?.applyInverseGammaTableRGBA) {
            window.V105Filters.applyInverseGammaTableRGBA(
                imageData.data, 
                imageData.width, 
                imageData.height, 
                window.V105Filters.gamma_table
            );
        }
    }
    
    applyFilters() {
        if (!this.processedPixels) return;
    
        const imageData = this.ctx.getImageData(0, 0, this.imgWidth, this.imgHeight);
        const pixels = imageData.data;
        pixels.set(this.processedPixels);
    
        // 从颜色控制器获取当前值
        const values = this.colorControls.getCurrentValues();
        const { brightness, contrast, saturation, hue, gammaR, gammaG, gammaB, grain, selectedEffect } = values;
    
        if (window.V105Filters?.makeCCMatrix && window.V105Filters?.applyMatrix) {
            const colorCorrectionMatrix = Array.from({ length: 3 }, () => Array(3).fill(0));
            window.V105Filters.makeCCMatrix(saturation, hue, colorCorrectionMatrix);
            window.V105Filters.applyMatrix(pixels, this.imgWidth, this.imgHeight, colorCorrectionMatrix);
        }
    
        if (window.V105Filters?.applyGammaTableRGBA) {
            window.V105Filters.applyGammaTableRGBA(pixels, this.imgWidth, this.imgHeight, window.V105Filters.gamma_table);
        }
    
        if (window.V105Filters?.makeSegDLookupTable && window.V105Filters?.applySegDLookupTableRGBA) {
            const segDLookupTable = Array.from({ length: 256 }, () => Array(3).fill(0));
            
            if (selectedEffect === 'retro' && window.V105Filters?.makeRetroSegLookupTable) {
                window.V105Filters.makeRetroSegLookupTable(segDLookupTable);
            } else {
                window.V105Filters.makeSegDLookupTable(brightness, contrast, gammaR, gammaG, gammaB, segDLookupTable);
            }
            
            window.V105Filters.applySegDLookupTableRGBA(pixels, this.imgWidth, this.imgHeight, segDLookupTable);
        }
        
        if (window.V105Filters?.applyGrainLevelNoise) {
            window.V105Filters.applyGrainLevelNoise(pixels, this.imgWidth, this.imgHeight, grain, this.imgWidth, this.imgHeight);
        }
    
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    resetFilters() {
        this.colorControls.resetControls();
        this.applyFilters();
    }
    
    handleEffectChange() {
        // 安全获取当前选中的效果
        const checkedEffect = this.container.querySelector('input[name="effect"]:checked');
        let selectedEffect = 'custom'; // 默认值
        
        if (checkedEffect) {
            selectedEffect = checkedEffect.value;
        }
        
        // 先确保所有控件启用
        ['brightness', 'contrast', 'saturation', 'hue', 'gammaR', 'gammaG', 'gammaB', 'grain'].forEach(id => {
            this.colorControls.disableControl(id, false);
        });
        
        // 仅当选中的是预设效果时，才强制覆盖滑块值
        // 如果是 'custom'，保持滑块不动（这样在加载FLT文件时不会丢失参数）
        switch (selectedEffect) {
            case 'custom':
                // 不做任何操作，保留当前的滑块值
                break;
            case 'standard':
                this.colorControls.brightnessControl.value = 0;
                this.colorControls.brightnessValue.textContent = "0";
                this.colorControls.contrastControl.value = "1.0";
                this.colorControls.contrastValue.textContent = "1.0";
                this.colorControls.saturationControl.value = "1.0";
                this.colorControls.saturationValue.textContent = "1.0";
                [this.colorControls.gammaRControl, this.colorControls.gammaGControl, this.colorControls.gammaBControl].forEach(control => {
                    control.value = "1.0";
                });
                [this.colorControls.gammaRValues, this.colorControls.gammaGValues, this.colorControls.gammaBValues].forEach(display => {
                    display.textContent = "1.0";
                });
                this.colorControls.hueControl.value = 0;
                this.colorControls.hueValue.textContent = "0";
                this.colorControls.grainControl.value = 0;
                this.colorControls.grainValue.textContent = "0";
                break;
            case 'retro':
                this.colorControls.brightnessControl.value = 0;
                this.colorControls.brightnessValue.textContent = "0";
                this.colorControls.contrastControl.value = "1.0";
                this.colorControls.contrastValue.textContent = "1.0";
                [this.colorControls.gammaRControl, this.colorControls.gammaGControl, this.colorControls.gammaBControl].forEach(control => {
                    control.value = "1.0";
                });
                [this.colorControls.gammaRValues, this.colorControls.gammaGValues, this.colorControls.gammaBValues].forEach(display => {
                    display.textContent = "1.0";
                });
                this.colorControls.disableControl('brightness', true);
                this.colorControls.disableControl('contrast', true);
                this.colorControls.disableControl('gammaR', true);
                this.colorControls.disableControl('gammaG', true);
                this.colorControls.disableControl('gammaB', true);
                break;
            case 'gray':
                this.colorControls.saturationControl.value = 0;
                this.colorControls.saturationValue.textContent = "0";
                this.colorControls.disableControl('saturation', true);
                this.colorControls.disableControl('hue', true);
                this.colorControls.gammaGControl.value = "1.0";
                this.colorControls.gammaGValues.textContent = "1.0";
                this.colorControls.gammaBControl.value = "1.0";
                this.colorControls.gammaBValues.textContent = "1.0";
                this.colorControls.disableControl('gammaG', true);
                this.colorControls.disableControl('gammaB', true);
                break;
        }
        
        this.applyFilters();
    }
    
    async exportTablesAsTxt() {
        try {
            const values = this.colorControls.getCurrentValues();
            const { brightness, contrast, saturation, hue, gammaR, gammaG, gammaB, grain } = values;
            
            const colorCorrectionMatrix = Array.from({ length: 3 }, () => Array(3).fill(0));
            if (window.V105Filters?.makeCCMatrix) {
                window.V105Filters.makeCCMatrix(saturation, hue, colorCorrectionMatrix);
            }
            this.updateHiddenTable('colorCorrectionMatrixTable', colorCorrectionMatrix);
    
            const segDLookupTable = Array.from({ length: 256 }, () => Array(3).fill(0));
            
            if (window.V105Filters?.makeSegDLookupTable) {
                window.V105Filters.makeSegDLookupTable(
                    brightness, contrast, gammaR, gammaG, gammaB, segDLookupTable
                );
            }
            this.updateHiddenSegTable('segDLookupTable', segDLookupTable);
    
            const colorCorrectionMatrixData = this.extractMatrixData('colorCorrectionMatrixTable', 1024);
            const segDLookupTableData = this.extractSegTableData('segDLookupTable');

            const controlValues = [
                `brightness:${brightness}`,
                `contrast:${contrast}`,
                `saturation:${saturation}`,
                `hue:${hue}`,
                `gammaR:${gammaR}`,
                `gammaG:${gammaG}`,
                `gammaB:${gammaB}`,
                `grain:${grain}`,
                `effect:${values.selectedEffect}`
            ].join('\n');
            const content = '\n\n' + `${colorCorrectionMatrixData}\n${segDLookupTableData}\n${grain}\n${controlValues}`;
    
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'table.flt',
                        types: [{ description: 'FLT Files', accept: { 'text/plain': ['.flt'] } }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    return;
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        throw error;
                    }
                    return;
                }
            }else {
                // 只有在不支持showSaveFilePicker时才使用备用方案
                this.startDownload(content);
            }
    
        } catch (error) {
            console.error('Export failed:', error);
        }
    }

    startDownload(content) {
        var blob = new Blob([content], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'table.flt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 100);
    }

    updateHiddenTable(tableId, matrix) {
        const table = this.container.querySelector(`#${tableId}`);
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        matrix.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(value => {
                const td = document.createElement('td');
                td.textContent = value.toFixed(2);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    updateHiddenSegTable(tableId, tableData) {
        const table = this.container.querySelector(`#${tableId}`);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        ['R', 'G', 'B'].forEach((color, colorIndex) => {
            const tr = document.createElement('tr');
            const labelTd = document.createElement('td');
            labelTd.textContent = `${color}:`;
            tr.appendChild(labelTd);

            tableData.forEach(row => {
                const td = document.createElement('td');
                td.textContent = row[colorIndex].toFixed(2);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
    }

    extractMatrixData(tableId, scaleFactor = 1024) {
        const table = this.container.querySelector(`#${tableId}`);
        if (!table) return "";

        const rows = table.querySelectorAll('tbody tr');
        let matrixData = "";

        rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.querySelectorAll('td'))
                .map(cell => Math.round(parseFloat(cell.textContent.trim()) * scaleFactor));
            matrixData += `${cells.join(', ')}${rowIndex < rows.length - 1 ? ', ' : ''}\n`;
        });

        return matrixData.trim();
    }

    extractSegTableData(tableId) {
        const table = this.container.querySelector(`#${tableId}`);
        if (!table) return "";

        const rows = table.querySelectorAll('tbody tr');
        let segData = "";
        const colorData = {
            R: [],
            G: [],
            B: []
        };

        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td');
            if (cells[0].textContent.includes("R:")) {
                for (let i = 1; i < cells.length; i++) {
                    colorData.R.push(Math.round(parseFloat(cells[i].textContent.trim())));
                }
            } else if (cells[0].textContent.includes("G:")) {
                for (let i = 1; i < cells.length; i++) {
                    colorData.G.push(Math.round(parseFloat(cells[i].textContent.trim())));
                }
            } else if (cells[0].textContent.includes("B:")) {
                for (let i = 1; i < cells.length; i++) {
                    colorData.B.push(Math.round(parseFloat(cells[i].textContent.trim())));
                }
            }
        });

        segData += `${colorData.R.join(', ')}\n`;
        segData += `${colorData.G.join(', ')}\n`;
        segData += `${colorData.B.join(', ')}`;

        return segData.trim();
    }

    handleFilterUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        event.target.value = '';

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                console.log("Starting to parse FLT file...");
                const content = e.target.result;
                const filterData = this.parseFilterData(content);
                
                console.log("Successfully parsed filter data:", filterData);
                
                this.updateControls(filterData);
                
                this.applyFiltersByValues(
                    filterData.brightness,
                    filterData.contrast,
                    filterData.saturation,
                    filterData.hue,
                    filterData.gammaR,
                    filterData.gammaG,
                    filterData.gammaB,
                    filterData.colorCorrectionMatrix,
                    filterData.segDLookupMatrix
                );
                
                console.log("Filter applied successfully");
            } catch (error) {
                console.error("Error loading filter file:", error);
                alert(`Error loading filter: ${error.message}`);
            }
        };
        
        reader.onerror = () => {
            console.error("File reading error:", reader.error);
            alert("Error reading file");
        };
        
        reader.readAsText(file);
    }

    parseFilterData(content) {
        console.log("Raw FLT file content:", content);
        
        const lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');
        console.log("Lines after split:", lines);

        let matrixAndLutLines = [];
        let controlLines = [];
        
        let controlStartIndex = lines.findIndex(line => line.startsWith('brightness:'));
        if (controlStartIndex !== -1) {
            matrixAndLutLines = lines.slice(0, controlStartIndex);
            controlLines = lines.slice(controlStartIndex);
        } else {
            matrixAndLutLines = [...lines];
        }
        
        let allValues = [];
        matrixAndLutLines.forEach(line => {
            const lineValues = line.split(',')
                .map(val => val.trim())
                .filter(val => val !== '');
            allValues = [...allValues, ...lineValues];
        });
        
        console.log("All parsed values count:", allValues.length);
        console.log("First 20 values:", allValues.slice(0, 20));
        
        if (allValues.length !== 778) {
            console.error("Invalid FLT format: Expected 778 values (9 matrix + 768 LUT)");
            throw new Error(`Invalid FLT format: Got ${allValues.length} values, expected 778`);
        }
        
        const colorCorrectionMatrix = [
            [this.parseValue(allValues[0]), this.parseValue(allValues[1]), this.parseValue(allValues[2])],
            [this.parseValue(allValues[3]), this.parseValue(allValues[4]), this.parseValue(allValues[5])],
            [this.parseValue(allValues[6]), this.parseValue(allValues[7]), this.parseValue(allValues[8])]
        ];
        
        console.log("Parsed color correction matrix:", colorCorrectionMatrix);
        
        const segDLookupMatrix = [
            allValues.slice(9, 265).map(val => this.parseValue(val)),
            allValues.slice(265, 521).map(val => this.parseValue(val)),
            allValues.slice(521, 777).map(val => this.parseValue(val))
        ];
        
        console.log("First 5 values of each lookup channel:", {
            R: segDLookupMatrix[0].slice(0, 5),
            G: segDLookupMatrix[1].slice(0, 5),
            B: segDLookupMatrix[2].slice(0, 5)
        });
        
        const controlValues = {};
        controlLines.forEach(line => {
            const [key, value] = line.split(':').map(item => item.trim());
            if (key && value !== undefined) {
                switch(key) {
                    case 'brightness':
                    case 'contrast':
                    case 'saturation':
                    case 'hue':
                    case 'gammaR':
                    case 'gammaG':
                    case 'gammaB':
                    case 'grain':
                        controlValues[key] = this.parseValue(value);
                        break;
                    case 'effect':
                        controlValues[key] = value;
                        break;
                }
            }
        });
        
        const defaults = {
            brightness: 0,
            contrast: 1.0,
            saturation: 1.0,
            hue: 0,
            gammaR: 1.0,
            gammaG: 1.0,
            gammaB: 1.0,
            grain: 0,
            effect: 'custom'
        };
        
        const parsedControls = { ...defaults, ...controlValues };
        
        console.log("Parsed control values:", parsedControls);
        
        return {
            ...parsedControls,
            colorCorrectionMatrix,
            segDLookupMatrix
        };
    }

    parseValue(val) {
        const num = parseFloat(val);
        if (isNaN(num)) {
            console.warn("Invalid number value:", val);
            return 0;
        }
        return num;
    }

    updateControls(filterData) {
        // 1. 更新滑块的值
        this.colorControls.brightnessControl.value = isNaN(filterData.brightness) ? 0 : filterData.brightness;
        this.colorControls.contrastControl.value = isNaN(filterData.contrast) ? 1.0 : filterData.contrast;
        this.colorControls.saturationControl.value = isNaN(filterData.saturation) ? 1.0 : filterData.saturation;
        this.colorControls.hueControl.value = isNaN(filterData.hue) ? 0 : filterData.hue;
        this.colorControls.gammaRControl.value = isNaN(filterData.gammaR) ? 1.0 : filterData.gammaR;
        this.colorControls.gammaGControl.value = isNaN(filterData.gammaG) ? 1.0 : filterData.gammaG;
        this.colorControls.gammaBControl.value = isNaN(filterData.gammaB) ? 1.0 : filterData.gammaB;
        this.colorControls.grainControl.value = isNaN(filterData.grain) ? 0 : filterData.grain;
        
        // 2. 更新显示的数值文本 (修复了原始代码中的 saturationControl.textContent 错误)
        this.colorControls.brightnessValue.textContent = this.colorControls.brightnessControl.value;
        this.colorControls.contrastValue.textContent = this.colorControls.contrastControl.value;
        this.colorControls.saturationValue.textContent = this.colorControls.saturationControl.value;
        this.colorControls.hueValue.textContent = this.colorControls.hueControl.value;
        this.colorControls.gammaRValues.textContent = this.colorControls.gammaRControl.value;
        this.colorControls.gammaGValues.textContent = this.colorControls.gammaGControl.value;
        this.colorControls.gammaBValues.textContent = this.colorControls.gammaBControl.value;
        this.colorControls.grainValue.textContent = this.colorControls.grainControl.value;

        // 3. 将 UI 状态切换为 Custom，但不强制覆盖滑块值
        // 查找名为 "effect" 的单选按钮组
        const customRadio = this.container.querySelector('input[name="effect"][value="custom"]');
        
        if (customRadio) {
            customRadio.checked = true;
        }
        
        // 触发 handleEffectChange 以确保 UI 状态正确（例如启用所有禁用的滑块）
        // 修改后的 handleEffectChange 在 'custom' 分支不会修改滑块值，所以是安全的
        this.handleEffectChange();
    }

    applyFiltersByValues(brightnessValue, contrastValue, saturationValue, hueValue, 
                        gammaRValue, gammaGValue, gammaBValue, CCM, SLT) {
        if (!this.processedPixels) return;

        const imageData = this.ctx.getImageData(0, 0, this.imgWidth, this.imgHeight);
        const pixels = imageData.data;
        pixels.set(this.processedPixels);
        
        if (window.V105Filters?.applyMatrix) {
            const colorCorrectionMatrix = CCM.map(row => row.map(val => val / 1024));
            window.V105Filters.applyMatrix(pixels, this.imgWidth, this.imgHeight, colorCorrectionMatrix);
        }

        if (window.V105Filters?.applyGammaTableRGBA) {
            window.V105Filters.applyGammaTableRGBA(pixels, this.imgWidth, this.imgHeight, 
                                                window.V105Filters.gamma_table);
        }

        if (window.V105Filters?.applySegDLookupTableRGBA) {
            const segDLookupTable = Array.from({ length: 256 }, (_, i) => [
                SLT[0][i], SLT[1][i], SLT[2][i]
            ]);
            window.V105Filters.applySegDLookupTableRGBA(pixels, this.imgWidth, this.imgHeight, 
                                                    segDLookupTable);
        }
        
        if (window.V105Filters?.applyGrainLevelNoise) {
            const grain = parseFloat(this.colorControls.grainControl.value);
            window.V105Filters.applyGrainLevelNoise(pixels, this.imgWidth, this.imgHeight, 
                                                  grain, this.imgWidth, this.imgHeight);
        }

        this.ctx.putImageData(imageData, 0, 0);
        
        this.updateHiddenTables(CCM, SLT);
    }

    updateHiddenTables(CCM, SLT) {
        const colorCorrectionMatrix = CCM.map(row => row.map(val => val / 1024));
        this.updateHiddenTable('colorCorrectionMatrixTable', colorCorrectionMatrix);
        
        const segDLookupTable = Array.from({ length: 256 }, (_, i) => [
            SLT[0][i], SLT[1][i], SLT[2][i]
        ]);
        this.updateHiddenSegTable('segDLookupTable', segDLookupTable);
    }
}