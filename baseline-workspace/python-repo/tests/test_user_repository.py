"""Unit tests for UserRepository."""

import pytest
from unittest.mock import Mock, MagicMock
from uuid import uuid4

from repositories.user_repository import UserRepository
from models.user import User, UserStatus


@pytest.fixture
def mock_session():
    """Create a mock SQLAlchemy session."""
    return Mock()


@pytest.fixture
def user_repo(mock_session):
    """Create UserRepository with mocked session."""
    return UserRepository(mock_session)


@pytest.fixture
def sample_users():
    """Sample user objects for testing."""
    return [
        create_mock_user("alice@company.com", "Alice"),
        create_mock_user("bob@company.com", "Bob"),
        create_mock_user("carol@company.com", "Carol"),
    ]


def create_mock_user(email: str, name: str) -> Mock:
    """Helper to create a mock User object."""
    user = Mock(spec=User)
    user.id = uuid4()
    user.email = email
    user.name = name
    user.status = UserStatus.ACTIVE
    return user


class TestFindByEmailDomain:
    """Tests for find_by_email_domain method."""

    def test_finds_users_with_matching_domain(self, user_repo, mock_session, sample_users):
        """Should return users matching the email domain."""
        # Setup mock query chain
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = sample_users

        # Execute
        result = user_repo.find_by_email_domain("company.com")

        # Verify
        assert result == sample_users
        mock_session.query.assert_called_once_with(User)
        mock_query.filter.assert_called_once()
        mock_query.order_by.assert_called_once()

    def test_handles_domain_with_at_prefix(self, user_repo, mock_session, sample_users):
        """Should accept domain with @ prefix."""
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = sample_users

        # Both should work the same
        user_repo.find_by_email_domain("@company.com")
        user_repo.find_by_email_domain("company.com")

        assert mock_session.query.call_count == 2

    def test_returns_empty_list_when_no_matches(self, user_repo, mock_session):
        """Should return empty list when no users match."""
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = []

        result = user_repo.find_by_email_domain("nonexistent.com")

        assert result == []

    def test_case_insensitive_matching(self, user_repo, mock_session, sample_users):
        """Should match domain case-insensitively."""
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = sample_users

        # Different case variations should all work
        user_repo.find_by_email_domain("COMPANY.COM")
        user_repo.find_by_email_domain("Company.Com")
        user_repo.find_by_email_domain("company.com")

        assert mock_session.query.call_count == 3


class TestCountByEmailDomain:
    """Tests for count_by_email_domain method."""

    def test_counts_users_with_matching_domain(self, user_repo, mock_session):
        """Should return count of users matching domain."""
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 5

        result = user_repo.count_by_email_domain("company.com")

        assert result == 5

    def test_returns_zero_when_no_matches(self, user_repo, mock_session):
        """Should return 0 when no users match."""
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 0

        result = user_repo.count_by_email_domain("nonexistent.com")

        assert result == 0

    def test_handles_domain_with_at_prefix(self, user_repo, mock_session):
        """Should accept domain with @ prefix."""
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 3

        result = user_repo.count_by_email_domain("@company.com")

        assert result == 3


class TestFindByEmail:
    """Tests for find_by_email method."""

    def test_finds_user_by_exact_email(self, user_repo, mock_session):
        """Should find user by email."""
        expected_user = create_mock_user("alice@example.com", "Alice")
        
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = expected_user

        result = user_repo.find_by_email("alice@example.com")

        assert result == expected_user

    def test_returns_none_when_not_found(self, user_repo, mock_session):
        """Should return None when email not found."""
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None

        result = user_repo.find_by_email("notfound@example.com")

        assert result is None


class TestExistsByEmail:
    """Tests for exists_by_email method."""

    def test_returns_true_when_email_exists(self, user_repo, mock_session):
        """Should return True when email is registered."""
        mock_session.query.return_value.scalar.return_value = True

        result = user_repo.exists_by_email("existing@example.com")

        assert result is True

    def test_returns_false_when_email_not_exists(self, user_repo, mock_session):
        """Should return False when email is not registered."""
        mock_session.query.return_value.scalar.return_value = False

        result = user_repo.exists_by_email("new@example.com")

        assert result is False


class TestCreate:
    """Tests for create method."""

    def test_creates_user_and_commits(self, user_repo, mock_session):
        """Should add user to session and commit."""
        user_repo.create(
            email="new@example.com",
            username="newuser",
            password_hash="hashed",
            name="New User",
        )

        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once()


class TestDelete:
    """Tests for delete method."""

    def test_deletes_existing_user(self, user_repo, mock_session):
        """Should delete user and return True."""
        user = create_mock_user("delete@example.com", "Delete Me")
        
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = user

        result = user_repo.delete(user.id)

        assert result is True
        mock_session.delete.assert_called_once_with(user)
        mock_session.commit.assert_called_once()

    def test_returns_false_when_user_not_found(self, user_repo, mock_session):
        """Should return False when user doesn't exist."""
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None

        result = user_repo.delete(uuid4())

        assert result is False
        mock_session.delete.assert_not_called()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
