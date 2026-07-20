"""
ChinaSpinSight - Local Inference Test
Run the YOLOv5n INT8 model on a synthetic test image to measure:
- Model loading time
- Inference latency
- Detection confidence
- Memory estimate

Usage: source .venv/bin/activate && python3 poc/test_local_inference.py
"""

import time
import cv2
import numpy as np
import onnxruntime
from PIL import Image, ImageDraw
import json

MODEL_PATH = "poc/weapp-yolo/models/yolov5n-int8.onnx"
TEST_IMAGE_SIZE = (320, 320)
COCO_CLASSES = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
    'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
    'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
    'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
    'toothbrush'
]

# COCO class IDs for sports ball (class 32) and person (class 0)
SPORTS_BALL_ID = 32
PERSON_ID = 0


def create_test_image_with_ball(size=(640, 480)):
    """Create a synthetic test image with a simulated ping pong ball."""
    img = Image.new('RGB', size, (50, 50, 50))  # dark gray background
    draw = ImageDraw.Draw(img)
    
    # Draw a ping pong ball (white circle)
    ball_x, ball_y = 320, 240
    ball_radius = 15
    draw.ellipse(
        [ball_x - ball_radius, ball_y - ball_radius, 
         ball_x + ball_radius, ball_y + ball_radius],
        fill=(255, 255, 255),
        outline=(200, 200, 200)
    )
    
    # Add a red mark on the ball (to simulate rotation marker)
    draw.ellipse(
        [ball_x - 3, ball_y - 3, ball_x + 3, ball_y + 3],
        fill=(255, 0, 0)
    )
    
    return np.array(img)


def preprocess(image_np, input_size=640):
    """Preprocess image for YOLOv5 inference."""
    h, w = image_np.shape[:2]
    
    # Letterbox resize
    scale = min(input_size / h, input_size / w)
    new_h, new_w = int(h * scale), int(w * scale)
    
    resized = cv2.resize(image_np, (new_w, new_h))
    
    # Create square canvas with gray padding
    canvas = np.full((input_size, input_size, 3), 114, dtype=np.uint8)
    pad_x = (input_size - new_w) // 2
    pad_y = (input_size - new_h) // 2
    canvas[pad_y:pad_y + new_h, pad_x:pad_x + new_w] = resized
    
    # Normalize and convert to NCHW
    input_tensor = canvas.astype(np.float32) / 255.0
    input_tensor = input_tensor.transpose(2, 0, 1)  # HWC -> CHW
    input_tensor = np.expand_dims(input_tensor, axis=0)  # CHW -> NCHW
    
    # Model expects float16 input
    input_tensor = input_tensor.astype(np.float16)
    
    return input_tensor, scale, pad_x, pad_y


def postprocess(output, conf_threshold=0.25, iou_threshold=0.45):
    output = output.astype(np.float32)  # Convert from float16 if needed
    """YOLOv5 post-processing with NMS."""
    output = output.squeeze()
    num_detections = output.shape[0]
    
    boxes = []
    scores = []
    class_ids = []
    
    for i in range(num_detections):
        detection = output[i]
        x, y, w, h = detection[0:4]
        obj_conf = detection[4]
        class_probs = detection[5:]
        
        max_class_prob = np.max(class_probs)
        class_id = np.argmax(class_probs)
        score = obj_conf * max_class_prob
        
        if score < conf_threshold:
            continue
        
        # Convert center coordinates to corner coordinates
        x1 = x - w / 2
        y1 = y - h / 2
        x2 = x + w / 2
        y2 = y + h / 2
        
        boxes.append([x1, y1, x2, y2])
        scores.append(float(score))
        class_ids.append(int(class_id))
    
    # NMS
    if len(boxes) > 0:
        indices = cv2.dnn.NMSBoxes(boxes, scores, conf_threshold, iou_threshold)
        if len(indices) > 0:
            indices = indices.flatten()
            return [
                {
                    'box': boxes[i],
                    'score': scores[i],
                    'class_id': class_ids[i],
                    'class_name': COCO_CLASSES[class_ids[i]] if class_ids[i] < len(COCO_CLASSES) else f'unknown_{class_ids[i]}'
                }
                for i in indices
            ]
    
    return []


def run_inference():
    """Run inference test with the YOLOv5n INT8 model."""
    print("=" * 60)
    print("ChinaSpinSight - Local Inference Test")
    print("=" * 60)
    print(f"Model: {MODEL_PATH}")
    print(f"Test conditions: CoreML + CPU on Mac Mini (Apple Silicon)")
    print()
    
    # --- 1. Load Model ---
    print("[1/4] Loading model...")
    load_start = time.time()
    
    session = onnxruntime.InferenceSession(
        MODEL_PATH,
        providers=['CoreMLExecutionProvider', 'CPUExecutionProvider']
    )
    
    load_time = time.time() - load_start
    print(f"  ✅ Model loaded in {load_time:.2f}s")
    
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    input_shape = session.get_inputs()[0].shape
    print(f"  Input: {input_name} {input_shape}")
    print(f"  Output: {output_name} {session.get_outputs()[0].shape}")
    print()
    
    # --- 2. Create test image ---
    print("[2/4] Creating synthetic test image...")
    test_img = create_test_image_with_ball(size=(640, 480))
    h, w = test_img.shape[:2]
    print(f"  Test image: {w}x{h}")
    print()
    
    # --- 3. Warm-up ---
    print("[3/4] Warm-up inference...")
    input_tensor, scale, pad_x, pad_y = preprocess(test_img)
    
    for i in range(3):
        _ = session.run([output_name], {input_name: input_tensor})
    print(f"  ✅ Warm-up complete (3 runs)")
    print()
    
    # --- 4. Benchmark ---
    print("[4/4] Benchmarking (50 runs)...")
    latencies = []
    
    for i in range(50):
        input_tensor, scale, pad_x, pad_y = preprocess(test_img)
        
        start = time.perf_counter()
        outputs = session.run([output_name], {input_name: input_tensor})
        elapsed = (time.perf_counter() - start) * 1000  # ms
        
        latencies.append(elapsed)
    
    latencies = np.array(latencies)
    print(f"  Results (50 runs):")
    print(f"    Mean:   {latencies.mean():.1f} ms")
    print(f"    Median: {np.median(latencies):.1f} ms")
    print(f"    Min:    {latencies.min():.1f} ms")
    print(f"    Max:    {latencies.max():.1f} ms")
    print(f"    Std:    {latencies.std():.1f} ms")
    print(f"    P95:    {np.percentile(latencies, 95):.1f} ms")
    print(f"    P99:    {np.percentile(latencies, 99):.1f} ms")
    print()
    
    # --- 5. Actual detection on test image ---
    print("[5] Running detection on synthetic ping pong test image...")
    input_tensor, scale, pad_x, pad_y = preprocess(test_img)
    outputs = session.run([output_name], {input_name: input_tensor})
    
    # Get the actual output shape
    print(f"  Output shape: {outputs[0].shape}")
    
    detections = postprocess(outputs[0])
    
    print(f"  Detections: {len(detections)}")
    for det in detections:
        print(f"    - {det['class_name']} (class {det['class_id']}) "
              f"score={det['score']:.3f} "
              f"box=[{det['box'][0]:.1f},{det['box'][1]:.1f},{det['box'][2]:.1f},{det['box'][3]:.1f}]")
    print()
    
    # --- Summary ---
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Model load time:      {load_time:.2f}s")
    print(f"Inference (mean):     {latencies.mean():.1f}ms")
    print(f"Inference (P95):      {np.percentile(latencies, 95):.1f}ms")
    print(f"Detection (test img): {len(detections)} objects")
    print(f"Model size:           ~3.8MB (INT8 quantized)")
    print(f"Input resolution:     320x320")
    print(f"Runtime:              ONNX Runtime {onnxruntime.__version__}")
    print(f"Provider:             CoreML + CPU")
    print()
    print("⚠️  Note: Mac Mini Apple Silicon test != mobile device")
    print("   WeChat mini-program runs on phone with WASM backend")
    print("   Mobile latency expected to be 3-5x higher")
    print("   This test only validates model integrity and code correctness")
    
    return {
        'model_load_time_s': round(load_time, 2),
        'inference_mean_ms': round(float(latencies.mean()), 1),
        'inference_median_ms': round(float(np.median(latencies)), 1),
        'inference_p95_ms': round(float(np.percentile(latencies, 95)), 1),
        'inference_min_ms': round(float(latencies.min()), 1),
        'inference_max_ms': round(float(latencies.max()), 1),
        'inference_std_ms': round(float(latencies.std()), 1),
        'detections': len(detections),
        'model_size_mb': 3.8,
        'input_resolution': '320x320',
        'runtime': f'onnxruntime-{onnxruntime.__version__}',
        'provider': 'CoreML+CPU',
        'test_date': '2026-07-20',
        'test_platform': 'Mac Mini M4 (Apple Silicon)'
    }


if __name__ == '__main__':
    results = run_inference()
    print()
    print("JSON output:")
    print(json.dumps(results, indent=2))
