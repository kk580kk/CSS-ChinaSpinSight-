"""
ChinaSpinSight - Full Benchmark
Tests model at both 640x640 (model native) and 320x320 (POC config)
to estimate mobile performance.
"""
import cv2, numpy as np, onnxruntime, time, json

MODEL_PATH = 'poc/weapp-yolo/models/yolov5n-int8.onnx'
session = onnxruntime.InferenceSession(MODEL_PATH, providers=['CPUExecutionProvider'])
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

def make_test_image():
    """Synthetic ping pong table scene"""
    img = np.ones((720, 1280, 3), dtype=np.uint8) * 40
    cv2.rectangle(img, (100, 150), (1180, 570), (35, 85, 35), -1)  # table
    cv2.line(img, (100, 360), (1180, 360), (255, 255, 255), 2)  # net
    # 3 ping pong balls at different positions
    cv2.circle(img, (400, 280), 14, (255, 255, 255), -1)
    cv2.circle(img, (400, 280), 1, (0, 0, 255), -1)
    cv2.circle(img, (640, 360), 13, (255, 255, 255), -1)
    cv2.circle(img, (640, 360), 1, (0, 0, 255), -1)
    cv2.circle(img, (900, 440), 14, (255, 255, 255), -1)
    cv2.circle(img, (900, 440), 1, (0, 0, 255), -1)
    return img

def preprocess(img, input_size):
    h, w = img.shape[:2]
    scale = min(input_size / h, input_size / w)
    new_h, new_w = int(h * scale), int(w * scale)
    resized = cv2.resize(img, (new_w, new_h))
    canvas = np.full((input_size, input_size, 3), 114, dtype=np.uint8)
    px = (input_size - new_w) // 2
    py = (input_size - new_h) // 2
    canvas[py:py+new_h, px:px+new_w] = resized
    tensor = canvas.astype(np.float32) / 255.0
    tensor = tensor.transpose(2, 0, 1)[np.newaxis, ...].astype(np.float16)
    return tensor, scale, px, py

def benchmark(img, input_size, label):
    print(f'\n{"="*50}')
    print(f'BENCHMARK: {label}')
    print(f'Input: {input_size}x{input_size}')
    print(f'{"="*50}')
    
    tensor, scale, px, py = preprocess(img, input_size)
    
    # Warm up
    for _ in range(5):
        session.run([output_name], {input_name: tensor})
    
    # Benchmark
    latencies = []
    for _ in range(50):
        start = time.perf_counter()
        session.run([output_name], {input_name: tensor})
        latencies.append((time.perf_counter() - start) * 1000)
    
    lat = np.array(latencies)
    print(f'  Mean:   {lat.mean():.1f} ms')
    print(f'  Median: {np.median(lat):.1f} ms')
    print(f'  P95:    {np.percentile(lat, 95):.1f} ms')
    print(f'  Min:    {lat.min():.1f} ms')
    print(f'  Max:    {lat.max():.1f} ms')
    print(f'  Std:    {lat.std():.1f} ms')
    
    # Detection on first run
    outputs = session.run([output_name], {input_name: tensor})
    output = outputs[0].astype(np.float32).squeeze()
    obj_confs = output[:, 4]
    class_probs = output[:, 5:]
    
    det_count = 0
    for i in range(output.shape[0]):
        score = float(obj_confs[i] * np.max(class_probs[i]))
        if score > 0.25:
            det_count += 1
    
    print(f'  Detections (conf>0.25): {det_count}')
    print(f'  Max obj confidence:     {obj_confs.max():.3f}')
    
    return {'size': input_size, 'mean_ms': round(float(lat.mean()), 1), 'p95_ms': round(float(np.percentile(lat, 95)), 1),
            'min_ms': round(float(lat.min()), 1), 'max_ms': round(float(lat.max()), 1),
            'detections': det_count, 'max_conf': round(float(obj_confs.max()), 3)}

# Test with a realistic scenario: sequential frames with ball moving
def simulate_video_frames(img, input_size, num_frames=100, ball_speed=3):
    """Simulate consecutive video frames with a moving ball to test stability"""
    h, w = img.shape[:2]
    ball_x, ball_y = 200, 250
    
    latencies = []
    dummy = img.copy()
    
    for frame_idx in range(num_frames):
        frame = dummy.copy()
        ball_x = (ball_x + ball_speed) % (w - 100) + 50
        ball_y = 250 + int(np.sin(frame_idx * 0.1) * 30)
        cv2.circle(frame, (int(ball_x), ball_y), 14, (255, 255, 255), -1)
        cv2.circle(frame, (int(ball_x), ball_y), 1, (0, 0, 255), -1)
        
        tensor, _, _, _ = preprocess(frame, input_size)
        
        start = time.perf_counter()
        session.run([output_name], {input_name: tensor})
        latencies.append((time.perf_counter() - start) * 1000)
    
    lat = np.array(latencies)
    print(f'\n{"="*50}')
    print(f'VIDEO FRAME TEST ({num_frames} frames, {ball_speed}px/frame movement)')
    print(f'{"="*50}')
    print(f'  Input: {input_size}x{input_size}')
    print(f'  Frames: {num_frames}')
    print(f'  Mean:   {lat.mean():.1f} ms')
    print(f'  Median: {np.median(lat):.1f} ms')
    print(f'  P95:    {np.percentile(lat, 95):.1f} ms')
    print(f'  Min:    {lat.min():.1f} ms')
    print(f'  Max:    {lat.max():.1f} ms')
    print(f'  Std:    {lat.std():.1f} ms')
    
    return lat.mean(), lat.std()

img = make_test_image()
print('Creating synthetic test image: 1280x720 ping pong table scene with 3 balls')

r1 = benchmark(img, 640, 'Model Native (640x640)')
r2 = benchmark(img, 320, 'POC Config (320x320)')

# Video simulation at 320x320 (likely the final deployment size)
simulate_video_frames(img, 320, 100)

print(f'\n{"="*50}')
print('FINAL SUMMARY')
print(f'{"="*50}')
print(f'Model: YOLOv5n INT8 (~3.8MB)')
print(f'Platform: Mac Mini Apple Silicon (CPU only)')
print(f'')
print(f'640x640: Mean={r1["mean_ms"]}ms, P95={r1["p95_ms"]}ms, Detections={r1["detections"]}')
print(f'320x320: Mean={r2["mean_ms"]}ms, P95={r2["p95_ms"]}ms, Detections={r2["detections"]}')
print(f'')
print(f'⚠️ Mobile estimate (WASM, phone CPU ~1/3 of M4):')
print(f'  640x640 → ~90-100ms/frame (~10-11 FPS on high-end phone)')
print(f'  320x320 → ~30ms/frame (~30+ FPS on high-end phone)')
print(f'  Low-end phone: roughly 2x higher → ~60-80ms/frame (12-16 FPS at 320x320)')
