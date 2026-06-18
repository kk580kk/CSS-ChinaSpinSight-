import cv2
import numpy as np
from typing import List, Tuple, Dict, Any
from dataclasses import dataclass


@dataclass
class SpinResult:
    spin_rounds: float
    confidence: float
    duration: float
    trajectory: List[Dict[str, Any]]


class SpinDetector:
    """Detect spin from marked ball video"""
    
    def __init__(self):
        self.mark_color_lower = np.array([0, 100, 100])  # Red marker
        self.mark_color_upper = np.array([10, 255, 255])
    
    def detect_spin(self, video_path: str) -> SpinResult:
        """
        Main entry: detect spin from video
        """
        cap = cv2.VideoCapture(video_path)
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Extract mark positions per frame
        mark_positions = []
        frame_count = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            marks = self._detect_marks(frame)
            if marks:
                mark_positions.append({
                    "frame": frame_count,
                    "marks": marks
                })
            
            frame_count += 1
        
        cap.release()
        
        # Calculate spin from mark positions
        spin_rounds, trajectory = self._calculate_spin(mark_positions, fps)
        
        # Calculate confidence
        confidence = self._calculate_confidence(len(mark_positions), total_frames)
        
        # Calculate duration
        duration = total_frames / fps if fps > 0 else 0
        
        return SpinResult(
            spin_rounds=spin_rounds,
            confidence=confidence,
            duration=duration,
            trajectory=trajectory
        )
    
    def _detect_marks(self, frame: np.ndarray) -> List[Tuple[float, float]]:
        """Detect marker points on ball"""
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, self.mark_color_lower, self.mark_color_upper)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        marks = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 10 or area > 100:  # Filter by marker size
                continue
            
            M = cv2.moments(contour)
            if M["m00"] > 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                marks.append((cx, cy))
        
        return marks
    
    def _calculate_spin(
        self,
        mark_positions: List[Dict],
        fps: float
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """Calculate rotation from mark positions"""
        if len(mark_positions) < 2:
            return 0.0, []
        
        # Simplified: count visible rotations
        # In production, use proper feature matching
        total_rotation = 0.0
        trajectory = []
        
        for i, pos in enumerate(mark_positions):
            trajectory.append({
                "frame": pos["frame"],
                "marks": pos["marks"],
                "timestamp": pos["frame"] / fps if fps > 0 else 0
            })
        
        # Estimate spin based on visible marks
        # This is a simplified MVP version
        if len(mark_positions) > 10:
            # Assume we saw marks for about 1 rotation per 10 frames
            estimated_rotations = len(mark_positions) / 15.0
            total_rotation = min(estimated_rotations, 10.0)  # Cap at 10
        
        return total_rotation, trajectory
    
    def _calculate_confidence(self, detected_frames: int, total_frames: int) -> float:
        """Calculate detection confidence"""
        if total_frames == 0:
            return 0.0
        
        ratio = detected_frames / total_frames
        # Confidence based on detection coverage
        confidence = min(ratio * 1.5, 0.95)
        return max(confidence, 0.5)  # Minimum 50%


class SpinAnalyzer:
    """Analyze spin characteristics"""
    
    @staticmethod
    def classify_spin(spin_rounds: float) -> str:
        """Classify spin strength"""
        if spin_rounds < 1:
            return "弱旋转"
        elif spin_rounds < 3:
            return "中等旋转"
        elif spin_rounds < 5:
            return "强旋转"
        else:
            return "极强旋转"
    
    @staticmethod
    def get_spin_level(spin_rounds: float) -> int:
        """Get spin level (1-4)"""
        if spin_rounds < 1:
            return 1
        elif spin_rounds < 3:
            return 2
        elif spin_rounds < 5:
            return 3
        else:
            return 4
