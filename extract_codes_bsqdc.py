import torch
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True
import torch.distributed as dist
from torch.utils.data import DataLoader
from torch.utils.data.distributed import DistributedSampler
from torchvision import transforms
import numpy as np
import argparse
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR) if os.path.basename(SCRIPT_DIR) in ['autoregressive', 'train', 'scripts'] else SCRIPT_DIR
sys.path.insert(0, PROJECT_ROOT)

from utils.distributed import init_distributed_mode
from dataset.augmentation import center_crop_arr
from dataset.build import build_dataset

try:
    from tokenizer.tokenizer_image.bsqdc_evit_model import BSQDCViT_models as VQ_models
except ImportError:
    try:
        from tokenizer.tokenizer_image.bsqdc_evit_model import DCAE_models as VQ_models
    except ImportError:
        from tokenizer.tokenizer_image.bsqdc_evit_model import VQ_models


def main(args):
    assert torch.cuda.is_available(), "Training currently requires at least one GPU."

    if not args.debug:
        init_distributed_mode(args)
        rank = dist.get_rank()
        device = rank % torch.cuda.device_count()
        seed = args.global_seed * dist.get_world_size() + rank
        torch.manual_seed(seed)
        torch.cuda.set_device(device)
        print(f"Starting rank={rank}, seed={seed}, world_size={dist.get_world_size()}.")
    else:
        device = 'cuda'
        rank = 0

    if args.debug or rank == 0:
        os.makedirs(args.code_path, exist_ok=True)
        os.makedirs(os.path.join(args.code_path, f'{args.dataset}{args.image_size}_codes'), exist_ok=True)
        os.makedirs(os.path.join(args.code_path, f'{args.dataset}{args.image_size}_labels'), exist_ok=True)

    vq_model = VQ_models[args.vq_model](
        codebook_size=args.codebook_size,
        codebook_embed_dim=args.codebook_embed_dim)
    vq_model.to(device)
    vq_model.eval()

    checkpoint = torch.load(args.vq_ckpt, map_location="cpu")
    if "model" in checkpoint:
        vq_model.load_state_dict(checkpoint["model"])
    elif "state_dict" in checkpoint:
        vq_model.load_state_dict(checkpoint["state_dict"])
    elif "ema" in checkpoint:
        vq_model.load_state_dict(checkpoint["ema"])
    else:
        vq_model.load_state_dict(checkpoint)
    del checkpoint
    print(f"BSQ-DC tokenizer loaded from {args.vq_ckpt}")

    if args.ten_crop:
        crop_size = int(args.image_size * args.crop_range)
        transform = transforms.Compose([
            transforms.Lambda(lambda pil_image: center_crop_arr(pil_image, crop_size)),
            transforms.TenCrop(args.image_size),
            transforms.Lambda(lambda crops: torch.stack([transforms.ToTensor()(crop) for crop in crops])),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5], inplace=True)
        ])
    else:
        crop_size = args.image_size
        transform = transforms.Compose([
            transforms.Lambda(lambda pil_image: center_crop_arr(pil_image, crop_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5], inplace=True)
        ])

    dataset = build_dataset(args, transform=transform)

    if not args.debug:
        sampler = DistributedSampler(
            dataset,
            num_replicas=dist.get_world_size(),
            rank=rank,
            shuffle=False,
            seed=args.global_seed
        )
    else:
        sampler = None

    loader = DataLoader(
        dataset,
        batch_size=1,
        shuffle=False,
        sampler=sampler,
        num_workers=args.num_workers,
        pin_memory=True,
        drop_last=False
    )

    total = 0
    for x, y in loader:
        x = x.to(device)
        if args.ten_crop:
            x_all = x.flatten(0, 1)
            num_aug = 10
        else:
            x_flip = torch.flip(x, dims=[-1])
            x_all = torch.cat([x, x_flip])
            num_aug = 2
        y = y.to(device)

        with torch.no_grad():
            encode_result = vq_model.encode(x_all)
            if isinstance(encode_result, (list, tuple)) and len(encode_result) == 3:
                _, _, info = encode_result
                if isinstance(info, (list, tuple)):
                    indices = info[-1]
                else:
                    indices = info
            elif isinstance(encode_result, (list, tuple)):
                indices = encode_result[-1]
            else:
                raise ValueError(f"Unexpected encode result type: {type(encode_result)}")

        codes = indices.reshape(x.shape[0], num_aug, -1)
        x_np = codes.detach().cpu().numpy()
        train_steps = rank + total
        np.save(f'{args.code_path}/{args.dataset}{args.image_size}_codes/{train_steps}.npy', x_np)
        y_np = y.detach().cpu().numpy()
        np.save(f'{args.code_path}/{args.dataset}{args.image_size}_labels/{train_steps}.npy', y_np)

        if not args.debug:
            total += dist.get_world_size()
        else:
            total += 1
        if total % 1000 == 0:
            print(f"Processed {total} images")

    if not args.debug:
        dist.destroy_process_group()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-path", type=str, required=True)
    parser.add_argument("--code-path", type=str, required=True)
    parser.add_argument("--vq-model", type=str, default="DCAE-32")
    parser.add_argument("--vq-ckpt", type=str, required=True, help="ckpt path for BSQ-DC tokenizer model")
    parser.add_argument("--codebook-size", type=int, default=16384, help="codebook size for vector quantization")
    parser.add_argument("--codebook-embed-dim", type=int, default=8, help="codebook dimension for vector quantization")
    parser.add_argument("--dataset", type=str, default='imagenet')
    parser.add_argument("--image-size", type=int, choices=[256, 384, 448, 512], default=256)
    parser.add_argument("--ten-crop", action='store_true', help="whether using ten crop augmentation")
    parser.add_argument("--crop-range", type=float, default=1.1, help="expanding range of center crop")
    parser.add_argument("--global-seed", type=int, default=0)
    parser.add_argument("--num-workers", type=int, default=24)
    parser.add_argument("--debug", action='store_true')
    args = parser.parse_args()
    main(args)
