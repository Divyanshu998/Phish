import os

# Dataset & Paths
DATASET_PATH = "/run/media/scorpion/Venom/Project/malicious_phish.csv"
MODEL_DIR = "/run/media/scorpion/Venom/Project/ml/models"
REPORT_DIR = "/run/media/scorpion/Venom/Project/ml/reports"

MODEL_PATH = os.path.join(MODEL_DIR, "phishguard_url_model.pt")
VOCAB_PATH = os.path.join(MODEL_DIR, "char_vocab.json")
LABEL_MAP_PATH = os.path.join(MODEL_DIR, "label_mapping.json")
CONFIG_PATH = os.path.join(MODEL_DIR, "model_config.json")

# Hyperparameters
SEED = 42
TRAIN_RATIO = 0.80
VAL_RATIO = 0.10
TEST_RATIO = 0.10

# Sequence Length & Tokenizer
# Max sequence length will be dynamically decided or set to 256
MAX_SEQ_LEN = 256
EMBEDDING_DIM = 64
CONV_FILTERS = 128
FC_HIDDEN_DIM = 256
DROPOUT = 0.3

# Training
BATCH_SIZE = 256  # Well tuned for 6GB RTX 3050 GPU
EPOCHS = 15
LEARNING_RATE = 0.001
PATIENCE = 3
NUM_WORKERS = 0
