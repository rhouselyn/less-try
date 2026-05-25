#!/bin/bash
set -e

echo "============================================"
echo " LlamaGen BSQ-DC Pipeline"
echo " Tokenizer: bsqdc_evit_model (DCAE-32-128b-256px)"
echo "============================================"

PROJECT_ROOT="/mnt/afs/zhengmingkai/whl/llamagen"
cd ${PROJECT_ROOT}

DCAE_CKPT="${PROJECT_ROOT}/tokenizer/tokenizer_image/results_dcae_training/033-DCAE-32-128b-256px/checkpoints/epoch_0040.pt"
DATA_PATH="${PROJECT_ROOT}/data/imagenet/train"
CODE_PATH="${PROJECT_ROOT}/data/imagenet_code_bsqdc_c2i"
CLOUD_SAVE_PATH="${PROJECT_ROOT}/results_bsqdc"
IMAGE_SIZE=256
DOWNSAMPLE_SIZE=32
CODEBOOK_SIZE=16384
CODEBOOK_EMBED_DIM=8
GPT_MODEL="GPT-B"
NUM_CLASSES=1000
VOCAB_SIZE=${CODEBOOK_SIZE}
EPOCHS=300
LR=1e-4
GLOBAL_BATCH_SIZE=256
NUM_WORKERS=24
LOG_EVERY=100
CKPT_EVERY=5000
MIXED_PRECISION="bf16"

nnodes=1
nproc_per_node=8
node_rank=0
master_addr="127.0.0.1"
master_port=12345

while [[ $# -gt 0 ]]; do
    case $1 in
        --data-path) DATA_PATH="$2"; shift 2 ;;
        --code-path) CODE_PATH="$2"; shift 2 ;;
        --cloud-save-path) CLOUD_SAVE_PATH="$2"; shift 2 ;;
        --dcae-ckpt) DCAE_CKPT="$2"; shift 2 ;;
        --image-size) IMAGE_SIZE="$2"; shift 2 ;;
        --downsample-size) DOWNSAMPLE_SIZE="$2"; shift 2 ;;
        --codebook-size) CODEBOOK_SIZE="$2"; shift 2 ;;
        --codebook-embed-dim) CODEBOOK_EMBED_DIM="$2"; shift 2 ;;
        --gpt-model) GPT_MODEL="$2"; shift 2 ;;
        --vocab-size) VOCAB_SIZE="$2"; shift 2 ;;
        --num-classes) NUM_CLASSES="$2"; shift 2 ;;
        --epochs) EPOCHS="$2"; shift 2 ;;
        --lr) LR="$2"; shift 2 ;;
        --global-batch-size) GLOBAL_BATCH_SIZE="$2"; shift 2 ;;
        --gpt-ckpt) GPT_CKPT="$2"; shift 2 ;;
        --nnodes) nnodes="$2"; shift 2 ;;
        --nproc_per_node) nproc_per_node="$2"; shift 2 ;;
        --node_rank) node_rank="$2"; shift 2 ;;
        --master_addr) master_addr="$2"; shift 2 ;;
        --master_port) master_port="$2"; shift 2 ;;
        --skip-extract) SKIP_EXTRACT=1; shift ;;
        --skip-train) SKIP_TRAIN=1; shift ;;
        --skip-sample) SKIP_SAMPLE=1; shift ;;
        --step)
            STEP="$2"
            case $STEP in
                extract) SKIP_TRAIN=1; SKIP_SAMPLE=1 ;;
                train) SKIP_EXTRACT=1; SKIP_SAMPLE=1 ;;
                sample) SKIP_EXTRACT=1; SKIP_TRAIN=1 ;;
                *) echo "Unknown step: $STEP (use: extract, train, sample)"; exit 1 ;;
            esac
            shift 2
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo ""
echo "Configuration:"
echo "  DCAE checkpoint: ${DCAE_CKPT}"
echo "  Data path:       ${DATA_PATH}"
echo "  Code path:       ${CODE_PATH}"
echo "  Cloud save path: ${CLOUD_SAVE_PATH}"
echo "  Image size:      ${IMAGE_SIZE}"
echo "  Downsample size: ${DOWNSAMPLE_SIZE}"
echo "  Codebook size:   ${CODEBOOK_SIZE}"
echo "  GPT model:       ${GPT_MODEL}"
echo "  Vocab size:      ${VOCAB_SIZE}"
echo "  Num classes:     ${NUM_CLASSES}"
echo "  Epochs:          ${EPOCHS}"
echo "  Learning rate:   ${LR}"
echo "  Batch size:      ${GLOBAL_BATCH_SIZE}"
echo "  GPUs:            ${nproc_per_node}"
echo ""

###############################################
# Step 1: Extract discrete codes
###############################################
if [ -z "${SKIP_EXTRACT}" ]; then
    echo "============================================"
    echo " Step 1: Extracting discrete codes using BSQ-DC tokenizer"
    echo "============================================"

    torchrun \
    --nnodes=${nnodes} --nproc_per_node=${nproc_per_node} --node_rank=${node_rank} \
    --master_addr=${master_addr} --master_port=${master_port} \
    extract_codes_bsqdc.py \
        --vq-ckpt ${DCAE_CKPT} \
        --data-path ${DATA_PATH} \
        --code-path ${CODE_PATH} \
        --image-size ${IMAGE_SIZE} \
        --codebook-size ${CODEBOOK_SIZE} \
        --codebook-embed-dim ${CODEBOOK_EMBED_DIM} \
        --num-workers ${NUM_WORKERS}

    echo "Code extraction completed!"
    echo "Codes saved to: ${CODE_PATH}"
else
    echo "Skipping code extraction (--skip-extract)"
fi

###############################################
# Step 2: Train autoregressive model
###############################################
if [ -z "${SKIP_TRAIN}" ]; then
    echo "============================================"
    echo " Step 2: Training autoregressive GPT model"
    echo "============================================"

    TRAIN_CMD="torchrun \
    --nnodes=${nnodes} --nproc_per_node=${nproc_per_node} --node_rank=${node_rank} \
    --master_addr=${master_addr} --master_port=${master_port} \
    train_c2i_bsqdc.py \
        --code-path ${CODE_PATH} \
        --cloud-save-path ${CLOUD_SAVE_PATH} \
        --image-size ${IMAGE_SIZE} \
        --downsample-size ${DOWNSAMPLE_SIZE} \
        --gpt-model ${GPT_MODEL} \
        --vocab-size ${VOCAB_SIZE} \
        --num-classes ${NUM_CLASSES} \
        --epochs ${EPOCHS} \
        --lr ${LR} \
        --global-batch-size ${GLOBAL_BATCH_SIZE} \
        --num-workers ${NUM_WORKERS} \
        --log-every ${LOG_EVERY} \
        --ckpt-every ${CKPT_EVERY} \
        --mixed-precision ${MIXED_PRECISION}"

    if [ -n "${GPT_CKPT}" ]; then
        TRAIN_CMD="${TRAIN_CMD} --gpt-ckpt ${GPT_CKPT}"
    fi

    eval ${TRAIN_CMD}

    echo "Training completed!"
else
    echo "Skipping training (--skip-train)"
fi

###############################################
# Step 3: Sample images
###############################################
if [ -z "${SKIP_SAMPLE}" ]; then
    echo "============================================"
    echo " Step 3: Sampling images"
    echo "============================================"

    if [ -z "${GPT_CKPT}" ]; then
        LATEST_CKPT=$(ls -t ${CLOUD_SAVE_PATH}/*/0*-${GPT_MODEL}/checkpoints/*.pt 2>/dev/null | head -1)

        if [ -z "${LATEST_CKPT}" ]; then
            LATEST_CKPT=$(ls -t results/0*-${GPT_MODEL}/checkpoints/*.pt 2>/dev/null | head -1)
        fi

        if [ -z "${LATEST_CKPT}" ]; then
            echo "ERROR: No GPT checkpoint found! Please specify --gpt-ckpt <path>"
            exit 1
        fi
    else
        LATEST_CKPT=${GPT_CKPT}
    fi

    echo "Using GPT checkpoint: ${LATEST_CKPT}"

    python sample_c2i_bsqdc.py \
        --vq-ckpt ${DCAE_CKPT} \
        --gpt-ckpt ${LATEST_CKPT} \
        --gpt-model ${GPT_MODEL} \
        --image-size ${IMAGE_SIZE} \
        --downsample-size ${DOWNSAMPLE_SIZE} \
        --codebook-size ${CODEBOOK_SIZE} \
        --codebook-embed-dim ${CODEBOOK_EMBED_DIM} \
        --num-classes ${NUM_CLASSES} \
        --cfg-scale 2.0 \
        --temperature 1.0 \
        --top-k 0

    echo "Sampling completed!"
else
    echo "Skipping sampling (--skip-sample)"
fi

echo ""
echo "============================================"
echo " Pipeline completed!"
echo "============================================"
