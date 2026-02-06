"""User repository implementation."""

from typing import List, Optional
from uuid import uuid4
from sqlalchemy import select, func, delete as sql_delete
from sqlalchemy.orm import Session

from .base import BaseRepository
from models.user import User


class UserRepository(BaseRepository[User]):
    """
    Repository for User entity.
    
    Handles all database operations for users.
    Business logic should use this instead of direct SQLAlchemy queries.
    """

    def __init__(self, session: Session):
        self.session = session

    # =========================================================================
    # Base CRUD operations
    # =========================================================================

    def find_by_id(self, id: str) -> Optional[User]:
        """Find user by ID."""
        return self.session.get(User, id)

    def find_all(self) -> List[User]:
        """Find all users."""
        stmt = select(User).order_by(User.created_at.desc())
        return list(self.session.scalars(stmt))

    def save(self, user: User) -> User:
        """
        Save user (insert or update).
        
        If user has no ID, generates one and inserts.
        If user has ID, merges (updates if exists, inserts if not).
        """
        if not user.id:
            user.id = str(uuid4())
        
        self.session.add(user)
        self.session.flush()  # Get ID without committing
        return user

    def delete(self, id: str) -> bool:
        """Delete user by ID."""
        user = self.find_by_id(id)
        if user:
            self.session.delete(user)
            self.session.flush()
            return True
        return False

    def exists(self, id: str) -> bool:
        """Check if user exists by ID."""
        stmt = select(func.count()).select_from(User).where(User.id == id)
        return self.session.scalar(stmt) > 0

    # =========================================================================
    # User-specific queries
    # =========================================================================

    def find_by_email(self, email: str) -> Optional[User]:
        """Find user by email (case-insensitive)."""
        stmt = select(User).where(func.lower(User.email) == email.lower())
        return self.session.scalar(stmt)

    def find_by_emails(self, emails: List[str]) -> List[User]:
        """Find multiple users by email addresses."""
        lower_emails = [e.lower() for e in emails]
        stmt = select(User).where(func.lower(User.email).in_(lower_emails))
        return list(self.session.scalars(stmt))

    def find_active(self) -> List[User]:
        """Find all active users."""
        stmt = select(User).where(User.is_active == True).order_by(User.created_at.desc())
        return list(self.session.scalars(stmt))

    def find_inactive(self) -> List[User]:
        """Find all inactive users."""
        stmt = select(User).where(User.is_active == False).order_by(User.created_at.desc())
        return list(self.session.scalars(stmt))

    def email_exists(self, email: str, exclude_id: Optional[str] = None) -> bool:
        """
        Check if email is already taken.
        
        Args:
            email: Email to check
            exclude_id: User ID to exclude (for update scenarios)
        """
        stmt = select(func.count()).select_from(User).where(
            func.lower(User.email) == email.lower()
        )
        if exclude_id:
            stmt = stmt.where(User.id != exclude_id)
        return self.session.scalar(stmt) > 0

    # =========================================================================
    # Pagination
    # =========================================================================

    def find_paginated(
        self, 
        page: int = 1, 
        per_page: int = 20,
        active_only: bool = False
    ) -> dict:
        """
        Find users with pagination.
        
        Returns:
            dict with 'items', 'total', 'page', 'per_page', 'pages'
        """
        # Base query
        base_stmt = select(User)
        count_stmt = select(func.count()).select_from(User)
        
        if active_only:
            base_stmt = base_stmt.where(User.is_active == True)
            count_stmt = count_stmt.where(User.is_active == True)
        
        # Get total count
        total = self.session.scalar(count_stmt)
        
        # Get page of items
        offset = (page - 1) * per_page
        stmt = base_stmt.order_by(User.created_at.desc()).offset(offset).limit(per_page)
        items = list(self.session.scalars(stmt))
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0,
        }

    def search_by_name(self, query: str, limit: int = 10) -> List[User]:
        """Search users by name (partial match)."""
        stmt = (
            select(User)
            .where(User.name.ilike(f"%{query}%"))
            .order_by(User.name)
            .limit(limit)
        )
        return list(self.session.scalars(stmt))

    def find_by_domain(self, domain: str, active_only: bool = False) -> List[User]:
        """
        Find all users with emails from a specific domain.
        
        Args:
            domain: Email domain (e.g., "company.com")
            active_only: If True, only return active users
            
        Returns:
            List of users with matching email domain
            
        Example:
            users = repo.find_by_domain("company.com")
            users = repo.find_by_domain("gmail.com", active_only=True)
        """
        # Normalize domain (remove @ if provided)
        domain = domain.lower().lstrip("@")
        
        stmt = select(User).where(
            func.lower(User.email).like(f"%@{domain}")
        )
        
        if active_only:
            stmt = stmt.where(User.is_active == True)
        
        stmt = stmt.order_by(User.email)
        return list(self.session.scalars(stmt))

    # =========================================================================
    # Bulk operations
    # =========================================================================

    def save_many(self, users: List[User]) -> List[User]:
        """Save multiple users."""
        for user in users:
            if not user.id:
                user.id = str(uuid4())
            self.session.add(user)
        self.session.flush()
        return users

    def delete_inactive(self) -> int:
        """Delete all inactive users. Returns count deleted."""
        stmt = sql_delete(User).where(User.is_active == False)
        result = self.session.execute(stmt)
        self.session.flush()
        return result.rowcount

    def deactivate(self, id: str) -> bool:
        """Soft-delete: mark user as inactive."""
        user = self.find_by_id(id)
        if user:
            user.is_active = False
            self.session.flush()
            return True
        return False

    def activate(self, id: str) -> bool:
        """Reactivate an inactive user."""
        user = self.find_by_id(id)
        if user:
            user.is_active = True
            self.session.flush()
            return True
        return False

    # =========================================================================
    # Aggregations
    # =========================================================================

    def count(self) -> int:
        """Count all users."""
        stmt = select(func.count()).select_from(User)
        return self.session.scalar(stmt)

    def count_active(self) -> int:
        """Count active users."""
        stmt = select(func.count()).select_from(User).where(User.is_active == True)
        return self.session.scalar(stmt)
