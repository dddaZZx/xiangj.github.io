class JL_CAM_Tool {
    constructor(container, ctx, canvas) {
        this.container = container;
        this.ctx = ctx;
        this.canvas = canvas;
        this.originalImageData = null;
        this.currentImageData = null;
        this.imgWidth = 0;
        this.imgHeight = 0;
        
        this.render();
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
                
                <!-- Gamma slider -->
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
                
                <!-- The Grain effect will cause the camera to lag, so it will not be used temporarily. -->
                <!-- Grain slider -->
                <!-- Grain slider -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Grain: <span class="tooltip"><i class="fas fa-info-circle"></i><span class="tooltiptext">The higher the grain intensity, the longer it will take to switch filters and take photos.</span></span></span>
                        <span id="grainValue">0</span>
                    </div>
                    <input type="range" id="grain" class="slider" min="0" max="64" step="1" value="0" title="Grain">
                </div>
                
                <!-- Button group -->
                <div class="button-group">
                    <button id="loadButton" class="import-button">Load Filter</button>
                    <input type="file" id="filterUpload" accept=".flt" style="display: none;">
                    <button id="resetButton" class="reset-button">RESET</button>
                    <button id="exportButton" class="export-button">Save Filter</button>
                </div>
                
                <!-- Special effect selection -->
                <div class="radio-group" style="display: none;">
                    <label>
                        <input type="radio" name="effect" id="customEffect" value="custom" checked>
                        Custom
                    </label>
                    <label>
                        <input type="radio" name="effect" id="standardEffect" value="standard">
                        Standard
                    </label>
                    <label>
                        <input type="radio" name="effect" id="retroEffect" value="retro">
                        Retro Effect
                    </label>
                    <label>
                        <input type="radio" name="effect" id="grayEffect" value="gray">
                        Grayscale Effect
                    </label>
                </div>

            </div>
        `;
    }
    
    initEventListeners() {
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
        this.effectRadios = this.container.querySelectorAll('input[name="effect"]');
        
        this.brightnessControl.addEventListener('input', () => this.updateValue(this.brightnessControl, this.brightnessValue));
        this.contrastControl.addEventListener('input', () => this.updateValue(this.contrastControl, this.contrastValue));
        this.saturationControl.addEventListener('input', () => this.updateValue(this.saturationControl, this.saturationValue));
        this.hueControl.addEventListener('input', () => this.updateValue(this.hueControl, this.hueValue));
        this.gammaRControl.addEventListener('input', () => this.updateGammaValues());
        this.gammaGControl.addEventListener('input', () => this.updateGammaValues());
        this.gammaBControl.addEventListener('input', () => this.updateGammaValues());
        this.grainControl.addEventListener('input', () => this.updateValue(this.grainControl, this.grainValue));
        
        this.resetButton.addEventListener('click', () => this.resetFilters());
        this.exportButton.addEventListener('click', () => this.exportTablesAsTxt());
        
        this.effectRadios.forEach(radio => 
            radio.addEventListener('change', () => this.handleEffectChange())
        );

        const loadButton = this.container.querySelector('#loadButton');
        const filterUpload = this.container.querySelector('#filterUpload');
        
        loadButton.addEventListener('click', () => {
            filterUpload.click();
        });
        
        filterUpload.addEventListener('change', (e) => this.handleFilterUpload(e));
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
        [this.gammaRControl, this.gammaGControl, this.gammaBControl].forEach(control => {
            if (control.value === "1") {
                control.value = "1.0";
                const display = control === this.gammaRControl ? this.gammaRValues :
                            control === this.gammaGControl ? this.gammaGValues : this.gammaBValues;
                display.textContent = "1.0";
            }
        });
        if (!this.processedPixels) return;
    
        const imageData = this.ctx.getImageData(0, 0, this.imgWidth, this.imgHeight);
        const pixels = imageData.data;
        pixels.set(this.processedPixels);
    
        const brightness = parseFloat(this.brightnessControl.value);
        const contrast = parseFloat(this.contrastControl.value);
        const saturation = parseFloat(this.saturationControl.value);
        const hue = parseFloat(this.hueControl.value);
        const gammaR = parseFloat(this.gammaRControl.value);
        const gammaG = parseFloat(this.gammaGControl.value);
        const gammaB = parseFloat(this.gammaBControl.value);
        const grain = parseFloat(this.grainControl.value); 
        const selectedEffect = this.container.querySelector('input[name="effect"]:checked').value;
    
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
    
    updateValue(control, display) {
        display.textContent = control.value;
        this.applyFilters();
    }
    
    updateGammaValues() {
        const selectedEffect = this.container.querySelector('input[name="effect"]:checked').value;
        
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
        
        this.applyFilters();
    }
    
    resetFilters() {
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
        
        this.container.querySelector('#customEffect').checked = true;
        this.handleEffectChange();
    }
    
    handleEffectChange() {
        const selectedEffect = this.container.querySelector('input[name="effect"]:checked').value;
        
        this.brightnessControl.disabled = false;
        this.contrastControl.disabled = false;
        this.saturationControl.disabled = false;
        this.hueControl.disabled = false;
        this.gammaRControl.disabled = false;
        this.gammaGControl.disabled = false;
        this.gammaBControl.disabled = false;
        this.grainControl.disabled = false;
        
        switch (selectedEffect) {
            case 'custom':
                break;
            case 'standard':
                this.brightnessControl.value = 0;
                this.brightnessValue.textContent = "0";
                this.contrastControl.value = "1.0";
                this.contrastValue.textContent = "1.0";
                this.saturationControl.value = "1.0";
                this.saturationValue.textContent = "1.0";
                [this.gammaRControl, this.gammaGControl, this.gammaBControl].forEach(control => {
                    control.value = "1.0";
                });
                [this.gammaRValues, this.gammaGValues, this.gammaBValues].forEach(display => {
                    display.textContent = "1.0";
                });
                this.hueControl.value = 0;
                this.hueValue.textContent = "0";
                this.grainControl.value = 0;
                this.grainValue.textContent = "0";
                break;
            case 'retro':
                this.brightnessControl.value = 0;
                this.brightnessValue.textContent = "0";
                this.contrastControl.value = "1.0";
                this.contrastValue.textContent = "1.0";
                [this.gammaRControl, this.gammaGControl, this.gammaBControl].forEach(control => {
                    control.value = "1.0";
                });
                [this.gammaRValues, this.gammaGValues, this.gammaBValues].forEach(display => {
                    display.textContent = "1.0";
                });
                this.brightnessControl.disabled = true;
                this.contrastControl.disabled = true;
                this.gammaRControl.disabled = true;
                this.gammaGControl.disabled = true;
                this.gammaBControl.disabled = true;
                break;
            case 'gray':
                this.saturationControl.value = 0;
                this.saturationValue.textContent = "0";
                this.saturationControl.disabled = true;
                this.hueControl.disabled = true;
                this.gammaGControl.value = "1.0";
                this.gammaGValues.textContent = "1.0";
                this.gammaBControl.value = "1.0";
                this.gammaBValues.textContent = "1.0";
                this.gammaGControl.disabled = true;
                this.gammaBControl.disabled = true;
                break;
        }
        
        this.applyFilters();
    }
    
    async exportTablesAsTxt() {
        try {
            const colorCorrectionMatrix = Array.from({ length: 3 }, () => Array(3).fill(0));
            if (window.V105Filters?.makeCCMatrix) {
                const saturation = parseFloat(this.saturationControl.value);
                const hue = parseFloat(this.hueControl.value);
                window.V105Filters.makeCCMatrix(saturation, hue, colorCorrectionMatrix);
            }
            this.updateHiddenTable('colorCorrectionMatrixTable', colorCorrectionMatrix);
    
            const segDLookupTable = Array.from({ length: 256 }, () => Array(3).fill(0));
            const brightness = parseFloat(this.brightnessControl.value);
            const contrast = parseFloat(this.contrastControl.value);
            const gammaR = parseFloat(this.gammaRControl.value);
            const gammaG = parseFloat(this.gammaGControl.value);
            const gammaB = parseFloat(this.gammaBControl.value);
            const grain = parseFloat(this.grainControl.value);
            
            if (window.V105Filters?.makeSegDLookupTable) {
                window.V105Filters.makeSegDLookupTable(
                    brightness, contrast, gammaR, gammaG, gammaB, segDLookupTable
                );
            }
            this.updateHiddenSegTable('segDLookupTable', segDLookupTable);
    
            const colorCorrectionMatrixData = this.extractMatrixData('colorCorrectionMatrixTable', 1024);
            const segDLookupTableData = this.extractSegTableData('segDLookupTable');

            const controlValues = [
                `brightness:${this.brightnessControl.value}`,
                `contrast:${this.contrastControl.value}`,
                `saturation:${this.saturationControl.value}`,
                `hue:${this.hueControl.value}`,
                `gammaR:${this.gammaRControl.value}`,
                `gammaG:${this.gammaGControl.value}`,
                `gammaB:${this.gammaBControl.value}`,
                `grain:${this.grainControl.value}`,
                `effect:${this.container.querySelector('input[name="effect"]:checked').value}`
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
        this.brightnessControl.value = isNaN(filterData.brightness) ? 0 : filterData.brightness;
        this.contrastControl.value = isNaN(filterData.contrast) ? 1.0 : filterData.contrast;
        this.saturationControl.value = isNaN(filterData.saturation) ? 1.0 : filterData.saturation;
        this.hueControl.value = isNaN(filterData.hue) ? 0 : filterData.hue;
        this.gammaRControl.value = isNaN(filterData.gammaR) ? 1.0 : filterData.gammaR;
        this.gammaGControl.value = isNaN(filterData.gammaG) ? 1.0 : filterData.gammaG;
        this.gammaBControl.value = isNaN(filterData.gammaB) ? 1.0 : filterData.gammaB;
        this.grainControl.value = isNaN(filterData.grain) ? 0 : filterData.grain;
        
        this.brightnessValue.textContent = this.brightnessControl.value;
        this.contrastValue.textContent = this.contrastControl.value;
        this.saturationValue.textContent = this.saturationControl.value;
        this.hueValue.textContent = this.hueControl.value;
        this.gammaRValues.textContent = this.gammaRControl.value;
        this.gammaGValues.textContent = this.gammaGControl.value;
        this.gammaBValues.textContent = this.gammaBControl.value;
        this.grainValue.textContent = this.grainControl.value;

        this.container.querySelector('#customEffect').checked = true;
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
            const grain = parseFloat(this.grainControl.value);
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