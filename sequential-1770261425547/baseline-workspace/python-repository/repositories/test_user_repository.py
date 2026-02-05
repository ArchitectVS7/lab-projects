"""Tests for UserRepository."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from models import Base, User
from repositories import UserRepository


# Use SQLite in-memory for tests (fast, no setup)
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture
def session() -> Session:
    """Create a fresh database session for each test."""
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    yield session
    
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def repo(session: Session) -> UserRepository:
    """Create UserRepository with test session."""
    return UserRepository(session)


@pytest.fixture
def sample_user() -> User:
    """Create a sample user (not saved)."""
    return User(
        email="alice@example.com",
        password_hash="hashed_password",
        name="Alice Smith",
        is_active=True,
    )


# =============================================================================
# Basic CRUD Tests
# =============================================================================

class TestSave:
    def test_save_generates_id(self, repo: UserRepository, sample_user: User):
        """Should generate UUID if no ID provided."""
        assert sample_user.id is None
        saved = repo.save(sample_user)
        assert saved.id is not None
        assert len(saved.id) == 36  # UUID format

    def test_save_preserves_existing_id(self, repo: UserRepository):
        """Should keep existing ID if provided."""
        user = User(id="custom-id", email="test@example.com", password_hash="hash")
        saved = repo.save(user)
        assert saved.id == "custom-id"

    def test_save_persists_to_database(self, repo: UserRepository, sample_user: User, session: Session):
        """Should persist user to database."""
        saved = repo.save(sample_user)
        session.commit()
        
        found = repo.find_by_id(saved.id)
        assert found is not None
        assert found.email == "alice@example.com"


class TestFindById:
    def test_find_existing_user(self, repo: UserRepository, sample_user: User, session: Session):
        """Should find user by ID."""
        saved = repo.save(sample_user)
        session.commit()
        
        found = repo.find_by_id(saved.id)
        assert found is not None
        assert found.email == sample_user.email

    def test_find_nonexistent_returns_none(self, repo: UserRepository):
        """Should return None for non-existent ID."""
        found = repo.find_by_id("nonexistent-id")
        assert found is None


class TestDelete:
    def test_delete_existing_user(self, repo: UserRepository, sample_user: User, session: Session):
        """Should delete user and return True."""
        saved = repo.save(sample_user)
        session.commit()
        
        result = repo.delete(saved.id)
        session.commit()
        
        assert result is True
        assert repo.find_by_id(saved.id) is None

    def test_delete_nonexistent_returns_false(self, repo: UserRepository):
        """Should return False for non-existent ID."""
        result = repo.delete("nonexistent-id")
        assert result is False


class TestExists:
    def test_exists_returns_true(self, repo: UserRepository, sample_user: User, session: Session):
        """Should return True for existing user."""
        saved = repo.save(sample_user)
        session.commit()
        
        assert repo.exists(saved.id) is True

    def test_exists_returns_false(self, repo: UserRepository):
        """Should return False for non-existent user."""
        assert repo.exists("nonexistent-id") is False


# =============================================================================
# User-specific Query Tests
# =============================================================================

class TestFindByEmail:
    def test_finds_by_exact_email(self, repo: UserRepository, sample_user: User, session: Session):
        """Should find user by exact email."""
        repo.save(sample_user)
        session.commit()
        
        found = repo.find_by_email("alice@example.com")
        assert found is not None
        assert found.name == "Alice Smith"

    def test_finds_case_insensitive(self, repo: UserRepository, sample_user: User, session: Session):
        """Should find user regardless of email case."""
        repo.save(sample_user)
        session.commit()
        
        found = repo.find_by_email("ALICE@EXAMPLE.COM")
        assert found is not None

    def test_returns_none_when_not_found(self, repo: UserRepository):
        """Should return None for non-existent email."""
        found = repo.find_by_email("nobody@example.com")
        assert found is None


class TestEmailExists:
    def test_returns_true_when_exists(self, repo: UserRepository, sample_user: User, session: Session):
        """Should return True when email exists."""
        repo.save(sample_user)
        session.commit()
        
        assert repo.email_exists("alice@example.com") is True

    def test_returns_false_when_not_exists(self, repo: UserRepository):
        """Should return False when email doesn't exist."""
        assert repo.email_exists("nobody@example.com") is False

    def test_excludes_specified_user(self, repo: UserRepository, sample_user: User, session: Session):
        """Should exclude user when checking (for updates)."""
        saved = repo.save(sample_user)
        session.commit()
        
        # Same email should return False when excluding the user
        assert repo.email_exists("alice@example.com", exclude_id=saved.id) is False


class TestFindActive:
    def test_finds_only_active_users(self, repo: UserRepository, session: Session):
        """Should only return active users."""
        active = User(email="active@example.com", password_hash="hash", is_active=True)
        inactive = User(email="inactive@example.com", password_hash="hash", is_active=False)
        
        repo.save(active)
        repo.save(inactive)
        session.commit()
        
        result = repo.find_active()
        assert len(result) == 1
        assert result[0].email == "active@example.com"


# =============================================================================
# Pagination Tests
# =============================================================================

class TestPagination:
    def test_returns_correct_page(self, repo: UserRepository, session: Session):
        """Should return correct page of results."""
        # Create 5 users
        for i in range(5):
            repo.save(User(email=f"user{i}@example.com", password_hash="hash"))
        session.commit()
        
        result = repo.find_paginated(page=1, per_page=2)
        
        assert len(result["items"]) == 2
        assert result["total"] == 5
        assert result["page"] == 1
        assert result["per_page"] == 2
        assert result["pages"] == 3

    def test_returns_last_page(self, repo: UserRepository, session: Session):
        """Should return partial last page."""
        for i in range(5):
            repo.save(User(email=f"user{i}@example.com", password_hash="hash"))
        session.commit()
        
        result = repo.find_paginated(page=3, per_page=2)
        
        assert len(result["items"]) == 1  # Only 1 item on last page


# =============================================================================
# Bulk Operation Tests
# =============================================================================

class TestDeactivate:
    def test_deactivates_user(self, repo: UserRepository, sample_user: User, session: Session):
        """Should set is_active to False."""
        saved = repo.save(sample_user)
        session.commit()
        
        result = repo.deactivate(saved.id)
        session.commit()
        
        assert result is True
        assert repo.find_by_id(saved.id).is_active is False

    def test_deactivate_nonexistent_returns_false(self, repo: UserRepository):
        """Should return False for non-existent user."""
        result = repo.deactivate("nonexistent-id")
        assert result is False


class TestFindByDomain:
    def test_finds_users_by_domain(self, repo: UserRepository, session: Session):
        """Should find all users with matching email domain."""
        repo.save(User(email="alice@company.com", password_hash="hash"))
        repo.save(User(email="bob@company.com", password_hash="hash"))
        repo.save(User(email="charlie@gmail.com", password_hash="hash"))
        session.commit()
        
        result = repo.find_by_domain("company.com")
        
        assert len(result) == 2
        assert all("@company.com" in u.email for u in result)

    def test_case_insensitive(self, repo: UserRepository, session: Session):
        """Should match domain case-insensitively."""
        repo.save(User(email="alice@Company.COM", password_hash="hash"))
        session.commit()
        
        result = repo.find_by_domain("company.com")
        assert len(result) == 1

    def test_handles_at_prefix(self, repo: UserRepository, session: Session):
        """Should handle domain with @ prefix."""
        repo.save(User(email="alice@company.com", password_hash="hash"))
        session.commit()
        
        result = repo.find_by_domain("@company.com")
        assert len(result) == 1

    def test_active_only_filter(self, repo: UserRepository, session: Session):
        """Should filter to active users only when requested."""
        repo.save(User(email="active@company.com", password_hash="hash", is_active=True))
        repo.save(User(email="inactive@company.com", password_hash="hash", is_active=False))
        session.commit()
        
        result = repo.find_by_domain("company.com", active_only=True)
        
        assert len(result) == 1
        assert result[0].email == "active@company.com"

    def test_returns_empty_for_no_matches(self, repo: UserRepository):
        """Should return empty list when no matches."""
        result = repo.find_by_domain("nonexistent.com")
        assert result == []


class TestCount:
    def test_counts_all_users(self, repo: UserRepository, session: Session):
        """Should count all users."""
        for i in range(3):
            repo.save(User(email=f"user{i}@example.com", password_hash="hash"))
        session.commit()
        
        assert repo.count() == 3

    def test_counts_active_users(self, repo: UserRepository, session: Session):
        """Should count only active users."""
        repo.save(User(email="active@example.com", password_hash="hash", is_active=True))
        repo.save(User(email="inactive@example.com", password_hash="hash", is_active=False))
        session.commit()
        
        assert repo.count_active() == 1
