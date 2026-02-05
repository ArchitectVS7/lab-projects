"""Base repository with common CRUD operations."""

from typing import TypeVar, Generic, Type, List, Optional
from sqlalchemy.orm import Session
from uuid import UUID

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """Base repository providing common CRUD operations."""

    def __init__(self, session: Session, model: Type[T]):
        self.session = session
        self.model = model

    def find_by_id(self, id: UUID) -> Optional[T]:
        """Find entity by ID."""
        return self.session.query(self.model).filter(self.model.id == id).first()

    def find_all(self) -> List[T]:
        """Find all entities."""
        return self.session.query(self.model).all()

    def create(self, **kwargs) -> T:
        """Create a new entity."""
        entity = self.model(**kwargs)
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity

    def update(self, id: UUID, **kwargs) -> Optional[T]:
        """Update an entity by ID."""
        entity = self.find_by_id(id)
        if not entity:
            return None

        for key, value in kwargs.items():
            if hasattr(entity, key):
                setattr(entity, key, value)

        self.session.commit()
        self.session.refresh(entity)
        return entity

    def delete(self, id: UUID) -> bool:
        """Delete an entity by ID. Returns True if deleted."""
        entity = self.find_by_id(id)
        if not entity:
            return False

        self.session.delete(entity)
        self.session.commit()
        return True

    def exists(self, id: UUID) -> bool:
        """Check if entity exists."""
        return self.session.query(
            self.session.query(self.model).filter(self.model.id == id).exists()
        ).scalar()

    def count(self) -> int:
        """Count all entities."""
        return self.session.query(self.model).count()
