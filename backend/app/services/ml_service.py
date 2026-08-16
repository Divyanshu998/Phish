import os
import json
from pathlib import Path

import torch
import torch.nn as nn


class CharCNNURLClassifier(nn.Module):
    def __init__(
        self,
        vocab_size,
        embedding_dim=64,
        num_classes=4,
        max_len=256,
        dropout=0.3,
    ):
        super(CharCNNURLClassifier, self).__init__()

        self.embedding = nn.Embedding(
            vocab_size,
            embedding_dim,
            padding_idx=0,
        )

        self.conv1 = nn.Conv1d(
            embedding_dim,
            128,
            kernel_size=3,
            padding=1,
        )
        self.bn1 = nn.BatchNorm1d(128)

        self.conv2 = nn.Conv1d(
            128,
            256,
            kernel_size=5,
            padding=2,
        )
        self.bn2 = nn.BatchNorm1d(256)

        self.conv3 = nn.Conv1d(
            256,
            256,
            kernel_size=7,
            padding=3,
        )
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


class PhishGuardMLService:
    def __init__(self, model_dir=None):

        # ---------------------------------------------------------
        # Resolve project root dynamically.
        #
        # File:
        # backend/app/services/ml_service.py
        #
        # Project root:
        # ../../..
        #
        # This works both locally and on Render.
        # ---------------------------------------------------------
        if model_dir is None:
            project_root = Path(__file__).resolve().parents[3]
            model_dir = project_root / "ml" / "models"

        self.model_dir = Path(model_dir)

        self.model_path = self.model_dir / "phishguard_url_model.pt"
        self.vocab_path = self.model_dir / "char_vocab.json"
        self.label_map_path = self.model_dir / "label_mapping.json"
        self.config_path = self.model_dir / "model_config.json"

        self.is_loaded = False

        self.device = torch.device(
            "cuda:0" if torch.cuda.is_available() else "cpu"
        )

        print(f"[ML Service] Model directory: {self.model_dir}")
        print(f"[ML Service] Model path: {self.model_path}")
        print(f"[ML Service] Device: {self.device}")

        self.load_model()

    def load_model(self):
        try:

            # -----------------------------------------------------
            # Check required files
            # -----------------------------------------------------
            required_files = {
                "model": self.model_path,
                "vocabulary": self.vocab_path,
                "label mapping": self.label_map_path,
                "configuration": self.config_path,
            }

            for name, path in required_files.items():
                if not path.exists():
                    print(
                        f"[ML Service Warning] "
                        f"{name.capitalize()} file not found: {path}"
                    )
                    return

            # -----------------------------------------------------
            # Load vocabulary
            # -----------------------------------------------------
            with open(self.vocab_path, "r", encoding="utf-8") as f:
                self.vocab = json.load(f)

            # -----------------------------------------------------
            # Load label mapping
            # -----------------------------------------------------
            with open(self.label_map_path, "r", encoding="utf-8") as f:
                lmap = json.load(f)

                self.id_to_label = {
                    int(k): v
                    for k, v in lmap["id_to_label"].items()
                }

                self.label_to_id = lmap["label_to_id"]

            # -----------------------------------------------------
            # Load model configuration
            # -----------------------------------------------------
            with open(self.config_path, "r", encoding="utf-8") as f:
                self.config = json.load(f)

            self.max_len = self.config.get(
                "max_seq_len",
                256,
            )

            self.unk_id = self.vocab.get(
                "<UNK>",
                1,
            )

            self.pad_id = self.vocab.get(
                "<PAD>",
                0,
            )

            # -----------------------------------------------------
            # Load PyTorch checkpoint
            # -----------------------------------------------------
            checkpoint = torch.load(
                self.model_path,
                map_location=self.device,
            )

            # -----------------------------------------------------
            # Create model architecture
            # -----------------------------------------------------
            self.model = CharCNNURLClassifier(
                vocab_size=len(self.vocab),
                embedding_dim=self.config.get(
                    "embedding_dim",
                    64,
                ),
                num_classes=len(self.id_to_label),
                max_len=self.max_len,
            )

            # -----------------------------------------------------
            # Load trained weights
            # -----------------------------------------------------
            self.model.load_state_dict(
                checkpoint["model_state_dict"]
            )

            self.model.to(self.device)

            self.model.eval()

            self.is_loaded = True

            print(
                "[ML Service] Successfully loaded PyTorch model "
                f"onto device: {self.device}"
            )

        except Exception as e:

            print(
                "[ML Service Error] "
                f"Failed to load PyTorch model: {e}"
            )

            self.is_loaded = False

    def predict(self, url: str) -> dict:

        # ---------------------------------------------------------
        # Safe fallback if model is unavailable
        # ---------------------------------------------------------
        if not self.is_loaded:
            return {
                "prediction": "UNKNOWN",
                "confidence": 0.50,
                "probabilities": {
                    "benign": 0.25,
                    "phishing": 0.25,
                    "defacement": 0.25,
                    "malware": 0.25,
                },
                "device": str(self.device),
            }

        # ---------------------------------------------------------
        # Normalize URL
        # ---------------------------------------------------------
        url_str = str(url).strip()

        # ---------------------------------------------------------
        # Convert URL characters to vocabulary IDs
        # ---------------------------------------------------------
        seq = [
            self.vocab.get(
                c,
                self.unk_id,
            )
            for c in url_str[: self.max_len]
        ]

        # ---------------------------------------------------------
        # Padding
        # ---------------------------------------------------------
        if len(seq) < self.max_len:
            seq += [
                self.pad_id
            ] * (
                self.max_len - len(seq)
            )

        # ---------------------------------------------------------
        # Convert to tensor
        # ---------------------------------------------------------
        tensor_in = torch.tensor(
            [seq],
            dtype=torch.long,
        ).to(self.device)

        # ---------------------------------------------------------
        # Model prediction
        # ---------------------------------------------------------
        with torch.no_grad():

            logits = self.model(tensor_in)

            probs = (
                torch.softmax(
                    logits,
                    dim=1,
                )
                .squeeze(0)
                .cpu()
                .numpy()
            )

        # ---------------------------------------------------------
        # Get predicted class
        # ---------------------------------------------------------
        pred_id = int(probs.argmax())

        pred_label = self.id_to_label[pred_id]

        confidence = float(
            probs[pred_id]
        )

        # ---------------------------------------------------------
        # Get probabilities for every class
        # ---------------------------------------------------------
        all_probs = {
            self.id_to_label[i]: float(probs[i])
            for i in range(len(probs))
        }

        # ---------------------------------------------------------
        # Convert display label
        # ---------------------------------------------------------
        display_prediction = (
            "LEGITIMATE"
            if pred_label == "benign"
            else pred_label.upper()
        )

        # ---------------------------------------------------------
        # Return prediction
        # ---------------------------------------------------------
        return {
            "prediction": display_prediction,
            "raw_class": pred_label,
            "confidence": round(
                confidence,
                4,
            ),
            "probabilities": {
                k: round(v, 4)
                for k, v in all_probs.items()
            },
            "device": str(self.device),
        }


# -------------------------------------------------------------
# Global singleton ML service instance
# -------------------------------------------------------------
ml_service = PhishGuardMLService()
