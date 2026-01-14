class DefaultTool {
    constructor(container, ctx, canvas) {
        this.container = container;
        this.ctx = ctx;
        this.canvas = canvas;
        
        this.render();
    }
    
    //default的render方法
    render() {
        this.container.innerHTML = `
            <div class="tool-section disabled">
                <h3>Select camera model.</h3>
                
                <!-- 亮度滑块 -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Brightness:</span>
                        <span class="slider-value">0</span>
                    </div>
                    <input type="range" class="slider" min="-255" max="255" value="0" disabled>
                </div>
    
                <!-- 对比度滑块 -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Contrast:</span>
                        <span class="slider-value">1.0</span>
                    </div>
                    <input type="range" class="slider" min="0.0" max="2.0" step="0.01" value="1.0" disabled>
                </div>
                
                <!-- 饱和度滑块 -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Saturation:</span>
                        <span class="slider-value">1.0</span>
                    </div>
                    <input type="range" class="slider" min="0.0" max="4.0" step="0.01" value="1.0" disabled>
                </div>
                
                <!-- 色相滑块 -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Hue:</span>
                        <span class="slider-value">0</span>
                    </div>
                    <input type="range" class="slider" min="0" max="360" value="0" disabled>
                </div>
                
                <!-- Gamma 滑块 -->
                <div class="slider-group">
                    <div class="slider-label">
                        <span>GammaR:</span>
                        <span class="slider-value">1.0</span>
                    </div>
                    <input type="range" class="slider" min="0.1" max="2.0" step="0.01" value="1.0" disabled>
                </div>
                
                <div class="slider-group">
                    <div class="slider-label">
                        <span>GammaG:</span>
                        <span class="slider-value">1.0</span>
                    </div>
                    <input type="range" class="slider" min="0.1" max="2.0" step="0.01" value="1.0" disabled>
                </div>
                
                <div class="slider-group">
                    <div class="slider-label">
                        <span>GammaB:</span>
                        <span class="slider-value">1.0</span>
                    </div>
                    <input type="range" class="slider" min="0.1" max="2.0" step="0.01" value="1.0" disabled>
                </div>
                
                <!-- 按钮组 -->
                <div class="button-group">
                    <button class="reset-button" disabled>RESET</button>
                    <button class="export-button" disabled>Save Filter</button>
                </div>
                
        `;
    }
    
    cleanup() {
        // 清理工作
    }
    
    onImageUpload(img) {
        // 图片上传时的处理
    }

    updateImageData() {
        // 默认工具不需要处理图像数据
    }
    
    onImageUpload(img) {
        // 默认工具只需要显示原始图片
        this.ctx.drawImage(img, 0, 0);
    }
}