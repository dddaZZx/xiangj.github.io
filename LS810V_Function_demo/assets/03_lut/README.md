# 03_lut —— 滤镜查找表

| 文件 | 格式 | 说明 |
|---|---|---|
| `warm.cube` | 标准 .cube | 暖色滤镜 |
| `cool.cube` | 标准 .cube | 冷色滤镜 |
| `bw.cube` | 标准 .cube | 黑白滤镜 |

参数：`LUT_3D_SIZE 17`（4913 个采样点），`DOMAIN_MIN 0 0 0` / `DOMAIN_MAX 1 1 1`。

注意：

- 出现页面：拍照（左右键切换滤镜）
- 设备端如需滤镜，用 LUT 对 YUV/RGB 做逐像素映射；不需要的话可整包删除
