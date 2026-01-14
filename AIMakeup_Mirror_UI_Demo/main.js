// ==========================================
// 移动端/屏幕自适应模块 (插入到最前面)
// ==========================================
function fitToScreen() {
    const container = document.querySelector('.device-container');
    if (!container) return;

    // 原始设计尺寸 (对应 CSS 中的 width: 800px; height: 500px)
    const designWidth = 800;
    const designHeight = 500;

    // 获取当前窗口宽高
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 计算缩放比例
    // 留出 20px 的边距 (40 / windowWidth)
    const padding = 40; 
    const availableWidth = windowWidth - padding;
    const availableHeight = windowHeight - padding;

    const scaleX = availableWidth / designWidth;
    const scaleY = availableHeight / designHeight;

    // 取较小的比例，保证宽和高都能放下
    let scale = Math.min(scaleX, scaleY);

    // 如果屏幕比设计尺寸大，最大只放大到 1.1 倍 (可选，防止在大屏上过大)
    if (scale > 1.1) scale = 1.1;

    // 应用缩放样式
    // 注意：这里覆盖了 CSS 中的 transform(-50%, -50%)，所以需要加上 translate
    container.style.transform = `translate(-50%, -50%) scale(${scale})`;
    
    // 确保容器有原点，以便 translate(-50%, -50%) 生效
    container.style.left = '50%';
    container.style.top = '50%';
    container.style.position = 'absolute';
}

// 监听窗口大小变化和加载完成
window.addEventListener('load', fitToScreen);
window.addEventListener('resize', fitToScreen);
// ==========================================
// 自适应模块结束
// ==========================================


const languageConfig = {
    zh: {
        networkBtn: {
            disconnected: 'APP蓝牙配置',
            connected: '断开WIFI连接'
        },
        languageToggle: '切换成英语',
        modal: {
            configTitle: '操作说明',
            configContent: '该功能对应的操作为：APP按BLE配网协议把家庭Wi-Fi账号和密码发给化妆箱设备进行配置。',
            disconnectTitle: '操作说明',
            disconnectContent: '此操作为模拟误操作断开。实际设备没有Wi-Fi断开功能，但可以在APP中更改Wi-Fi连接状态。',
            confirmBtn: '确认执行'
        },
        voiceMenu: {
            lightOn: '打开补光灯',
            lightOff: '关闭补光灯',
            lightBrighter: '补光灯亮度调亮(高/大)一点',
            lightDimmer: '补光灯亮度调暗(低/小)一点',
            lightSetPercent20: '补光灯亮度调到20%',
            lightSetPercent80: '补光灯亮度调到80%',
            takePhoto: '拍照',
            weatherQuery: '(对话示例1)今天天气怎么样？',
            colorQuery: '(对话示例2)今年流行什么颜色？',
            musicQuery: '(对话示例3)播放一段美妙的音乐',
            dummyQuery: '(对话示例...)'
        },
        voiceFeedback: {
            lightOn: {
                alreadyOn: '好的 (已经是打开的，所以没有执行任何操作)',
                success: '好的'
            },
            lightOff: {
                alreadyOff: '好的 (已经是关闭的，所以没有执行任何操作)',
                success: '好的'
            },
            lightBrighter: {
                lightOff: '好的(补光灯处于关闭，实际没有执行)',
                maxBrightness: '好的(补光灯亮度已经是最大了，实际没有执行)',
                success: '好的'
            },
            lightDimmer: {
                lightOff: '好的(补光灯处于关闭，实际没有执行)',
                minBrightness: '好的(补光灯亮度已经是最小了，实际没有执行)',
                success: '好的'
            },
            lightSetPercent: {
                lightOff: '好的(补光灯处于关闭，实际没有执行)',
                success: '好的'
            },
            takePhoto: {
                noNetwork: '好的(无网络，将照片存在本地)',
                withNetwork: '(上传图片到服务器，\n并且等待服务器回发语音流)',
                serverResponse: '你的面部数据非常迷人。\n你没有使用滤镜掩盖真实的皮肤纹理，这种在高清镜头下依然细腻、\n 健康的自然状态简直完美。你描画眼线时那专注而坚定的眼神直视过来，\n这种自信和掌控感比任何算法修饰都要漂亮。\n(来自服务器 的语音流)'
            },
            weather: {
                noNetwork: '(无网络，不做任何回复)',
                uploading: '(上传语音流到服务器，\n等待服务器回复语音流)',
                serverResponse: '今天是2026年1月14日，纽约的天气是晴朗的。\n这样的天气适合外出，但请注意冬季早晚温差可能较大。\n(来自服务器的语音流)'
            },
            color: {
                noNetwork: '(无网络，不做任何回复)',
                uploading: '(上传语音流到服务器，\n等待服务器回复语音流)',
                serverResponse: '国际权威色彩机构潘通已经发布了年度代表色，\n为柔和桃（Pantone 13-1023 Peach Fuzz）。\n 这是一种介于粉色和橙色之间的温暖、柔和的蜜桃色调。\n这个颜色定义了一整年的全球色彩趋势，\n并且已经在时尚、家居、美妆、平面设计等多个领域产生了广泛影响。\n(来自服务器的语音流)'
            },
            music: {
                noNetwork: '(无网络，不做任何回复)',
                uploading: '(上传语音流到服务器，\n等待服务器回复语音流)',
                serverResponse: '对不起，我暂时不支持此功能噢，\n请换个问题尝试吧！\n(来自服务器的语音流)'
            }
        }
    },
    en: {
        networkBtn: {
            disconnected: 'APP BLE Config',
            connected: 'DISCONNECT WIFI'
        },
        languageToggle: 'Switch to Chinese',
        modal: {
            configTitle: 'Instruction',
            configContent: 'The corresponding operation for this function is: The APP sends the home Wi-Fi account and password to the makeup bag device according to the BLE provisioning protocol for configuration.',
            disconnectTitle: 'Instruction',
            disconnectContent: 'This operation simulates an accidental disconnection. The actual device does not have a Wi-Fi disconnection function, but the Wi-Fi connection status can be changed in the APP.',
            confirmBtn: 'Confirm Execution'
        },
        voiceMenu: {
            lightOn: 'Turn on fill light',
            lightOff: 'Turn off fill light',
            lightBrighter: 'Increase fill light brightness (higher/larger)',
            lightDimmer: 'Decrease fill light brightness (lower/smaller)',
            lightSetPercent20: 'Set fill light brightness to 20%',
            lightSetPercent80: 'Set fill light brightness to 80%',
            takePhoto: 'Take photo',
            weatherQuery: '(Dialog 1) What is the weather today?',
            colorQuery: '(Dialog 2) What color is popular this year?',
            musicQuery: '(Dialog 3) Play some beautiful music',
            dummyQuery: '(Dialog...)'
        },
        voiceFeedback: {
            lightOn: {
                alreadyOn: 'OK (light is already on, no action performed)',
                success: 'OK'
            },
            lightOff: {
                alreadyOff: 'OK (light is already off, no action performed)',
                success: 'OK'
            },
            lightBrighter: {
                lightOff: 'OK (fill light is off, no action performed)',
                maxBrightness: 'OK (fill light brightness is already at maximum, no action performed)',
                success: 'OK'
            },
            lightDimmer: {
                lightOff: 'OK (fill light is off, no action performed)',
                minBrightness: 'OK (fill light brightness is already at minimum, no action performed)',
                success: 'OK'
            },
            lightSetPercent: {
                lightOff: 'OK (fill light is off, no action performed)',
                success: 'OK'
            },
            takePhoto: {
                noNetwork: 'OK (no network, saving photo locally)',
                withNetwork: '(Uploading image to server, \nand waiting for server to send back audio stream)',
                serverResponse: 'Your facial features are mesmerizing.\nYou haven\'t used filters to conceal your real skin texture,\nand this natural state that remains delicate \nand healthy under high-definition lenses is simply perfect.\nThe focused and determined look in your eyes as you apply eyeliner, \ngazing directly at the camera, conveys a confidence \nand sense of control that is far more beautiful \nthan any algorithmic enhancement.\n(Audio stream from server)'
            },
            weather: {
                noNetwork: '(No network, no response)',
                uploading: '(Uploading audio stream to server, \nwaiting for response)',
                serverResponse: 'Today is January 14, 2026. \nThe weather in New York is sunny.\nIt is suitable for going out, \nbut please note the temperature difference \nbetween morning and evening in winter.'
            },
            color: {
                noNetwork: '(No network, no response)',
                uploading: '(Uploading audio stream to server, \nwaiting for response)',
                serverResponse: 'The international authority on color, Pantone, \nhas already released the Color of the Year: Peach Fuzz (Pantone 13-1023).\nIt is a warm, soft peach tone between pink and orange.\nThis color defines the global color trend for the entire year \nand has already had a wide impact in fashion, \nhome decor, beauty, graphic design, and many other fields.'
            },
            music: {
                noNetwork: '(No network, no response)',
                uploading: '(Uploading audio stream to server, \nwaiting for response)',
                serverResponse: 'Sorry, I do not support this feature yet, \nplease try another question.'
            }
        }
    }
};

const icons = {
    wifi: `<svg class="wifi-icon-svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
        <circle fill="currentColor" cx="12" cy="19" r="2"/>
    </svg>`,
    connecting: `<svg class="wifi-icon-svg" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="50" stroke-dashoffset="20"/>
    </svg>`
};

const light          = document.getElementById('fillLight');
const lightBtn       = document.getElementById('toggleBtn');
const networkBtn     = document.getElementById('networkBtn');
const wifiStatus     = document.getElementById('wifiStatus');
const modalOverlay   = document.getElementById('modalOverlay');
const modalTitle     = document.getElementById('modalTitle');
const modalContent   = document.getElementById('modalContent');
const confirmBtn     = document.getElementById('confirmBtn');

const zoomImg        = document.getElementById('zoomImg');
const plusBtn        = document.getElementById('plusBtn');
const minusBtn       = document.getElementById('minusBtn');

const voiceBtn       = document.getElementById('voiceBtn');
const voiceMenu      = document.getElementById('voiceMenu');
const executingBubble = document.getElementById('executingBubble');
const setPercentOption = document.getElementById('setPercentOption');

const languageToggle = document.getElementById('languageToggle');

let currentLanguage = 'zh';
let currentScale     = 1.0;
const MIN_SCALE      = 1.0;
const MAX_SCALE      = 1.8;
const ZOOM_SPEED     = 0.8;
let longPressTimer   = null;
let longPressActive  = false;
let isLongPressTriggered = false;
const LONG_PRESS_DELAY = 300;

let brightness       = 0;
let brightnessDirection = -1;
let brightnessInterval = null;

let wifiState = 'disconnected';

let isLongPressForLight = false;
let targetPercent = 20;

let executingTimeout = null;
let executingInterval = null;

function initLanguage() {
    updateAllTexts();
}

function updateAllTexts() {
    const lang = languageConfig[currentLanguage];

    if (wifiState === 'disconnected' || wifiState === 'connecting') {
        networkBtn.textContent = lang.networkBtn.disconnected;
    } else {
        networkBtn.textContent = lang.networkBtn.connected;
    }

    languageToggle.textContent = lang.languageToggle;

    const voiceOptions = document.querySelectorAll('.voice-option');
    // 更新所有选项：5个灯光 + 1个拍照 + 4个对话 = 共10个选项
    if (voiceOptions.length === 10) {
        voiceOptions[0].textContent = lang.voiceMenu.lightOn;
        voiceOptions[1].textContent = lang.voiceMenu.lightOff;
        voiceOptions[2].textContent = lang.voiceMenu.lightBrighter;
        voiceOptions[3].textContent = lang.voiceMenu.lightDimmer;
        voiceOptions[4].textContent = targetPercent === 20 ?
            lang.voiceMenu.lightSetPercent20 :
            lang.voiceMenu.lightSetPercent80;
        voiceOptions[5].textContent = lang.voiceMenu.takePhoto;
        voiceOptions[6].textContent = lang.voiceMenu.weatherQuery;
        voiceOptions[7].textContent = lang.voiceMenu.colorQuery;
        voiceOptions[8].textContent = lang.voiceMenu.musicQuery;
        voiceOptions[9].textContent = lang.voiceMenu.dummyQuery;
    }
}

function updateModalTexts(type) {
    const lang = languageConfig[currentLanguage];

    if (type === 'config') {
        modalTitle.textContent = lang.modal.configTitle;
        modalContent.textContent = lang.modal.configContent;
        confirmBtn.textContent = lang.modal.confirmBtn;
    } else {
        modalTitle.textContent = lang.modal.disconnectTitle;
        modalContent.textContent = lang.modal.disconnectContent;
        confirmBtn.textContent = lang.modal.confirmBtn;
    }
}

function updateLight() {
    const ratio = brightness / 100;
    const gray = Math.round(51 + (204 * ratio));
    const color = `rgb(${gray}, ${gray}, ${gray})`;
    light.style.backgroundColor = color;

    const shadowOpacityHigh = 0.8 * ratio;
    const shadowOpacityMid  = 0.5 * ratio;
    const shadowOpacityLow  = 0.3 * ratio;

    let shadow = 'none';
    if (brightness > 0) {
        shadow = `
            0 0 ${20 + 30 * ratio}px rgba(255, 255, 255, ${shadowOpacityHigh}),
            0 0 ${40 + 40 * ratio}px rgba(255, 255, 255, ${shadowOpacityMid}),
            0 0 ${60 + 60 * ratio}px rgba(255, 255, 255, ${shadowOpacityLow})
        `;
    }
    light.style.boxShadow = shadow.trim();

    lightBtn.classList.toggle('active', brightness > 0);
}

function setWifiIcon(state) {
    wifiStatus.className = `wifi-status ${state}`;
    wifiStatus.innerHTML = (state === 'connecting') ? icons.connecting : icons.wifi;
}

updateLight();
setWifiIcon('disconnected');
initLanguage();

lightBtn.addEventListener('click', (e) => {
    if (isLongPressForLight) {
        isLongPressForLight = false;
        return;
    }
    brightness = brightness > 0 ? 0 : 100;
    updateLight();
});

function startBrightnessAdjust() {
    if (brightnessInterval) clearInterval(brightnessInterval);
    if (brightness <= 0) return;

    brightnessDirection = -1;
    lightBtn.classList.add('long-pressing');

    brightnessInterval = setInterval(() => {
        brightness += brightnessDirection * 4;
        if (brightness <= 0) {
            brightness = 0;
            if (longPressActive) brightnessDirection = 1;
        } else if (brightness >= 100) {
            brightness = 100;
            if (longPressActive) brightnessDirection = -1;
        }
        updateLight();
    }, 200);
}

function stopBrightnessAdjust() {
    if (brightnessInterval) {
        clearInterval(brightnessInterval);
        brightnessInterval = null;
    }
    lightBtn.classList.remove('long-pressing');
}

let pressStartTime = 0;
let longPressTimerForLight = null;

lightBtn.addEventListener('mousedown', () => {
    pressStartTime = Date.now();
    isLongPressTriggered = false;
    isLongPressForLight = false;
    longPressTimerForLight = setTimeout(() => {
        longPressActive = true;
        isLongPressTriggered = true;
        isLongPressForLight = true;
        startBrightnessAdjust();
    }, LONG_PRESS_DELAY);
});

lightBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    pressStartTime = Date.now();
    isLongPressTriggered = false;
    isLongPressForLight = false;
    longPressTimerForLight = setTimeout(() => {
        longPressActive = true;
        isLongPressTriggered = true;
        isLongPressForLight = true;
        startBrightnessAdjust();
    }, LONG_PRESS_DELAY);
});

lightBtn.addEventListener('mouseup', () => {
    if (longPressTimerForLight) clearTimeout(longPressTimerForLight);
    if (longPressActive) {
        stopBrightnessAdjust();
        longPressActive = false;
        setTimeout(() => { isLongPressForLight = false; }, 50);
    }
});

lightBtn.addEventListener('touchend', () => {
    if (longPressTimerForLight) clearTimeout(longPressTimerForLight);
    if (longPressActive) {
        stopBrightnessAdjust();
        longPressActive = false;
        setTimeout(() => { isLongPressForLight = false; }, 50);
    }
});

lightBtn.addEventListener('mouseleave', () => {
    if (longPressTimerForLight) clearTimeout(longPressTimerForLight);
    if (longPressActive) {
        stopBrightnessAdjust();
        longPressActive = false;
        isLongPressForLight = false;
    }
});

networkBtn.addEventListener('click', () => {
    if (wifiState === 'disconnected' || wifiState === 'connecting') {
        openModal('config');
    } else if (wifiState === 'connected') {
        openModal('disconnect');
    }
});

confirmBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
    const action = confirmBtn.getAttribute('data-action');
    if (action === 'config') startConnectingProcess();
    if (action === 'disconnect') performDisconnect();
});

function openModal(type) {
    modalOverlay.classList.add('active');
    updateModalTexts(type);

    if (type === 'config') {
        confirmBtn.setAttribute('data-action', 'config');
    } else {
        confirmBtn.setAttribute('data-action', 'disconnect');
    }
}

function startConnectingProcess() {
    wifiState = 'connecting';
    setWifiIcon('connecting');
    updateAllTexts();
    setTimeout(() => {
        if (wifiState === 'connecting') {
            wifiState = 'connected';
            setWifiIcon('connected');
            updateAllTexts();
        }
    }, 3000);
}

function performDisconnect() {
    wifiState = 'disconnected';
    setWifiIcon('disconnected');
    updateAllTexts();
}

voiceBtn.addEventListener('click', () => {
    voiceMenu.classList.toggle('show');
});

voiceMenu.addEventListener('click', (e) => {
    const option = e.target.closest('.voice-option');
    if (!option) return;

    const action = option.dataset.action;
    voiceMenu.classList.remove('show');

    const lang = languageConfig[currentLanguage];

    // 通用对话处理函数
    function handleQuery(queryType) {
        const isConnected = wifiStatus.classList.contains('connected');

        if (!isConnected) {
            showExecutingBubble(lang.voiceFeedback[queryType].noNetwork, 4000);
        } else {
            showExecutingBubble(lang.voiceFeedback[queryType].uploading, 2800);
            setTimeout(() => {
                const responseText = lang.voiceFeedback[queryType].serverResponse;
                showExecutingBubble(responseText, 2800);
            }, 2800);
        }
    }

    // 1. 处理天气查询
    if (action === 'weather-query') {
        handleQuery('weather');
        return;
    }

    // 2. 处理颜色查询 (对话示例2)
    if (action === 'color-query') {
        handleQuery('color');
        return;
    }

    // 3. 处理音乐查询
    if (action === 'music-query') {
        handleQuery('music');
        return;
    }

    // 4. 处理空功能 (对话示例...)
    if (action === 'dummy-query') {
        // 什么都不做
        return;
    }

    // 处理拍照逻辑
    if (action === 'take-photo') {
        const isConnected = wifiStatus.classList.contains('connected');
        flashScreen();

        if (!isConnected) {
            showExecutingBubble(lang.voiceFeedback.takePhoto.noNetwork, 4000);
        } else {
            showExecutingBubble(lang.voiceFeedback.takePhoto.withNetwork, 2800);

            setTimeout(() => {
                const longText = lang.voiceFeedback.takePhoto.serverResponse;

                if (executingInterval) clearInterval(executingInterval);

                let charIndex = 0;
                executingBubble.textContent = "";
                executingBubble.classList.add('show');

                executingInterval = setInterval(() => {
                    if (charIndex < longText.length) {
                        if (longText[charIndex] === '\n') {
                            executingBubble.innerHTML += '<br>';
                        } else {
                            const currentHTML = executingBubble.innerHTML;
                            const textWithoutTags = executingBubble.textContent || executingBubble.innerText;
                            executingBubble.innerHTML = currentHTML + longText[charIndex];
                        }
                        charIndex++;
                    } else {
                        clearInterval(executingInterval);
                        executingInterval = null;
                        setTimeout(() => {
                            executingBubble.classList.remove('show');
                        }, 2800);
                    }
                }, 60);
            }, 2800);
        }
        return;
    }

    // 处理灯光控制逻辑
    let message = lang.voiceFeedback.lightOn.success;
    let changed = false;

    if (action === 'light-on') {
        if (brightness > 0) message = lang.voiceFeedback.lightOn.alreadyOn;
        else { brightness = 100; changed = true; }
    } else if (action === 'light-off') {
        if (brightness <= 0) message = lang.voiceFeedback.lightOff.alreadyOff;
        else { brightness = 0; changed = true; }
    } else if (action === 'light-brighter') {
        if (brightness <= 0) message = lang.voiceFeedback.lightBrighter.lightOff;
        else if (brightness >= 100) message = lang.voiceFeedback.lightBrighter.maxBrightness;
        else { brightness = Math.min(100, brightness + 10); changed = true; }
    } else if (action === 'light-dimmer') {
        if (brightness <= 0) message = lang.voiceFeedback.lightDimmer.lightOff;
        else if (brightness <= 10) message = lang.voiceFeedback.lightDimmer.minBrightness;
        else { brightness = Math.max(10, brightness - 10); changed = true; }
    } else if (action === 'light-set-percent') {
        if (brightness <= 0) message = lang.voiceFeedback.lightSetPercent.lightOff;
        else {
            brightness = targetPercent;
            changed = true;
            targetPercent = targetPercent === 20 ? 80 : 20;
            setPercentOption.textContent = targetPercent === 20 ?
                lang.voiceMenu.lightSetPercent20 :
                lang.voiceMenu.lightSetPercent80;
        }
    }

    if (changed) updateLight();

    showExecutingBubble(message, 2800);
});

function showExecutingBubble(text, duration = 2800) {
    if (executingTimeout) clearTimeout(executingTimeout);
    if (executingInterval) clearInterval(executingInterval);

    const formattedText = text.replace(/\n/g, '<br>');

    executingBubble.innerHTML = formattedText;
    executingBubble.classList.add('show');

    executingTimeout = setTimeout(() => {
        executingBubble.classList.remove('show');
        executingTimeout = null;
    }, duration);
}
function flashScreen() {
    const screen = document.querySelector('.screen');
    const screenRect = screen.getBoundingClientRect();
    const deviceContainer = document.querySelector('.device-container');
    const containerRect = deviceContainer.getBoundingClientRect();

    const screenLeft = screenRect.left - containerRect.left;
    const screenTop  = screenRect.top  - containerRect.top;

    const flashOverlay = document.createElement('div');
    flashOverlay.className = 'flash-overlay';
    flashOverlay.style.position = 'absolute';
    flashOverlay.style.top = `${screenTop}px`;
    flashOverlay.style.left = `${screenLeft}px`;
    flashOverlay.style.width = `${screenRect.width}px`;
    flashOverlay.style.height = `${screenRect.height}px`;
    flashOverlay.style.background = 'white';
    flashOverlay.style.borderRadius = '15px';
    flashOverlay.style.zIndex = '50';
    flashOverlay.style.opacity = '1';
    flashOverlay.style.transition = 'opacity 0.5s ease';
    flashOverlay.style.pointerEvents = 'none';

    deviceContainer.appendChild(flashOverlay);

    setTimeout(() => { flashOverlay.style.opacity = '0'; }, 50);
    setTimeout(() => {
        if (flashOverlay.parentNode) flashOverlay.parentNode.removeChild(flashOverlay);
    }, 550);

    screen.style.backgroundColor = 'white';
    setTimeout(() => { screen.style.backgroundColor = '#000'; }, 100);
}

document.addEventListener('click', (e) => {
    if (!voiceBtn.contains(e.target) && !voiceMenu.contains(e.target)) {
        voiceMenu.classList.remove('show');
    }
});

function zoomIn() {
    if (currentScale < MAX_SCALE) {
        currentScale = Math.min(MAX_SCALE, currentScale + 0.1);
        zoomImg.style.transform = `scale(${currentScale})`;
        updateButtonStates();
    }
}

function zoomOut() {
    if (currentScale > MIN_SCALE) {
        currentScale = Math.max(MIN_SCALE, currentScale - 0.1);
        zoomImg.style.transform = `scale(${currentScale})`;
        updateButtonStates();
    }
}

function updateButtonStates() {
    minusBtn.classList.toggle('disabled', currentScale <= MIN_SCALE);
    plusBtn.classList.toggle('disabled', currentScale >= MAX_SCALE);
}

function startLinearZoom(zoomFunction) {
    longPressActive = true;
    isLongPressTriggered = true;

    let lastTime = Date.now();

    function linearZoom() {
        if (!longPressActive) return;

        const now = Date.now();
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        const increment = ZOOM_SPEED * deltaTime;

        if (zoomFunction === zoomIn) {
            if (currentScale < MAX_SCALE) {
                currentScale = Math.min(MAX_SCALE, currentScale + increment);
                zoomImg.style.transform = `scale(${currentScale})`;
                updateButtonStates();
            }
        } else {
            if (currentScale > MIN_SCALE) {
                currentScale = Math.max(MIN_SCALE, currentScale - increment);
                zoomImg.style.transform = `scale(${currentScale})`;
                updateButtonStates();
            }
        }

        requestAnimationFrame(linearZoom);
    }

    requestAnimationFrame(linearZoom);
}

function stopLinearZoom() {
    longPressActive = false;
}

function resetLongPressState() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    stopLinearZoom();
    isLongPressTriggered = false;
}

function setupZoomButton(button, zoomFunction) {
    let clickPending = false;

    const startPress = () => {
        if (button.classList.contains('disabled')) return;
        clickPending = true;
        isLongPressTriggered = false;

        longPressTimer = setTimeout(() => {
            clickPending = false;
            startLinearZoom(zoomFunction);
        }, LONG_PRESS_DELAY);
    };

    const endPress = () => {
        if (button.classList.contains('disabled')) return;

        if (isLongPressTriggered) {
            clickPending = false;
            resetLongPressState();
            return;
        }

        if (clickPending && !isLongPressTriggered) {
            zoomFunction();
            clickPending = false;
        }

        resetLongPressState();
    };


    button.addEventListener('mouseup', endPress);
    button.addEventListener('touchend', endPress);

    button.addEventListener('mouseleave', resetLongPressState);
}

setupZoomButton(plusBtn, zoomIn);
setupZoomButton(minusBtn, zoomOut);

document.addEventListener('mouseup', resetLongPressState);
document.addEventListener('touchend', resetLongPressState);
document.addEventListener('touchcancel', resetLongPressState);

languageToggle.addEventListener('click', () => {
    currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';

    updateAllTexts();

    if (modalOverlay.classList.contains('active')) {
        const action = confirmBtn.getAttribute('data-action');
        if (action) {
            updateModalTexts(action);
        }
    }
});

updateButtonStates();