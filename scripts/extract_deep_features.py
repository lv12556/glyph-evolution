# -*- coding: utf-8 -*-
"""
深度学习视觉特征提取流水线
ViT + CLIP → PCA → t-SNE → features.csv + pca.csv
"""
import os, logging, re
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image
from tqdm import tqdm
import torch
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_DATASETS_OFFLINE"] = "1"
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# ── 路径 ──────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR.parent / "数据集" / "篆书纵向组合_20组每组6种顺序" / "zhuanshu_combinations"
CACHE_DIR = str(BASE_DIR.parent / "基础案例A-视觉分析2" / "models" / "huggingface")
OUTPUT_DIR = BASE_DIR / "public" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
VIT_NAME = "google/vit-base-patch16-224-in21k"
CLIP_NAME = "openai/clip-vit-base-patch32"

# ── 扫描图片 ──────────────────────────────────────────────
def scan_images():
    records = []
    for fpath in sorted(DATA_DIR.glob("*.png")):
        m = re.match(r"^(组\d+)_(排\d+)_(.+)\.png$", fpath.name)
        if m:
            records.append({"path": str(fpath), "group": m.group(1), "order": m.group(2), "chars": list(m.group(3))})
    return records

# ── 加载模型 ──────────────────────────────────────────────
def load_models():
    from transformers import ViTModel, ViTImageProcessor, CLIPModel, CLIPProcessor
    logging.info(f"设备: {DEVICE}")
    vit_proc = ViTImageProcessor.from_pretrained(VIT_NAME, cache_dir=CACHE_DIR, local_files_only=True)
    vit_model = ViTModel.from_pretrained(VIT_NAME, cache_dir=CACHE_DIR, local_files_only=True).to(DEVICE).eval()
    clip_proc = CLIPProcessor.from_pretrained(CLIP_NAME, cache_dir=CACHE_DIR, local_files_only=True)
    clip_model = CLIPModel.from_pretrained(CLIP_NAME, cache_dir=CACHE_DIR, local_files_only=True).to(DEVICE).eval()
    return {"vit": (vit_model, vit_proc), "clip": (clip_model, clip_proc)}

# ── 特征提取 ──────────────────────────────────────────────
def extract_features(records):
    models = load_models()
    vit_model, vit_proc = models["vit"]
    clip_model, clip_proc = models["clip"]
    X, meta = [], []
    for rec in tqdm(records, desc="特征提取", unit="img"):
        try:
            img = Image.open(rec["path"]).convert("RGB")
            # ViT: 768维
            vit_in = vit_proc(images=img, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                vit_out = vit_model(**vit_in)
                vit_t = vit_out.pooler_output if (hasattr(vit_out, 'pooler_output') and vit_out.pooler_output is not None) else vit_out.last_hidden_state[:, 0, :]
                vit_feat = vit_t.squeeze().detach().cpu().numpy().flatten()
            # CLIP: 512维
            clip_in = clip_proc(images=img, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                clip_out = clip_model.get_image_features(**clip_in)
                if hasattr(clip_out, 'image_embeds'): clip_t = clip_out.image_embeds
                elif hasattr(clip_out, 'pooler_output'): clip_t = clip_out.pooler_output
                elif isinstance(clip_out, torch.Tensor): clip_t = clip_out
                else: clip_t = clip_out[0]
                clip_feat = clip_t.squeeze().detach().cpu().numpy().flatten()
            combined = np.concatenate([vit_feat, clip_feat])
            for char in rec["chars"]:
                X.append(combined)
                meta.append({"group": rec["group"], "order": rec["order"], "char": char, "time": int(rec["order"].replace("排", ""))})
        except Exception as e:
            logging.warning(f"处理失败 {rec['path']}: {e}")
    X = np.array(X)
    logging.info(f"特征提取完成: {X.shape[0]}条 × {X.shape[1]}维 (ViT768 + CLIP512)")
    return X, meta

# ── 主流程 ────────────────────────────────────────────────
def main():
    logging.info("=" * 50)
    logging.info(f"数据: {DATA_DIR}\n缓存: {CACHE_DIR}\n输出: {OUTPUT_DIR}")
    logging.info("=" * 50)

    records = scan_images()
    logging.info(f"扫描到 {len(records)} 张PNG")

    # 阶段1: ViT + CLIP
    X, meta = extract_features(records)
    df_meta = pd.DataFrame(meta)
    logging.info(f"组: {df_meta['group'].nunique()}, 顺序: {df_meta['order'].nunique()}, 字: {df_meta['char'].nunique()}, 记录: {len(meta)}")

    # 阶段2: PCA 1280→50
    n_pca = min(50, X.shape[0], X.shape[1])
    logging.info(f"PCA: {X.shape[1]} → {n_pca}维")
    pca = PCA(n_components=n_pca)
    X_pca = pca.fit_transform(X)
    cumsum = np.cumsum(pca.explained_variance_ratio_)
    logging.info(f"累计方差解释率: {cumsum[0]:.3f} → {cumsum[-1]:.3f}")

    # 保存 features.csv
    cols = [f"feat_{i}" for i in range(n_pca)]
    df_feat = pd.DataFrame(X_pca, columns=cols)
    for col_name in ["time", "group", "order", "char"]:
        df_feat.insert(0, col_name, [m[col_name] for m in meta])
    df_feat.to_csv(OUTPUT_DIR / "features.csv", index=False, encoding="utf-8")
    logging.info(f"features.csv: {len(df_feat)}行 × {len(df_feat.columns)}列")

    # 阶段3: t-SNE → 2D → pca.csv
    logging.info(f"t-SNE: {n_pca} → 2维")
    tsne = TSNE(n_components=2, random_state=42, perplexity=min(15, X_pca.shape[0]-1), max_iter=1000, init="pca", verbose=1)
    emb = tsne.fit_transform(X_pca)
    df_tsne = pd.DataFrame({"group": [m["group"] for m in meta], "order": [m["order"] for m in meta], "char": [m["char"] for m in meta], "time": [m["time"] for m in meta], "pc1": emb[:, 0], "pc2": emb[:, 1]})
    df_tsne.to_csv(OUTPUT_DIR / "pca.csv", index=False, encoding="utf-8")
    logging.info(f"pca.csv (t-SNE): {len(df_tsne)}行")
    logging.info("完成!")

if __name__ == "__main__":
    main()
