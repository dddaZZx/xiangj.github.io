// main.js
document.addEventListener('DOMContentLoaded', function() {
    const toolSelect = document.getElementById('tool-select');
    const toolContainer = document.getElementById('tool-container');
    const imageUpload = document.getElementById('image-upload');
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const canvasBackground = document.querySelector('.canvas-background');
    const placeholderContent = document.querySelector('.placeholder-content');
    
    let currentImage = null;
    let currentTool = null;
    let originalImageData = null;  // 保存原始图像数据，用于对比功能
    
    // 加载默认工具
    loadTool('default');
    
    // 监听工具选择变化
    toolSelect.addEventListener('change', function() {
        loadTool(this.value);
        
        // 添加动画效果
        toolContainer.style.opacity = 0;
        setTimeout(() => {
            toolContainer.style.opacity = 1;
        }, 300);
    });
    
    imageUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            // 显示加载状态
            placeholderContent.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Loading image...</p>';
            placeholderContent.style.display = 'flex';
            
            reader.onload = async function(event) {
                const img = new Image();
                img.onload = async function() {
                    // 隐藏占位符
                    placeholderContent.style.display = 'none';
                    
                    // 清除之前的图片
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#1e272e';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // 图片的横竖显示处理
                    if(img.height > img.width){
                        document.documentElement.style.setProperty('--container-width', '512px');
                    }
                    else{
                        document.documentElement.style.setProperty('--container-width', '1024px');
                    }  

                    // 检查文件大小是否超过512K (512000 bytes)
                    if (file.size > 512000) {
                        console.log('检测到大图片，进行压缩');
                        
                        // 压缩图片到不超过512KB
                        const compressedImg = await compressImage(img, 512000);
                        currentImage = compressedImg;
                        
                        // 设置canvas尺寸
                        canvas.width = compressedImg.width;
                        canvas.height = compressedImg.height;
                        ctx.drawImage(compressedImg, 0, 0);
                        
                        // 保存原始（压缩后）图像数据
                        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        // 通知工具图片已上传
                        if (currentTool && currentTool.onImageUpload) {
                            currentTool.onImageUpload(compressedImg);
                        }
                        // 强制触发一次滤镜更新
                        if (currentTool && currentTool.applyFilters) {
                            currentTool.applyFilters();
                        }
                    } else {
                        console.log('小图片，直接使用原图');
                        
                        // 不超过512KB，直接使用原图
                        currentImage = img;
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        
                        // 保存原始图像数据
                        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        // 通知工具图片已上传
                        if (currentTool && currentTool.onImageUpload) {
                            currentTool.onImageUpload(img);
                        }
                        // 强制触发一次滤镜更新
                        if (currentTool && currentTool.applyFilters) {
                            currentTool.applyFilters();
                        }
                    }
                };
                img.onerror = function() {
                    placeholderContent.innerHTML = '<i class="fas fa-exclamation-circle"></i><p>Error loading image</p>';
                    console.error('图片加载失败');
                };
                img.src = event.target.result;
            };
            
            reader.onerror = function() {
                placeholderContent.innerHTML = '<i class="fas fa-exclamation-circle"></i><p>Error reading file</p>';
                console.error('文件读取失败');
            };
            reader.readAsDataURL(file);
        }
    });

        /**
     * 压缩图片到指定大小以下 (数学公式一步到位版)
     * @param {Image} img - 原始图片对象
     * @param {number} maxSize - 最大字节数
     * @returns {Promise<Image>} - 压缩后的图片
     */
    async function compressImage(img, maxSize) {
        const testQuality = 0.7; // 固定使用 0.7 作为基准质量，兼顾清晰度和体积计算
        
        const testCanvas = document.createElement('canvas');
        const testCtx = testCanvas.getContext('2d');
        
        let baseWidth = img.width;
        let baseHeight = img.height;
        
        // 防御机制：对于超高分辨率图片（如 7000x5000），
        // 连做一次基准 toBlob 都会非常慢，所以先粗略缩小到 800万像素以内做测试
        const maxTestPixels = 8 * 1000 * 1000; 
        if (baseWidth * baseHeight > maxTestPixels) {
            const roughScale = Math.sqrt(maxTestPixels / (baseWidth * baseHeight));
            baseWidth = Math.floor(baseWidth * roughScale);
            baseHeight = Math.floor(baseHeight * roughScale);
        }

        // 第 1 次 toBlob：获取基准数据
        testCanvas.width = baseWidth;
        testCanvas.height = baseHeight;
        testCtx.drawImage(img, 0, 0, baseWidth, baseHeight);
        
        const baseBlob = await new Promise(resolve => testCanvas.toBlob(resolve, 'image/jpeg', testQuality));
        
        // 如果基准测试就已经满足要求了，直接返回
        if (baseBlob.size <= maxSize) {
            return createImageFromBlob(baseBlob);
        }

        // 核心数学计算：算出在 testQuality 下，每个像素平均占用多少字节
        const bytesPerPixel = baseBlob.size / (baseWidth * baseHeight);
        
        // 计算为了达到 maxSize，我们最多能有多少个像素 (乘 0.9 是留 10% 的安全余量)
        const targetPixels = (maxSize * 0.9) / bytesPerPixel;
        
        // 根据原图像素数，计算需要缩放的比例
        const finalScale = Math.sqrt(targetPixels / (img.width * img.height));
        
        // 计算最终确定的宽高 (最小限制 50px，防止极端情况)
        let finalWidth = Math.max(50, Math.floor(img.width * finalScale));
        let finalHeight = Math.max(50, Math.floor(img.height * finalScale));

        // 第 2 次 toBlob：使用计算出的精确尺寸生成最终图片
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        finalCanvas.width = finalWidth;
        finalCanvas.height = finalHeight;
        finalCtx.drawImage(img, 0, 0, finalWidth, finalHeight);
        
        let finalBlob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', testQuality));

        // 第 3 次 (极少数情况)：如果因为图片色彩极多或 JPEG 算法波动刚好超了几 KB，稍微降一点质量兜底
        let currentQuality = testQuality;
        while (finalBlob.size > maxSize && currentQuality > 0.4) {
            currentQuality -= 0.1;
            finalBlob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', currentQuality));
        }

        return createImageFromBlob(finalBlob);
    }

    /**
     * 辅助函数：从 Blob 创建 Image 对象
     */
    function createImageFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const tempImg = new Image();
            tempImg.src = URL.createObjectURL(blob);
            tempImg.onload = () => {
                URL.revokeObjectURL(tempImg.src); // 释放内存
                resolve(tempImg);
            };
            tempImg.onerror = reject;
        });
    }

    function loadTool(toolName) {
        if (toolName === 'default') {
            toolContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-camera-retro"></i>
                    <p>Select a tool to start editing</p>
                </div>
            `;
            return;
        } else {
            toolContainer.innerHTML = '<div class="tool-loading"><i class="fas fa-spinner fa-spin"></i> Loading tool...</div>';
        }
        
        if (currentImage) {
            redrawOriginalImage();
        }
        
        setTimeout(() => {
            switch(toolName) {
                case 'NT-Cam':
                    currentTool = new NT_CAM_Tool(toolContainer, ctx, canvas);
                    break;
                case 'JL-Cam':
                    currentTool = new JL_CAM_Tool(toolContainer, ctx, canvas);
                    break;
                default:
                    currentTool = new DefaultTool(toolContainer, ctx, canvas);
                    break;
            }
            
            if (currentImage && currentTool.onImageUpload) {
                currentTool.onImageUpload(currentImage);
            }
        }, 300);
    }
    
    function redrawOriginalImage() {
        if (currentImage) {
            canvas.width = currentImage.width;
            canvas.height = currentImage.height;
            ctx.drawImage(currentImage, 0, 0);
            
            if (currentTool && currentTool.updateImageData) {
                currentTool.updateImageData();
            }
        }
    }
    
    // 添加拖放功能
    canvasBackground.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvasBackground.style.border = '2px dashed #6c5ce7';
    });
    
    canvasBackground.addEventListener('dragleave', () => {
        canvasBackground.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    });
    
    canvasBackground.addEventListener('drop', (e) => {
        e.preventDefault();
        canvasBackground.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            imageUpload.files = e.dataTransfer.files;
            const event = new Event('change');
            imageUpload.dispatchEvent(event);
        }
    });
    
    // 添加点击画布上传功能
    canvasBackground.addEventListener('click', () => {
        imageUpload.click();
    });
    
    // 初始化空状态
    function initEmptyState() {
        placeholderContent.innerHTML = `
            <i class="fas fa-image"></i>
            <p>No image selected</p>
            <small>Click or drop an image here</small>
        `;
        placeholderContent.style.display = 'flex';
    }
    
    initEmptyState();
    
    // 自动加载示例图片
    loadExampleImage();
    
/**
 * 自动加载示例图片 - 支持本地 file:// 和 http 环境
 */
async function loadExampleImage() {
    try {
        console.log('正在加载示例图片...');
        
        placeholderContent.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Loading example image...</p>';
        placeholderContent.style.display = 'flex';

        const imagePath = '../../img/1.jpg';  // 相对路径
        
        let blob;
        
        // 优先尝试 fetch（http/https 环境或允许的本地服务器）
        try {
            const response = await fetch(imagePath);
            if (response.ok) {
                blob = await response.blob();
                console.log('使用 fetch 加载示例图片成功');
            }
        } catch (fetchErr) {
            console.warn('fetch 加载失败，可能是本地 file:// 协议，切换到 img 标签方式', fetchErr);
        }
        
        // 如果 fetch 失败或没拿到 blob，用 <img> 标签方式加载（file:// 友好）
        if (!blob) {
            const img = new Image();
            img.src = imagePath;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('示例图片加载失败 - img 方式'));
            });
            
            // 通过 canvas 转成 blob（模拟 fetch 的输出）
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0);
            
            blob = await new Promise(resolve => {
                tempCanvas.toBlob(resolve, 'image/jpeg', 0.95);
            });
            
            console.log('使用 <img> 标签 + canvas 加载示例图片成功');
        }
        
        // 统一处理：创建 File 对象，模拟用户上传
        const file = new File([blob], 'example.jpg', { 
            type: 'image/jpeg',
            lastModified: Date.now()
        });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        imageUpload.files = dataTransfer.files;
        
        const changeEvent = new Event('change', { bubbles: true });
        imageUpload.dispatchEvent(changeEvent);
        
        console.log('示例图片加载完成');
        
    } catch (error) {
        console.error('加载示例图片失败:', error);
        placeholderContent.innerHTML = `
            <i class="fas fa-image"></i>
            <p>No image selected</p>
            <small>Click or drop an image here</small>
        `;
        placeholderContent.style.display = 'flex';
    }
}

    // 悬浮对比按钮 - 按住显示原图，松开恢复当前效果
    const compareBtn = document.getElementById('compare-btn');
    if (compareBtn) {
        let currentImageDataBeforeCompare = null;

        compareBtn.addEventListener('pointerdown', () => {
            if (!originalImageData) return;
            currentImageDataBeforeCompare = ctx.getImageData(0, 0, canvas.width, canvas.height);
            ctx.putImageData(originalImageData, 0, 0);
        });

        compareBtn.addEventListener('pointerup', () => {
            if (!currentImageDataBeforeCompare) return;
            ctx.putImageData(currentImageDataBeforeCompare, 0, 0);
            currentImageDataBeforeCompare = null;
        });

        compareBtn.addEventListener('pointerleave', () => {
            if (currentImageDataBeforeCompare) {
                ctx.putImageData(currentImageDataBeforeCompare, 0, 0);
                currentImageDataBeforeCompare = null;
            }
        });
    }
});
