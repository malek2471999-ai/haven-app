"""Image processing pipeline for BAB."""
import io
import hashlib
from typing import Dict, Any, Optional, Tuple
from PIL import Image, ExifTags
import structlog

logger = structlog.get_logger()

class ImageProcessor:
    """Processes uploaded images for search."""
    
    MAX_DIMENSION = 2048
    MIN_FACE_SIZE = 80
    
    async def process(self, image_path: str) -> Dict[str, Any]:
        """Full image processing pipeline."""
        result = {
            "image_path": image_path,
            "width": 0,
            "height": 0,
            "image_hash": "",
            "quality_score": 1.0,
            "quality_warnings": [],
            "face_detected": False,
            "face_count": 0,
            "face_bbox": None,
        }
        
        try:
            img = Image.open(image_path)
            result["width"] = img.width
            result["height"] = img.height
            
            img = self._remove_metadata(img)
            img = self._correct_orientation(img)
            img = self._resize_if_needed(img)
            
            result["image_hash"] = self._compute_hash(img)
            quality = self._analyze_quality(img)
            result["quality_score"] = quality["score"]
            result["quality_warnings"] = quality["warnings"]
            
            faces = self._detect_faces(img)
            result["face_detected"] = len(faces) > 0
            result["face_count"] = len(faces)
            result["face_bbox"] = faces[0] if faces else None
            
            processed_path = image_path.replace(".", "_processed.")
            img.save(processed_path, quality=95)
            result["processed_path"] = processed_path
            
        except Exception as e:
            logger.error("Image processing failed", error=str(e))
            result["quality_warnings"].append(f"Processing error: {str(e)}")
        
        return result
    
    def _remove_metadata(self, img: Image.Image) -> Image.Image:
        data = list(img.getdata())
        clean = Image.new(img.mode, img.size)
        clean.putdata(data)
        return clean
    
    def _correct_orientation(self, img: Image.Image) -> Image.Image:
        try:
            exif = img._getexif()
            if exif:
                orientation_key = next(
                    k for k, v in ExifTags.TAGS.items() if v == 'Orientation'
                )
                orientation = exif.get(orientation_key)
                if orientation == 3:
                    img = img.rotate(180, expand=True)
                elif orientation == 6:
                    img = img.rotate(270, expand=True)
                elif orientation == 8:
                    img = img.rotate(90, expand=True)
        except (AttributeError, KeyError, StopIteration):
            pass
        return img
    
    def _resize_if_needed(self, img: Image.Image) -> Image.Image:
        if max(img.width, img.height) > self.MAX_DIMENSION:
            ratio = self.MAX_DIMENSION / max(img.width, img.height)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        return img
    
    def _compute_hash(self, img: Image.Image) -> str:
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return hashlib.sha256(buffer.getvalue()).hexdigest()
    
    def _analyze_quality(self, img: Image.Image) -> Dict[str, Any]:
        warnings = []
        score = 1.0
        
        if img.width < 200 or img.height < 200:
            warnings.append("Image resolution is low. Results may be less accurate.")
            score -= 0.2
        
        gray = img.convert('L')
        pixels = list(gray.getdata())
        mean = sum(pixels) / len(pixels)
        variance = sum((p - mean) ** 2 for p in pixels) / len(pixels)
        std = variance ** 0.5
        
        if std < 20:
            warnings.append("Low contrast detected. Results may be less accurate.")
            score -= 0.15
        
        if mean < 40:
            warnings.append("Image is very dark. Results may be less accurate.")
            score -= 0.15
        elif mean > 220:
            warnings.append("Image is overexposed. Results may be less accurate.")
            score -= 0.15
        
        return {"score": max(0, score), "warnings": warnings}
    
    def _detect_faces(self, img: Image.Image) -> list:
        """Detect faces using OpenCV if available, otherwise return empty list."""
        try:
            import cv2
            import numpy as np
            
            cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            face_cascade = cv2.CascadeClassifier(cascade_path)
            faces = face_cascade.detectMultiScale(cv_img, 1.1, 4, minSize=(self.MIN_FACE_SIZE, self.MIN_FACE_SIZE))
            
            return [{"x": int(x), "y": int(y), "w": int(w), "h": int(h)} for (x, y, w, h) in faces]
        except ImportError:
            logger.info("OpenCV not available, skipping face detection")
            return []
        except Exception as e:
            logger.warning("Face detection failed", error=str(e))
            return []

image_processor = ImageProcessor()
