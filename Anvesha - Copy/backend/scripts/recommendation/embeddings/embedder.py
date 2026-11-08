"""
Sentence Transformer Embedding Generator for Recommendation Model.
Uses `all-MiniLM-L6-v2` (384-dimensional embeddings).
Falls back to TF-IDF vectorization if sentence-transformers is not available.
"""
from __future__ import annotations

import logging
import threading
import numpy as np

from scripts.recommendation.config import settings

logger = logging.getLogger("anvesha.recommendation.embeddings")

_lock = threading.Lock()
_singleton: "Embedder | None" = None


class Embedder:
    def __init__(self, backend: str = "auto"):
        self.backend_name = backend
        self._st_model = None
        self._hashing_vectorizer = None
        self._svd = None
        self._fitted = False

        if backend in ("auto", "st"):
            try:
                from sentence_transformers import SentenceTransformer  # type: ignore

                self._st_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
                self.backend_name = "st"
                self.dimensions = self._st_model.get_sentence_embedding_dimension()
                logger.info(
                    "Embedder using sentence-transformers (%s, dim=%d).",
                    settings.EMBEDDING_MODEL_NAME,
                    self.dimensions,
                )
                return
            except Exception as exc:
                if backend == "st":
                    raise
                logger.warning("sentence-transformers unavailable (%s); using TF-IDF fallback.", exc)

        from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore

        self._hashing_vectorizer = TfidfVectorizer(max_features=4096, ngram_range=(1, 2))
        self.backend_name = "hashing"
        self.dimensions = 256
        logger.info("Embedder using offline TF-IDF/SVD fallback (dim=%d).", self.dimensions)

    def _fit_hashing(self, corpus: list[str]) -> None:
        from sklearn.decomposition import TruncatedSVD  # type: ignore

        matrix = self._hashing_vectorizer.fit_transform(corpus)
        n_components = min(self.dimensions, max(2, matrix.shape[1] - 1), max(2, matrix.shape[0] - 1))
        self._svd = TruncatedSVD(n_components=n_components, random_state=42)
        self._svd.fit(matrix)
        self._fitted = True

    def fit(self, corpus: list[str]) -> None:
        if self.backend_name == "hashing" and corpus:
            self._fit_hashing(corpus)

    def encode(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dimensions), dtype=np.float32)

        if self.backend_name == "st":
            vectors = self._st_model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return np.asarray(vectors, dtype=np.float32)

        if not self._fitted:
            self._fit_hashing(texts)
        tfidf = self._hashing_vectorizer.transform(texts)
        reduced = self._svd.transform(tfidf)
        norms = np.linalg.norm(reduced, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return (reduced / norms).astype(np.float32)


def get_embedder() -> Embedder:
    """Process-wide singleton to avoid reloading model on every request."""
    global _singleton
    with _lock:
        if _singleton is None:
            _singleton = Embedder(settings.EMBEDDING_BACKEND)
        return _singleton
