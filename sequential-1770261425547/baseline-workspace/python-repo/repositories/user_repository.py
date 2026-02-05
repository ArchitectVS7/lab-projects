"""User repository with domain-specific queries."""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from dataclasses import dataclass
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from .base import BaseRepository
from models.user import User, UserStatus


@dataclass
class PaginatedResult:
    """Paginated query result."""
    items: List[User]
    total: int
    page: int
    limit: int
    pages: int


class UserRepository(BaseRepository[User]):
    """Repository for User entity with domain-specific queries."""

    def __init__(self, session: Session):
        super().__init__(session, User)

    # ============ Find Single ============

    def find_by_email(self, email: str) -> Optional[User]:
        """Find user by email (case-insensitive)."""
        return (
            self.session.query(User)
            .filter(func.lower(User.email) == email.lower())
            .first()
        )

    def find_by_username(self, username: str) -> Optional[User]:
        """Find user by username (case-insensitive)."""
        return (
            self.session.query(User)
            .filter(func.lower(User.username) == username.lower())
            .first()
        )

    def find_by_email_or_username(self, identifier: str) -> Optional[User]:
        """Find user by email or username (for login)."""
        identifier_lower = identifier.lower()
        return (
            self.session.query(User)
            .filter(
                or_(
                    func.lower(User.email) == identifier_lower,
                    func.lower(User.username) == identifier_lower,
                )
            )
            .first()
        )

    # ============ Find Multiple ============

    def find_by_status(self, status: UserStatus) -> List[User]:
        """Find all users with given status."""
        return self.session.query(User).filter(User.status == status).all()

    def find_active(self) -> List[User]:
        """Find all active users."""
        return self.find_by_status(UserStatus.ACTIVE)

    def find_inactive_since(self, days: int) -> List[User]:
        """Find active users who haven't logged in for N days."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return (
            self.session.query(User)
            .filter(
                User.status == UserStatus.ACTIVE,
                or_(User.last_login < cutoff, User.last_login.is_(None)),
            )
            .all()
        )

    def find_unverified(self) -> List[User]:
        """Find users who haven't verified their email."""
        return self.session.query(User).filter(User.verified == False).all()

    def find_recently_created(self, days: int = 7) -> List[User]:
        """Find users created in the last N days."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return (
            self.session.query(User)
            .filter(User.created_at >= cutoff)
            .order_by(User.created_at.desc())
            .all()
        )

    def find_by_email_domain(self, domain: str) -> List[User]:
        """Find all users with emails from a specific domain.
        
        Args:
            domain: Email domain (e.g., "company.com" or "@company.com")
            
        Returns:
            List of users with matching email domain
        """
        # Normalize: ensure domain starts with @
        if not domain.startswith("@"):
            domain = f"@{domain}"
        
        return (
            self.session.query(User)
            .filter(func.lower(User.email).endswith(domain.lower()))
            .order_by(User.email)
            .all()
        )

    # ============ Search & Pagination ============

    def search(
        self,
        query: str,
        page: int = 1,
        limit: int = 20,
        status: Optional[UserStatus] = None,
    ) -> PaginatedResult:
        """Search users by name, email, or username with pagination."""
        search_term = f"%{query.lower()}%"

        q = self.session.query(User).filter(
            or_(
                func.lower(User.name).like(search_term),
                func.lower(User.email).like(search_term),
                func.lower(User.username).like(search_term),
            )
        )

        if status:
            q = q.filter(User.status == status)

        total = q.count()
        offset = (page - 1) * limit
        items = q.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

        return PaginatedResult(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=(total + limit - 1) // limit,
        )

    def find_paginated(
        self,
        page: int = 1,
        limit: int = 20,
        status: Optional[UserStatus] = None,
    ) -> PaginatedResult:
        """Get paginated list of users."""
        q = self.session.query(User)

        if status:
            q = q.filter(User.status == status)

        total = q.count()
        offset = (page - 1) * limit
        items = q.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

        return PaginatedResult(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=(total + limit - 1) // limit,
        )

    # ============ Existence Checks ============

    def exists_by_email(self, email: str) -> bool:
        """Check if email is already registered."""
        return (
            self.session.query(
                self.session.query(User)
                .filter(func.lower(User.email) == email.lower())
                .exists()
            ).scalar()
        )

    def exists_by_username(self, username: str) -> bool:
        """Check if username is taken."""
        return (
            self.session.query(
                self.session.query(User)
                .filter(func.lower(User.username) == username.lower())
                .exists()
            ).scalar()
        )

    # ============ Counts ============

    def count_by_status(self, status: UserStatus) -> int:
        """Count users by status."""
        return self.session.query(User).filter(User.status == status).count()

    def count_active(self) -> int:
        """Count active users."""
        return self.count_by_status(UserStatus.ACTIVE)

    def count_by_email_domain(self, domain: str) -> int:
        """Count users with emails from a specific domain."""
        if not domain.startswith("@"):
            domain = f"@{domain}"
        
        return (
            self.session.query(User)
            .filter(func.lower(User.email).endswith(domain.lower()))
            .count()
        )

    # ============ Bulk Operations ============

    def update_status_many(self, ids: List[UUID], status: UserStatus) -> int:
        """Update status for multiple users. Returns count updated."""
        count = (
            self.session.query(User)
            .filter(User.id.in_(ids))
            .update({User.status: status}, synchronize_session=False)
        )
        self.session.commit()
        return count

    def delete_many(self, ids: List[UUID]) -> int:
        """Delete multiple users. Returns count deleted."""
        count = (
            self.session.query(User)
            .filter(User.id.in_(ids))
            .delete(synchronize_session=False)
        )
        self.session.commit()
        return count

    # ============ Domain Operations ============

    def record_login(self, user_id: UUID) -> Optional[User]:
        """Update last_login timestamp."""
        return self.update(user_id, last_login=datetime.now(timezone.utc))

    def verify_user(self, user_id: UUID) -> Optional[User]:
        """Mark user as verified."""
        return self.update(user_id, verified=True)

    def suspend_user(self, user_id: UUID) -> Optional[User]:
        """Suspend a user account."""
        return self.update(user_id, status=UserStatus.SUSPENDED)

    def activate_user(self, user_id: UUID) -> Optional[User]:
        """Activate a user account."""
        return self.update(user_id, status=UserStatus.ACTIVE)
