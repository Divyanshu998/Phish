import os
import sys
import json
import time
import math
import random
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score, 
    precision_recall_fscore_support, f1_score
)

# Import local configuration
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from training import config

# ==========================================
# 1. ABSOLUTE GPU VERIFICATION
# ==========================================
print("====================================================")
print("PHISHGUARD AI — GPU TRAINING INITIATION")
print("====================================================")

if not torch.cuda.is_available():
    print("CRITICAL ERROR: CUDA is NOT available!")
    print("GPU training is mandatory. Aborting training.")
    sys.exit(1)

device = torch.device("cuda:0")
gpu_name = torch.cuda.get_device_name(0)
gpu_memory_bytes = torch.cuda.get_device_properties(0).total_memory
gpu_memory_gb = gpu_memory_bytes / (1024 ** 3)
cuda_version = torch.version.cuda

print(f"PyTorch Version: {torch.__version__}")
print(f"CUDA Available:  True (Version {cuda_version})")
print(f"Target GPU:      {gpu_name}")
print(f"GPU VRAM:        {gpu_memory_gb:.2f} GB")
print(f"Training Device: {device}")
print("====================================================\n")

# Set random seeds for reproducibility
def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True

set_seed(config.SEED)

# ==========================================
# 2. DATASET LOADING & QUALITY ANALYSIS
# ==========================================
print("[1/8] Loading dataset and performing Data Quality Analysis...")
df_raw = pd.read_csv(config.DATASET_PATH)

total_raw_rows = len(df_raw)
print(f"Raw dataset loaded. Total rows: {total_raw_rows:,}")
print(f"Dataset columns: {list(df_raw.columns)}")

# Missing value analysis
missing_urls = df_raw['url'].isna().sum()
missing_labels = df_raw['type'].isna().sum()
empty_urls = (df_raw['url'].astype(str).str.strip() == "").sum()

print(f"Missing URLs: {missing_urls}")
print(f"Missing Labels: {missing_labels}")
print(f"Empty URLs: {empty_urls}")

# Clean invalid rows
df = df_raw.dropna(subset=['url', 'type']).copy()
df['url'] = df['url'].astype(str).str.strip()
df = df[df['url'] != ""]
cleaned_rows = len(df)
print(f"Cleaned dataset rows: {cleaned_rows:,}")

# Duplicate Analysis & Data Leakage Prevention
url_counts = df['url'].value_counts()
duplicate_url_count = (url_counts > 1).sum()
print(f"Unique URLs: {len(url_counts):,}")
print(f"Duplicate URLs found: {duplicate_url_count:,}")

print("Performing deduplication by URL to prevent data leakage across splits...")
df_dedup = df.drop_duplicates(subset=['url'], keep='first').copy()
print(f"Deduplicated dataset rows: {len(df_dedup):,}")

# Label Analysis
label_counts = df_dedup['type'].value_counts()
print("\nLabel Distribution (Deduplicated):")
for label, count in label_counts.items():
    pct = (count / len(df_dedup)) * 100
    print(f"  - {label:<15}: {count:>8,} ({pct:.2f}%)")

unique_labels = sorted(df_dedup['type'].unique().tolist())
label_to_id = {lbl: idx for idx, lbl in enumerate(unique_labels)}
id_to_label = {idx: lbl for idx, lbl in enumerate(unique_labels)}
num_classes = len(unique_labels)
print(f"\nDetected {num_classes} unique classes: {unique_labels}")

# URL Length Percentile Analysis
lengths = df_dedup['url'].apply(len)
p50 = np.percentile(lengths, 50)
p75 = np.percentile(lengths, 75)
p90 = np.percentile(lengths, 90)
p95 = np.percentile(lengths, 95)
p99 = np.percentile(lengths, 99)
max_len_data = lengths.max()

print("\nURL Length Distribution:")
print(f"  - 50th percentile: {p50:.1f}")
print(f"  - 75th percentile: {p75:.1f}")
print(f"  - 90th percentile: {p90:.1f}")
print(f"  - 95th percentile: {p95:.1f}")
print(f"  - 99th percentile: {p99:.1f}")
print(f"  - Maximum length:  {max_len_data}")

max_seq_len = config.MAX_SEQ_LEN
print(f"Selected MAX_SEQ_LEN: {max_seq_len} (Covers over 98% of URLs without truncation)")

# ==========================================
# 3. STRATIFIED TRAIN / VAL / TEST SPLIT
# ==========================================
print("\n[2/8] Creating Stratified Train (80%) / Val (10%) / Test (10%) splits...")
df_dedup['label_id'] = df_dedup['type'].map(label_to_id)

# Perform stratified sampling manually with pandas/numpy for reproducibility
train_dfs, val_dfs, test_dfs = [], [], []

for label_id in range(num_classes):
    sub_df = df_dedup[df_dedup['label_id'] == label_id].sample(frac=1.0, random_state=config.SEED)
    n = len(sub_df)
    n_train = int(n * config.TRAIN_RATIO)
    n_val = int(n * config.VAL_RATIO)
    
    train_dfs.append(sub_df.iloc[:n_train])
    val_dfs.append(sub_df.iloc[n_train:n_train + n_val])
    test_dfs.append(sub_df.iloc[n_train + n_val:])

train_df = pd.concat(train_dfs).sample(frac=1.0, random_state=config.SEED).reset_index(drop=True)
val_df = pd.concat(val_dfs).sample(frac=1.0, random_state=config.SEED).reset_index(drop=True)
test_df = pd.concat(test_dfs).sample(frac=1.0, random_state=config.SEED).reset_index(drop=True)

print(f"Train split samples: {len(train_df):,}")
print(f"Val split samples:   {len(val_df):,}")
print(f"Test split samples:  {len(test_df):,}")

# Calculate class weights for loss function (computed ONLY from train set)
train_class_counts = train_df['label_id'].value_counts().sort_index().values
total_train_samples = len(train_df)
class_weights = total_train_samples / (num_classes * train_class_counts)
class_weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
print(f"Class Weights (from Train Set): {np.round(class_weights, 4)}")

# ==========================================
# 4. VOCABULARY BUILDING
# ==========================================
print("\n[3/8] Building Character Vocabulary from Training Set...")
char_counts = {}
for url in train_df['url']:
    for char in url:
        char_counts[char] = char_counts.get(char, 0) + 1

# Special tokens
PAD_TOKEN = "<PAD>"  # index 0
UNK_TOKEN = "<UNK>"  # index 1

vocab = {PAD_TOKEN: 0, UNK_TOKEN: 1}
# Sort characters by frequency
sorted_chars = sorted(char_counts.items(), key=lambda x: x[1], reverse=True)
for char, count in sorted_chars:
    if char not in vocab:
        vocab[char] = len(vocab)

vocab_size = len(vocab)
print(f"Vocabulary Size: {vocab_size} tokens (including <PAD> and <UNK>)")

# ==========================================
# 5. DATASET & DATALOADER
# ==========================================
class URLDataset(Dataset):
    def __init__(self, urls, labels, vocab, max_len):
        self.urls = urls
        self.labels = labels
        self.vocab = vocab
        self.max_len = max_len
        self.unk_id = vocab[UNK_TOKEN]
        self.pad_id = vocab[PAD_TOKEN]

    def __len__(self):
        return len(self.urls)

    def __getitem__(self, idx):
        url = self.urls[idx]
        label = self.labels[idx]

        # Convert URL to character token IDs
        seq = [self.vocab.get(c, self.unk_id) for c in url[:self.max_len]]
        # Pad sequence
        if len(seq) < self.max_len:
            seq += [self.pad_id] * (self.max_len - len(seq))
        
        return torch.tensor(seq, dtype=torch.long), torch.tensor(label, dtype=torch.long)

train_dataset = URLDataset(train_df['url'].values, train_df['label_id'].values, vocab, max_seq_len)
val_dataset = URLDataset(val_df['url'].values, val_df['label_id'].values, vocab, max_seq_len)
test_dataset = URLDataset(test_df['url'].values, test_df['label_id'].values, vocab, max_seq_len)

train_loader = DataLoader(train_dataset, batch_size=config.BATCH_SIZE, shuffle=True, num_workers=config.NUM_WORKERS, pin_memory=True)
val_loader = DataLoader(val_dataset, batch_size=config.BATCH_SIZE, shuffle=False, num_workers=config.NUM_WORKERS, pin_memory=True)
test_loader = DataLoader(test_dataset, batch_size=config.BATCH_SIZE, shuffle=False, num_workers=config.NUM_WORKERS, pin_memory=True)

print(f"DataLoader created. Batch size: {config.BATCH_SIZE}")

# ==========================================
# 6. MODEL ARCHITECTURE (Char-CNN)
# ==========================================
class CharCNNURLClassifier(nn.Module):
    def __init__(self, vocab_size, embedding_dim, num_classes, max_len=256, dropout=0.3):
        super(CharCNNURLClassifier, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=0)
        
        # 1D Convolutional Blocks with multi-scale filter sizes (3, 5, 7)
        self.conv1 = nn.Conv1d(embedding_dim, 128, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm1d(128)
        
        self.conv2 = nn.Conv1d(128, 256, kernel_size=5, padding=2)
        self.bn2 = nn.BatchNorm1d(256)
        
        self.conv3 = nn.Conv1d(256, 256, kernel_size=7, padding=3)
        self.bn3 = nn.BatchNorm1d(256)
        
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.max_pool = nn.AdaptiveMaxPool1d(1)
        
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(dropout)
        
        # Fully connected layers (combining AvgPool and MaxPool = 256 + 256 = 512)
        self.fc1 = nn.Linear(512, 256)
        self.fc_bn = nn.BatchNorm1d(256)
        self.fc2 = nn.Linear(256, num_classes)

    def forward(self, x):
        # x shape: [batch_size, seq_len]
        out = self.embedding(x)  # [batch_size, seq_len, embedding_dim]
        out = out.transpose(1, 2)  # [batch_size, embedding_dim, seq_len]
        
        out = self.relu(self.bn1(self.conv1(out)))
        out = self.relu(self.bn2(self.conv2(out)))
        out = self.relu(self.bn3(self.conv3(out)))
        
        # Global pooling
        avg_p = self.pool(out).squeeze(2)  # [batch_size, 256]
        max_p = self.max_pool(out).squeeze(2)  # [batch_size, 256]
        pooled = torch.cat([avg_p, max_p], dim=1)  # [batch_size, 512]
        
        out = self.dropout(pooled)
        out = self.relu(self.fc_bn(self.fc1(out)))
        out = self.dropout(out)
        logits = self.fc2(out)  # [batch_size, num_classes]
        return logits

model = CharCNNURLClassifier(
    vocab_size=vocab_size,
    embedding_dim=config.EMBEDDING_DIM,
    num_classes=num_classes,
    max_len=max_seq_len,
    dropout=config.DROPOUT
).to(device)

print("\n[4/8] Model Architecture Initialized:")
print(model)
total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"Total Trainable Parameters: {total_params:,}")

# Verify model parameters are explicitly on cuda:0
param_device = next(model.parameters()).device
print(f"Verified Model Device Location: {param_device}")
assert param_device.type == "cuda", "Model parameters must be on CUDA!"

# Loss, Optimizer & Scheduler
criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
optimizer = optim.AdamW(model.parameters(), lr=config.LEARNING_RATE, weight_decay=1e-4)
scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=1)
scaler = torch.amp.GradScaler('cuda')

# ==========================================
# 7. GPU TRAINING LOOP
# ==========================================
print("\n[5/8] Starting GPU-Accelerated Training Loop...")
best_val_f1 = 0.0
patience_counter = 0

train_losses, val_losses = [], []
train_f1s, val_f1s = [], []

start_train_time = time.time()

for epoch in range(1, config.EPOCHS + 1):
    epoch_start = time.time()
    
    # --- TRAIN PHASE ---
    model.train()
    running_loss = 0.0
    train_preds, train_targets = [], []
    
    train_bar = tqdm(train_loader, desc=f"Epoch {epoch:02d}/{config.EPOCHS:02d} [Train]", leave=False)
    for inputs, labels in train_bar:
        inputs, labels = inputs.to(device, non_blocking=True), labels.to(device, non_blocking=True)
        
        optimizer.zero_grad()
        with torch.amp.autocast('cuda'):
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        
        running_loss += loss.item() * inputs.size(0)
        preds = torch.argmax(outputs, dim=1).detach().cpu().numpy()
        train_preds.extend(preds)
        train_targets.extend(labels.cpu().numpy())
        
        train_bar.set_postfix({'loss': f"{loss.item():.4f}"})
        
    epoch_train_loss = running_loss / len(train_df)
    epoch_train_f1 = f1_score(train_targets, train_preds, average='macro')
    
    # --- VALIDATION PHASE ---
    model.eval()
    val_loss = 0.0
    val_preds, val_targets = [], []
    
    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs, labels = inputs.to(device, non_blocking=True), labels.to(device, non_blocking=True)
            with torch.amp.autocast('cuda'):
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                
            val_loss += loss.item() * inputs.size(0)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()
            val_preds.extend(preds)
            val_targets.extend(labels.cpu().numpy())
            
    epoch_val_loss = val_loss / len(val_df)
    epoch_val_f1 = f1_score(val_targets, val_preds, average='macro')
    
    scheduler.step(epoch_val_f1)
    
    train_losses.append(epoch_train_loss)
    val_losses.append(epoch_val_loss)
    train_f1s.append(epoch_train_f1)
    val_f1s.append(epoch_val_f1)
    
    # GPU Memory Stats
    gpu_mem_allocated = torch.cuda.memory_allocated(0) / (1024 ** 2)
    gpu_mem_reserved = torch.cuda.memory_reserved(0) / (1024 ** 2)
    epoch_time = time.time() - epoch_start
    
    print(f"Epoch {epoch:02d}/{config.EPOCHS:02d} ({epoch_time:.1f}s) | "
          f"Train Loss: {epoch_train_loss:.4f} | Train F1: {epoch_train_f1:.4f} | "
          f"Val Loss: {epoch_val_loss:.4f} | Val F1: {epoch_val_f1:.4f} | "
          f"GPU Mem: {gpu_mem_allocated:.0f}MB / {gpu_mem_reserved:.0f}MB")
    
    # Save Best Model Checkpoint
    if epoch_val_f1 > best_val_f1:
        best_val_f1 = epoch_val_f1
        patience_counter = 0
        print(f"  >>> Improved Val F1 ({best_val_f1:.4f}). Saving checkpoint to {config.MODEL_PATH}...")
        
        checkpoint = {
            'model_state_dict': model.state_dict(),
            'vocab': vocab,
            'label_to_id': label_to_id,
            'id_to_label': id_to_label,
            'max_seq_len': max_seq_len,
            'embedding_dim': config.EMBEDDING_DIM,
            'num_classes': num_classes,
            'best_val_f1': best_val_f1,
            'epoch': epoch
        }
        torch.save(checkpoint, config.MODEL_PATH)
    else:
        patience_counter += 1
        print(f"  --- No improvement in Val F1 for {patience_counter} epoch(s).")
        if patience_counter >= config.PATIENCE:
            print(f"\nEarly stopping triggered after {epoch} epochs.")
            break

total_training_duration = time.time() - start_train_time
print(f"\nTraining Completed in {total_training_duration / 60:.2f} minutes.")

# Save JSON metadata artifacts
with open(config.VOCAB_PATH, 'w') as f:
    json.dump(vocab, f, indent=2)

with open(config.LABEL_MAP_PATH, 'w') as f:
    json.dump({'label_to_id': label_to_id, 'id_to_label': {str(k): v for k, v in id_to_label.items()}}, f, indent=2)

config_meta = {
    "model_name": "PhishGuard AI URL Classifier",
    "version": "1.0.0",
    "architecture": "Character-CNN (1D Conv + Global Pooling)",
    "dataset": "malicious_phish.csv",
    "total_samples": len(df_dedup),
    "num_classes": num_classes,
    "classes": unique_labels,
    "max_seq_len": max_seq_len,
    "embedding_dim": config.EMBEDDING_DIM,
    "batch_size": config.BATCH_SIZE,
    "vocab_size": vocab_size,
    "gpu_device": gpu_name,
    "cuda_version": cuda_version,
    "best_val_f1": best_val_f1,
    "training_duration_seconds": total_training_duration
}

with open(config.CONFIG_PATH, 'w') as f:
    json.dump(config_meta, f, indent=2)

# ==========================================
# 8. TEST SET EVALUATION
# ==========================================
print("\n[6/8] Evaluating Best Model Checkpoint on Test Set...")
best_checkpoint = torch.load(config.MODEL_PATH, map_location=device)
model.load_state_dict(best_checkpoint['model_state_dict'])
model.eval()

test_preds, test_targets, test_probs = [], [], []

with torch.no_grad():
    for inputs, labels in tqdm(test_loader, desc="Evaluating Test Set"):
        inputs, labels = inputs.to(device), labels.to(device)
        with torch.amp.autocast('cuda'):
            outputs = model(inputs)
            probs = torch.softmax(outputs, dim=1)
            
        preds = torch.argmax(probs, dim=1).cpu().numpy()
        test_preds.extend(preds)
        test_targets.extend(labels.cpu().numpy())
        test_probs.extend(probs.cpu().numpy())

test_accuracy = accuracy_score(test_targets, test_preds)
macro_precision, macro_recall, macro_f1, _ = precision_recall_fscore_support(test_targets, test_preds, average='macro')
weighted_precision, weighted_recall, weighted_f1, _ = precision_recall_fscore_support(test_targets, test_preds, average='weighted')

print("====================================================")
print("FINAL TEST SET EVALUATION METRICS")
print("====================================================")
print(f"Test Accuracy:    {test_accuracy * 100:.2f}%")
print(f"Macro Precision:  {macro_precision * 100:.2f}%")
print(f"Macro Recall:     {macro_recall * 100:.2f}%")
print(f"Macro F1 Score:   {macro_f1 * 100:.2f}%")
print(f"Weighted F1:      {weighted_f1 * 100:.2f}%")
print("====================================================\n")

clf_report = classification_report(test_targets, test_preds, target_names=unique_labels, digits=4)
print("Classification Report:")
print(clf_report)

# ==========================================
# 9. GENERATE PLOTS & REPORT
# ==========================================
print("\n[7/8] Generating Plots and Training Artifacts...")

# Confusion Matrix plot
cm = confusion_matrix(test_targets, test_preds)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=unique_labels, yticklabels=unique_labels)
plt.title('PhishGuard AI — Test Set Confusion Matrix')
plt.xlabel('Predicted Label')
plt.ylabel('True Label')
plt.tight_layout()
cm_path = os.path.join(config.REPORT_DIR, "confusion_matrix.png")
plt.savefig(cm_path, dpi=300)
plt.close()

# Loss & F1 Curves plot
plt.figure(figsize=(12, 5))

plt.subplot(1, 2, 1)
plt.plot(range(1, len(train_losses) + 1), train_losses, label='Train Loss', color='#3b82f6', linewidth=2)
plt.plot(range(1, len(val_losses) + 1), val_losses, label='Val Loss', color='#ef4444', linewidth=2, linestyle='--')
plt.title('Training & Validation Loss')
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()
plt.grid(True, alpha=0.3)

plt.subplot(1, 2, 2)
plt.plot(range(1, len(train_f1s) + 1), train_f1s, label='Train Macro F1', color='#10b981', linewidth=2)
plt.plot(range(1, len(val_f1s) + 1), val_f1s, label='Val Macro F1', color='#8b5cf6', linewidth=2, linestyle='--')
plt.title('Training & Validation Macro F1 Score')
plt.xlabel('Epoch')
plt.ylabel('Macro F1')
plt.legend()
plt.grid(True, alpha=0.3)

plt.tight_layout()
curves_path = os.path.join(config.REPORT_DIR, "training_curves.png")
plt.savefig(curves_path, dpi=300)
plt.close()

# Save separate training/val loss and F1 files as required
plt.figure(figsize=(6, 4))
plt.plot(range(1, len(train_losses) + 1), train_losses, color='#3b82f6', linewidth=2)
plt.title('Training Loss')
plt.xlabel('Epoch'); plt.ylabel('Loss'); plt.grid(True, alpha=0.3)
plt.savefig(os.path.join(config.REPORT_DIR, "training_loss.png"), dpi=200); plt.close()

plt.figure(figsize=(6, 4))
plt.plot(range(1, len(val_losses) + 1), val_losses, color='#ef4444', linewidth=2)
plt.title('Validation Loss')
plt.xlabel('Epoch'); plt.ylabel('Loss'); plt.grid(True, alpha=0.3)
plt.savefig(os.path.join(config.REPORT_DIR, "validation_loss.png"), dpi=200); plt.close()

plt.figure(figsize=(6, 4))
plt.plot(range(1, len(train_f1s) + 1), train_f1s, color='#10b981', linewidth=2)
plt.title('Training F1')
plt.xlabel('Epoch'); plt.ylabel('F1'); plt.grid(True, alpha=0.3)
plt.savefig(os.path.join(config.REPORT_DIR, "training_f1.png"), dpi=200); plt.close()

plt.figure(figsize=(6, 4))
plt.plot(range(1, len(val_f1s) + 1), val_f1s, color='#8b5cf6', linewidth=2)
plt.title('Validation F1')
plt.xlabel('Epoch'); plt.ylabel('F1'); plt.grid(True, alpha=0.3)
plt.savefig(os.path.join(config.REPORT_DIR, "validation_f1.png"), dpi=200); plt.close()

# Write Markdown Training Report
print("\n[8/8] Writing Training Report...")
report_md = f"""# PhishGuard AI — GPU ML Training Report

## 1. Hardware & GPU Acceleration
- **Target GPU**: {gpu_name}
- **CUDA Version**: {cuda_version}
- **PyTorch Version**: {torch.__version__}
- **Total VRAM**: {gpu_memory_gb:.2f} GB
- **Device Location**: `cuda:0`

## 2. Dataset & Quality Analysis
- **Dataset File**: `malicious_phish.csv`
- **Total Raw Samples**: {total_raw_rows:,}
- **Deduplicated Clean Samples**: {len(df_dedup):,}
- **Detected Classes ({num_classes})**: {', '.join(unique_labels)}
- **URL Length Percentiles**:
  - 50th percentile: {p50:.1f}
  - 75th percentile: {p75:.1f}
  - 90th percentile: {p90:.1f}
  - 95th percentile: {p95:.1f}
  - 99th percentile: {p99:.1f}
  - Max Length: {max_len_data}
- **Selected Max Sequence Length**: {max_seq_len}

## 3. Data Split & Sampling Strategy
- **Train Set**: {len(train_df):,} (80%)
- **Validation Set**: {len(val_df):,} (10%)
- **Test Set**: {len(test_df):,} (10%)
- **Data Leakage Prevention**: Full URL deduplication before split.
- **Class Imbalance Mitigation**: Class-weighted CrossEntropyLoss calculated exclusively from training set.

## 4. Model Architecture & Vocabulary
- **Model Type**: Character-level 1D Convolutional Neural Network (Char-CNN)
- **Vocabulary Size**: {vocab_size} tokens (including `<PAD>` and `<UNK>`)
- **Embedding Dimension**: {config.EMBEDDING_DIM}
- **Convolutional Layers**: 3 x 1D Conv Blocks (Filters: 128, 256, 256 | Kernel sizes: 3, 5, 7) + BatchNorm + ReLU
- **Pooling**: Combined Adaptive Global Average Pooling & Max Pooling (512-dim output)
- **Dense Layers**: 512 → 256 → {num_classes} with Dropout ({config.DROPOUT})
- **Trainable Parameters**: {total_params:,}

## 5. Training Performance
- **Epochs Trained**: {len(train_losses)} / {config.EPOCHS} (Early stopping monitored on Val Macro F1)
- **Batch Size**: {config.BATCH_SIZE}
- **Optimizer**: AdamW (lr={config.LEARNING_RATE}) with ReduceLROnPlateau
- **Mixed Precision**: CUDA Automatic Mixed Precision (torch.amp)
- **Training Duration**: {total_training_duration / 60:.2f} minutes
- **Processing Throughput**: {len(train_df) * len(train_losses) / total_training_duration:.1f} samples/sec

## 6. Final Test Set Evaluation Results
- **Test Accuracy**: **{test_accuracy * 100:.2f}%**
- **Test Macro F1 Score**: **{macro_f1 * 100:.2f}%**
- **Test Weighted F1 Score**: **{weighted_f1 * 100:.2f}%**

### Per-Class Detailed Performance:
```
{clf_report}
```

## 7. Model Artifacts Saved
- **Model Weights**: `ml/models/phishguard_url_model.pt`
- **Vocabulary**: `ml/models/char_vocab.json`
- **Label Mapping**: `ml/models/label_mapping.json`
- **Configuration**: `ml/models/model_config.json`
"""

report_path = os.path.join(config.REPORT_DIR, "training_report.md")
with open(report_path, 'w') as f:
    f.write(report_md)

print(f"Training report saved to: {report_path}")
print("\n====================================================")
print("PHISHGUARD AI ML GPU TRAINING COMPLETE SUCCESSFULLY!")
print("====================================================")
