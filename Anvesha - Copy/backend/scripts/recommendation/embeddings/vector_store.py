"""
In-memory vector similarity store for calculating cosine similarity.
"""
from __future__ import annotations

import numpy as np


class InMemoryVectorStore:
    def __init__(self, ids: list[str], vectors: np.ndarray):
        assert len(ids) == vectors.shape[0]
        self.ids = ids
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self.vectors = vectors / norms

    def search(self, query_vector: np.ndarray, top_k: int | None = None) -> list[tuple[str, float]]:
        if self.vectors.shape[0] == 0:
            return []
        qnorm = np.linalg.norm(query_vector)
        q = query_vector / qnorm if qnorm > 0 else query_vector
        sims = self.vectors @ q
        order = np.argsort(-sims)
        if top_k is not None:
            order = order[:top_k]
        return [(self.ids[i], float(sims[i])) for i in order]

    def similarity_map(self, query_vector: np.ndarray) -> dict[str, float]:
        return dict(self.search(query_vector, top_k=None))
