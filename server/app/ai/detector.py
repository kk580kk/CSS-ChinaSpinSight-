import cv2
import numpy as np
import torch
from pathlib import Path
from typing import List, Tuple, Optional
from app.config import get_settings

settings = get_settings()


class BallDetector:
    """YOLO-based ping pong ball detector"""
    
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or f"{settings.MODEL_PATH}/yolov5n.pt"
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._load_model()
    
    def _load_model(self):
        """Load YOLO model"""
        try:
            # For MVP, use a simplified approach
            # In production, load actual trained model
            self.model = None  # Placeholder
            print(f"Model would be loaded from: {self.model_path}")
        except Exception as e:
            print(f"Failed to load model: {e}")
    
    def detect(self, frame: np.ndarray) -> List[Tuple[float, float, float, float, float]]:
        """
        Detect ball in frame
        Returns: List of (x, y, w, h, confidence)
        """
        # MVP: Simplified detection using color and shape
        # In production, use actual YOLO inference
        
        detections = []
        
        # Convert to HSV for color detection
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # White ball detection (simplified)
        lower_white = np.array([0, 0, 200])
        upper_white = np.array([180, 30, 255])
        mask = cv2.inRange(hsv, lower_white, upper_white)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 50 or area > 5000:  # Filter by size
                continue
            
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = float(w) / h
            
            # Ball should be roughly circular
            if 0.7 < aspect_ratio < 1.3:
                confidence = min(area / 500, 0.95)  # Simplified confidence
                detections.append((x, y, w, h, confidence))
        
        return detections
    
    def detect_in_video(self, video_path: str) -> List[List[Tuple[float, float, float, float, float]]]:
        """Detect ball in each frame of video"""
        cap = cv2.VideoCapture(video_path)
        detections_per_frame = []
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            detections = self.detect(frame)
            detections_per_frame.append(detections)
        
        cap.release()
        return detections_per_frame


class BallTracker:
    """Track ball across frames"""
    
    def __init__(self):
        self.trajectory = []
        self.kalman = None
    
    def track(self, detections_per_frame: List[List[Tuple]]) -> List[Tuple[float, float]]:
        """
        Track ball trajectory from detections
        Returns: List of (x, y) center points
        """
        trajectory = []
        
        for frame_dets in detections_per_frame:
            if frame_dets:
                # Take detection with highest confidence
                best_det = max(frame_dets, key=lambda d: d[4])
                x, y, w, h, conf = best_det
                center_x = x + w / 2
                center_y = y + h / 2
                trajectory.append((center_x, center_y))
        
        # Smooth trajectory
        if len(trajectory) > 3:
            trajectory = self._smooth_trajectory(trajectory)
        
        return trajectory
    
    def _smooth_trajectory(self, trajectory: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Apply moving average smoothing"""
        smoothed = []
        window = 3
        
        for i in range(len(trajectory)):
            start = max(0, i - window // 2)
            end = min(len(trajectory), i + window // 2 + 1)
            window_points = trajectory[start:end]
            avg_x = sum(p[0] for p in window_points) / len(window_points)
            avg_y = sum(p[1] for p in window_points) / len(window_points)
            smoothed.append((avg_x, avg_y))
        
        return smoothed
