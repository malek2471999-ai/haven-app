"""Visual similarity calculation engine."""
import hashlib
from typing import Dict, Any, Optional, List
import structlog

logger = structlog.get_logger()

class SimilarityEngine:
    """Calculates visual similarity between images."""
    
    WEIGHTS = {
        "visual_embedding": 0.35,
        "image_hash": 0.25,
        "crop_similarity": 0.20,
        "provider_confidence": 0.15,
        "duplicate_evidence": 0.05,
    }
    
    async def calculate_similarity(
        self,
        query_features: Dict[str, Any],
        result_features: Dict[str, Any],
    ) -> Dict[str, float]:
        """Calculate multi-metric similarity between two images."""
        visual = self._visual_similarity(
            query_features.get("embedding"),
            result_features.get("embedding")
        )
        
        hash_sim = self._hash_similarity(
            query_features.get("phash"),
            result_features.get("phash")
        )
        
        crop_sim = self._crop_similarity(
            query_features.get("crop_embedding"),
            result_features.get("crop_embedding")
        )
        
        provider_conf = result_features.get("provider_confidence", 0.5)
        dup_ev = result_features.get("duplicate_evidence", 0.0)
        
        final = (
            self.WEIGHTS["visual_embedding"] * visual +
            self.WEIGHTS["image_hash"] * hash_sim +
            self.WEIGHTS["crop_similarity"] * crop_sim +
            self.WEIGHTS["provider_confidence"] * provider_conf +
            self.WEIGHTS["duplicate_evidence"] * dup_ev
        )
        
        return {
            "visual_similarity": round(visual, 4),
            "image_hash_similarity": round(hash_sim, 4),
            "face_region_similarity": round(crop_sim, 4),
            "final_score": round(min(1.0, max(0.0, final)), 4),
        }
    
    def _visual_similarity(self, emb1: Optional[List[float]], emb2: Optional[List[float]]) -> float:
        if not emb1 or not emb2:
            return 0.0
        dot = sum(a * b for a, b in zip(emb1, emb2))
        norm1 = sum(a * a for a in emb1) ** 0.5
        norm2 = sum(b * b for b in emb2) ** 0.5
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return max(0.0, min(1.0, dot / (norm1 * norm2)))
    
    def _hash_similarity(self, hash1: Optional[str], hash2: Optional[str]) -> float:
        if not hash1 or not hash2:
            return 0.0
        if len(hash1) != len(hash2):
            return 0.0
        matches = sum(c1 == c2 for c1, c2 in zip(hash1, hash2))
        return matches / len(hash1)
    
    def _crop_similarity(self, crop1: Optional[List[float]], crop2: Optional[List[float]]) -> float:
        return self._visual_similarity(crop1, crop2)
    
    def categorize_result(self, score: float) -> str:
        if score >= 0.90:
            return "very_similar"
        elif score >= 0.75:
            return "similar"
        elif score >= 0.50:
            return "possible"
        return "low"

similarity_engine = SimilarityEngine()
