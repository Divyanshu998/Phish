import os
import sys
import json
import argparse
import torch
import torch.nn as nn

# Model Definition matching training
class CharCNNURLClassifier(nn.Module):
    def __init__(self, vocab_size, embedding_dim=64, num_classes=4, max_len=256, dropout=0.3):
        super(CharCNNURLClassifier, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=0)
        
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
        
        self.fc1 = nn.Linear(512, 256)
        self.fc_bn = nn.BatchNorm1d(256)
        self.fc2 = nn.Linear(256, num_classes)

    def forward(self, x):
        out = self.embedding(x)
        out = out.transpose(1, 2)
        out = self.relu(self.bn1(self.conv1(out)))
        out = self.relu(self.bn2(self.conv2(out)))
        out = self.relu(self.bn3(self.conv3(out)))
        
        avg_p = self.pool(out).squeeze(2)
        max_p = self.max_pool(out).squeeze(2)
        pooled = torch.cat([avg_p, max_p], dim=1)
        
        out = self.dropout(pooled)
        out = self.relu(self.fc_bn(self.fc1(out)))
        out = self.dropout(out)
        logits = self.fc2(out)
        return logits


class PhishGuardPredictor:
    def __init__(self, model_dir="/run/media/scorpion/Venom/Project/ml/models"):
        self.model_path = os.path.join(model_dir, "phishguard_url_model.pt")
        self.vocab_path = os.path.join(model_dir, "char_vocab.json")
        self.label_map_path = os.path.join(model_dir, "label_mapping.json")
        self.config_path = os.path.join(model_dir, "model_config.json")
        
        # Load vocab & mappings
        with open(self.vocab_path, 'r') as f:
            self.vocab = json.load(f)
        with open(self.label_map_path, 'r') as f:
            lmap = json.load(f)
            self.id_to_label = {int(k): v for k, v in lmap['id_to_label'].items()}
            self.label_to_id = lmap['label_to_id']
            
        with open(self.config_path, 'r') as f:
            self.config = json.load(f)
            
        self.max_len = self.config.get('max_seq_len', 256)
        self.unk_id = self.vocab.get("<UNK>", 1)
        self.pad_id = self.vocab.get("<PAD>", 0)
        
        # Device selection (CUDA preferred)
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        
        # Initialize & load model
        checkpoint = torch.load(self.model_path, map_location=self.device)
        self.model = CharCNNURLClassifier(
            vocab_size=len(self.vocab),
            embedding_dim=self.config.get('embedding_dim', 64),
            num_classes=len(self.id_to_label),
            max_len=self.max_len
        )
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()

    def preprocess(self, url: str) -> torch.Tensor:
        url_str = str(url).strip()
        seq = [self.vocab.get(c, self.unk_id) for c in url_str[:self.max_len]]
        if len(seq) < self.max_len:
            seq += [self.pad_id] * (self.max_len - len(seq))
        return torch.tensor([seq], dtype=torch.long)

    def predict(self, url: str) -> dict:
        tensor_in = self.preprocess(url).to(self.device)
        with torch.no_grad():
            logits = self.model(tensor_in)
            probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()
            
        pred_id = int(probs.argmax())
        pred_label = self.id_to_label[pred_id]
        confidence = float(probs[pred_id])
        
        all_probs = {self.id_to_label[i]: float(probs[i]) for i in range(len(probs))}
        
        return {
            "url": url,
            "prediction": pred_label,
            "confidence": confidence,
            "probabilities": all_probs,
            "device": str(self.device)
        }


def main():
    parser = argparse.ArgumentParser(description="PhishGuard AI URL Model Predictor")
    parser.add_argument("url", nargs="?", help="URL to analyze")
    parser.add_argument("--file", help="Path to text file containing URLs line by line")
    args = parser.parse_args()
    
    predictor = PhishGuardPredictor()
    
    if args.url:
        res = predictor.predict(args.url)
        print("\n==========================================")
        print("PHISHGUARD AI — ML INFERENCE RESULT")
        print("==========================================")
        print(f"URL:          {res['url']}")
        print(f"Prediction:   {res['prediction'].upper()}")
        print(f"Confidence:   {res['confidence'] * 100:.2f}%")
        print(f"Device:       {res['device']}")
        print("Probabilities:")
        for label, prob in res['probabilities'].items():
            print(f"  - {label:<12}: {prob * 100:.2f}%")
        print("==========================================\n")
    elif args.file:
        if not os.path.exists(args.file):
            print(f"Error: File '{args.file}' not found.")
            sys.exit(1)
        with open(args.file, 'r') as f:
            urls = [line.strip() for line in f if line.strip()]
        
        results = []
        for url in urls:
            res = predictor.predict(url)
            results.append({
                "url": url,
                "prediction": res["prediction"],
                "confidence": round(res["confidence"], 4)
            })
            
        import pandas as pd
        out_csv = "predictions.csv"
        pd.DataFrame(results).to_csv(out_csv, index=False)
        print(f"Batch prediction completed for {len(urls)} URLs. Saved to '{out_csv}'.")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
