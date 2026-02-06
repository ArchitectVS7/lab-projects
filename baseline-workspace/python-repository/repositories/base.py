"""Base repository interface."""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar, List, Optional

T = TypeVar("T")


class BaseRepository(ABC, Generic[T]):
    """
    Abstract base repository defining standard CRUD operations.
    
    All repositories should inherit from this and implement
    these methods for their specific entity type.
    """

    @abstractmethod
    def find_by_id(self, id: str) -> Optional[T]:
        """Find entity by ID, or None if not found."""
        pass

    @abstractmethod
    def find_all(self) -> List[T]:
        """Find all entities."""
        pass

    @abstractmethod
    def save(self, entity: T) -> T:
        """Save (insert or update) an entity."""
        pass

    @abstractmethod
    def delete(self, id: str) -> bool:
        """Delete entity by ID. Returns True if deleted, False if not found."""
        pass

    @abstractmethod
    def exists(self, id: str) -> bool:
        """Check if entity exists by ID."""
        pass
