// main.js
document.addEventListener('DOMContentLoaded', function() {
    const toolSelect = document.getElementById('tool-select');
    const toolContainer = document.getElementById('tool-container');
    const imageUpload = document.getElementById('image-upload');
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    const canvasBackground = document.querySelector('.canvas-background');
    const placeholderContent = document.querySelector('.placeholder-content');
    
    let currentImage = null;
    let currentTool = null;
    
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
     * 压缩图片到指定大小以下
     * @param {Image} img - 原始图片对象
     * @param {number} maxSize - 最大字节数
     * @returns {Promise<Image>} - 压缩后的图片
     */
    async function compressImage(img, maxSize) {
        let quality = 0.9; // 初始质量
        let compressedBlob = null;
        let tempCanvas = document.createElement('canvas');
        let tempCtx = tempCanvas.getContext('2d');
        
        // 设置初始尺寸（保持宽高比）
        let width = img.width;
        let height = img.height;
        
        // 首先尝试调整尺寸
        const maxDimension = 2000; // 最大尺寸限制
        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height *= maxDimension / width;
                width = maxDimension;
            } else {
                width *= maxDimension / height;
                height = maxDimension;
            }
        }
        
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCtx.drawImage(img, 0, 0, width, height);
        
        // 调整质量直到满足大小要求
        do {
            compressedBlob = await new Promise(resolve => {
                tempCanvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
            });
            
            if (compressedBlob.size > maxSize) {
                quality -= 0.1;
                // 如果质量已经很低但大小仍然太大，进一步缩小尺寸
                if (quality < 0.5 && compressedBlob.size > maxSize * 1.5) {
                    width *= 0.9;
                    height *= 0.9;
                    tempCanvas.width = width;
                    tempCanvas.height = height;
                    tempCtx.drawImage(img, 0, 0, width, height);
                }
            }
        } while (compressedBlob.size > maxSize && quality > 0.1);
        
        // 将压缩后的Blob转换为Image对象
        return new Promise((resolve, reject) => {
            const compressedImg = new Image();
            compressedImg.onload = () => resolve(compressedImg);
            compressedImg.onerror = reject;
            compressedImg.src = URL.createObjectURL(compressedBlob);
        });
    }
    
    // 加载工具函数
    function loadTool(toolName) {
        // 清除当前工具
        if (currentTool && currentTool.cleanup) {
            currentTool.cleanup();
        }
        
        // 更新UI状态
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
                case 'cs8':
                    currentTool = new NT_CAM_Tool_2(toolContainer, ctx, canvas);
                    break;
                case 'NT-Cam':  // 联咏版
                    currentTool = new NT_CAM_Tool_1(toolContainer, ctx, canvas);
                    break;
                case 'JL-Cam':
                    currentTool = new JL_CAM_Tool(toolContainer, ctx, canvas);
                    break;
                default:
                    currentTool = new DefaultTool(toolContainer, ctx, canvas);
                    break;
            }
            
            // 如果有图片，通知新工具
            if (currentImage && currentTool.onImageUpload) {
                currentTool.onImageUpload(currentImage);
            }
        }, 300); // 添加一点延迟让加载动画可见
    }
    
    // 重绘原始图片
    function redrawOriginalImage() {
        if (currentImage) {
            // 保持canvas尺寸与图片原始尺寸一致
            canvas.width = currentImage.width;
            canvas.height = currentImage.height;
            ctx.drawImage(currentImage, 0, 0);
            
            // 更新当前工具的图像数据
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
});