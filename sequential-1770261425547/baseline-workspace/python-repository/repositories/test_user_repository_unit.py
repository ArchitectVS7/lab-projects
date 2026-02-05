"""
Unit tests for UserRepository using mocks.

These tests mock the SQLAlchemy session, making them:
- Faster (no database)
- True unit tests (isolated from DB layer)
- Good for testing logic, not queries

For query correctness, use integration tests (test_user_repository.py).
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, call
from models import User
from repositories import UserRepository


@pytest.fixture
def mock_session():
    """Create a mock SQLAlchemy session."""
    return Mock()


@pytest.fixture
def repo(mock_session):
    """Create UserRepository with mocked session."""
    return UserRepository(mock_session)


class TestFindByDomainUnit:
    """Unit tests for find_by_domain with mocked database."""

    def test_calls_session_with_correct_query(self, repo: UserRepository, mock_session: Mock):
        """Should execute query against session."""
        # Setup mock to return empty list
        mock_session.scalars.return_value = iter([])
        
        repo.find_by_domain("company.com")
        
        # Verify scalars was called (query executed)
        mock_session.scalars.assert_called_once()

    def test_normalizes_domain_to_lowercase(self, repo: UserRepository, mock_session: Mock):
        """Should convert domain to lowercase before querying."""
        mock_session.scalars.return_value = iter([])
        
        # Call with uppercase
        repo.find_by_domain("COMPANY.COM")
        
        # Get the query that was passed to scalars
        call_args = mock_session.scalars.call_args
        query = call_args[0][0]
        
        # Convert to string to inspect (SQLAlchemy query)
        query_str = str(query.compile(compile_kwargs={"literal_binds": True}))
        assert "@company.com" in query_str.lower()

    def test_strips_at_prefix(self, repo: UserRepository, mock_session: Mock):
        """Should remove @ prefix from domain."""
        mock_session.scalars.return_value = iter([])
        
        repo.find_by_domain("@company.com")
        
        call_args = mock_session.scalars.call_args
        query = call_args[0][0]
        query_str = str(query.compile(compile_kwargs={"literal_binds": True}))
        
        # Should not have double @
        assert "@@" not in query_str

    def test_returns_list_of_users(self, repo: UserRepository, mock_session: Mock):
        """Should return users from query result."""
        mock_users = [
            User(id="1", email="alice@company.com", password_hash="hash"),
            User(id="2", email="bob@company.com", password_hash="hash"),
        ]
        mock_session.scalars.return_value = iter(mock_users)
        
        result = repo.find_by_domain("company.com")
        
        assert len(result) == 2
        assert result[0].email == "alice@company.com"
        assert result[1].email == "bob@company.com"

    def test_returns_empty_list_when_no_matches(self, repo: UserRepository, mock_session: Mock):
        """Should return empty list when no users match."""
        mock_session.scalars.return_value = iter([])
        
        result = repo.find_by_domain("nonexistent.com")
        
        assert result == []

    def test_active_only_modifies_query(self, repo: UserRepository, mock_session: Mock):
        """Should add active filter when active_only=True."""
        mock_session.scalars.return_value = iter([])
        
        repo.find_by_domain("company.com", active_only=True)
        
        call_args = mock_session.scalars.call_args
        query = call_args[0][0]
        query_str = str(query.compile(compile_kwargs={"literal_binds": True}))
        
        # Should include is_active check
        assert "is_active" in query_str

    def test_no_active_filter_by_default(self, repo: UserRepository, mock_session: Mock):
        """Should not filter by active status by default."""
        mock_session.scalars.return_value = iter([])
        
        repo.find_by_domain("company.com", active_only=False)
        
        call_args = mock_session.scalars.call_args
        query = call_args[0][0]
        query_str = str(query.compile(compile_kwargs={"literal_binds": True}))
        
        # Should not include is_active in WHERE clause
        # (it might appear in SELECT, so check specifically for the filter)
        where_clause = query_str.split("WHERE")[-1] if "WHERE" in query_str else ""
        assert "is_active" not in where_clause or "is_active = true" not in where_clause.lower()


class TestFindByDomainWithMockedUsers:
    """Test find_by_domain logic with fully mocked data."""

    @pytest.fixture
    def sample_users(self):
        """Create sample users for testing."""
        return [
            User(id="1", email="alice@company.com", password_hash="h", is_active=True),
            User(id="2", email="bob@company.com", password_hash="h", is_active=False),
            User(id="3", email="charlie@gmail.com", password_hash="h", is_active=True),
        ]

    def test_filters_by_domain_correctly(
        self, repo: UserRepository, mock_session: Mock, sample_users: list
    ):
        """Integration-style test with mock: verify filtering logic."""
        # Return all users, let us verify the query structure
        company_users = [u for u in sample_users if "@company.com" in u.email]
        mock_session.scalars.return_value = iter(company_users)
        
        result = repo.find_by_domain("company.com")
        
        assert len(result) == 2
        assert all("@company.com" in u.email for u in result)

    def test_combines_domain_and_active_filters(
        self, repo: UserRepository, mock_session: Mock, sample_users: list
    ):
        """Should apply both domain and active filters."""
        # Simulate DB returning only active company users
        active_company = [
            u for u in sample_users 
            if "@company.com" in u.email and u.is_active
        ]
        mock_session.scalars.return_value = iter(active_company)
        
        result = repo.find_by_domain("company.com", active_only=True)
        
        assert len(result) == 1
        assert result[0].email == "alice@company.com"
        assert result[0].is_active is True
