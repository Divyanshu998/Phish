# PhishGuard AI — GPU ML Training Report

## 1. Hardware & GPU Acceleration
- **Target GPU**: NVIDIA GeForce RTX 3050 6GB Laptop GPU
- **CUDA Version**: 13.0
- **PyTorch Version**: 2.13.0+cu130
- **Total VRAM**: 5.67 GB
- **Device Location**: `cuda:0`

## 2. Dataset & Quality Analysis
- **Dataset File**: `malicious_phish.csv`
- **Total Raw Samples**: 651,191
- **Deduplicated Clean Samples**: 641,119
- **Detected Classes (4)**: benign, defacement, malware, phishing
- **URL Length Percentiles**:
  - 50th percentile: 47.0
  - 75th percentile: 76.0
  - 90th percentile: 107.0
  - 95th percentile: 134.0
  - 99th percentile: 235.0
  - Max Length: 2175
- **Selected Max Sequence Length**: 256

## 3. Data Split & Sampling Strategy
- **Train Set**: 512,894 (80%)
- **Validation Set**: 64,110 (10%)
- **Test Set**: 64,115 (10%)
- **Data Leakage Prevention**: Full URL deduplication before split.
- **Class Imbalance Mitigation**: Class-weighted CrossEntropyLoss calculated exclusively from training set.

## 4. Model Architecture & Vocabulary
- **Model Type**: Character-level 1D Convolutional Neural Network (Char-CNN)
- **Vocabulary Size**: 331 tokens (including `<PAD>` and `<UNK>`)
- **Embedding Dimension**: 64
- **Convolutional Layers**: 3 x 1D Conv Blocks (Filters: 128, 256, 256 | Kernel sizes: 3, 5, 7) + BatchNorm + ReLU
- **Pooling**: Combined Adaptive Global Average Pooling & Max Pooling (512-dim output)
- **Dense Layers**: 512 → 256 → 4 with Dropout (0.3)
- **Trainable Parameters**: 803,140

## 5. Training Performance
- **Epochs Trained**: 8 / 15 (Early stopping monitored on Val Macro F1)
- **Batch Size**: 256
- **Optimizer**: AdamW (lr=0.001) with ReduceLROnPlateau
- **Mixed Precision**: CUDA Automatic Mixed Precision (torch.amp)
- **Training Duration**: 13.18 minutes
- **Processing Throughput**: 5188.8 samples/sec

## 6. Final Test Set Evaluation Results
- **Test Accuracy**: **97.95%**
- **Test Macro F1 Score**: **97.14%**
- **Test Weighted F1 Score**: **97.97%**

### Per-Class Detailed Performance:
```
              precision    recall  f1-score   support

      benign     0.9935    0.9803    0.9869     42808
  defacement     0.9938    0.9978    0.9958      9532
     malware     0.9760    0.9624    0.9691      2365
    phishing     0.9073    0.9617    0.9337      9410

    accuracy                         0.9795     64115
   macro avg     0.9677    0.9756    0.9714     64115
weighted avg     0.9803    0.9795    0.9797     64115

```

## 7. Model Artifacts Saved
- **Model Weights**: `ml/models/phishguard_url_model.pt`
- **Vocabulary**: `ml/models/char_vocab.json`
- **Label Mapping**: `ml/models/label_mapping.json`
- **Configuration**: `ml/models/model_config.json`
