# 多次书写字形变化趋势可视化

基于 **ViT + CLIP 深度学习模型**分析篆书纵向组合数据，可视化不同书写顺序下的字形演化趋势。

## 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite 8 |
| 可视化 | Plotly.js（交互图表）+ SVG（轮廓渲染） |
| 特征提取 | ViT-base-patch16-224（768维）+ CLIP-vit-base-patch32（512维） |
| 降维分析 | PCA（1280→50维）→ t-SNE（50→2维） |
| 运行环境 | Python 3.13 + PyTorch CUDA / 浏览器端纯前端 |

## 快速开始

```bash
# 安装前端依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build
```

## 数据分析流水线

```bash
# 从原始PNG图片提取深度学习特征并降维
python scripts/extract_deep_features.py
```

**流程：** 扫描 120 张篆书 PNG → ViT + CLIP 提取 1280 维特征 → PCA 降至 50 维 → t-SNE 降至 2 维 → 输出 `features.csv` + `pca.csv`

> 需要预先将 HuggingFace 模型缓存到 `../基础案例A-视觉分析2/models/huggingface/`

## 功能视图

| 视图 | 说明 |
|------|------|
| ✎ **字形演化** | SVG 轮廓拟合 + 原图参照（可调透明度），时间滑块控制书写次数，支持多顺序叠加对比 |
| ⊞ **顺序对比** | 6 种书写顺序并排展示，小面板上方轮廓、下方原图 |
| 📈 **特征曲线** | 6 种顺序为 X 轴，双 Y 轴同时对比 2 个 PCA 分量 |
| ◎ **t-SNE 空间** | 选中字符在 6 种顺序下的 2D 轨迹，同组其他字符作为背景参考点 |
| 📊 **方差分析** | PCA 各主成分的个体/累计方差解释率 |
| 🔲 **顺序相似度** | 6×6 余弦相似度热力图，自动标注最相似/最差异的顺序对 |
| 📋 **统计摘要** | 特征维度、总方差、均值范数、顺序间距排名 |

## 项目结构

```
glyph-evolution/
├── index.html
├── package.json
├── vite.config.js
├── scripts/
│   ├── extract_deep_features.py   # ViT+CLIP → PCA → t-SNE 特征提取
│   └── generateData.cjs           # 合成字形轮廓数据
├── public/data/
│   ├── features.csv               # 深度学习特征（360条 × 50维PCA）
│   ├── pca.csv                    # t-SNE 二维坐标
│   ├── images/                    # 原始篆书 PNG（120张）
│   └── shapes/                    # 字形轮廓 JSON（20组）
└── src/
    ├── main.jsx                   # 入口
    ├── App.jsx                    # 主应用（状态管理 + 视图路由）
    ├── components/                # 视图组件
    │   ├── GlyphEvolutionView.jsx  # 字形演化
    │   ├── OrderComparisonView.jsx # 顺序对比
    │   ├── FeatureLineChart.jsx    # 特征曲线
    │   ├── PCAView.jsx            # t-SNE 空间
    │   ├── VarianceExplained.jsx  # 方差分析
    │   ├── OrderSimilarity.jsx    # 顺序相似度
    │   ├── StatsPanel.jsx         # 统计摘要
    │   └── ControlPanel.jsx       # 控制面板
    ├── hooks/useDataLoader.js     # 数据加载 Hook
    ├── utils/dataLoader.js        # CSV 解析、筛选、缓存
    └── styles/index.css           # 深色科技风主题
```

## 数据说明

- **数据来源**：`数据集/篆书纵向组合_20组每组6种顺序/` 下的 120 张篆书 PNG
- **每组**：3 个汉字 × 6 种书写顺序 = 18 条特征记录
- **总计**：20 组 × 18 条 = 360 条 ViT+CLIP 深度特征
