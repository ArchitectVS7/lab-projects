"""
Comprehensive tests for user processing utilities.

Run with: pytest test_users.py -v
"""

import pytest
from users import process_users, get_user_by_email, calculate_total


# =============================================================================
# Tests for process_users()
# =============================================================================

class TestProcessUsersBasicFunctionality:
    """Test basic filtering and processing behavior."""

    def test_filters_only_active_users(self):
        """Should return only users with status='active'."""
        users = [
            {'id': 1, 'status': 'active'},
            {'id': 2, 'status': 'inactive'},
            {'id': 3, 'status': 'active'},
            {'id': 4, 'status': 'pending'},
        ]
        result = process_users(users)
        assert len(result) == 2
        assert all(u['id'] in [1, 3] for u in result)

    def test_adds_processed_flag(self):
        """Should add processed=True to each returned user."""
        users = [{'id': 1, 'status': 'active'}]
        result = process_users(users)
        assert result[0]['processed'] is True

    def test_preserves_all_original_fields(self):
        """Should keep all original user fields in the result."""
        users = [{'id': 1, 'name': 'Alice', 'email': 'a@b.com', 'status': 'active'}]
        result = process_users(users)
        assert result[0]['id'] == 1
        assert result[0]['name'] == 'Alice'
        assert result[0]['email'] == 'a@b.com'
        assert result[0]['status'] == 'active'

    def test_maintains_order(self):
        """Should maintain the original order of users."""
        users = [
            {'id': 3, 'status': 'active'},
            {'id': 1, 'status': 'active'},
            {'id': 2, 'status': 'active'},
        ]
        result = process_users(users)
        assert [u['id'] for u in result] == [3, 1, 2]


class TestProcessUsersNoMutation:
    """Test that original data is not mutated."""

    def test_does_not_mutate_original_dicts(self):
        """Should not modify the original user dictionaries."""
        users = [{'id': 1, 'status': 'active'}]
        original_keys = set(users[0].keys())
        process_users(users)
        assert 'processed' not in users[0]
        assert set(users[0].keys()) == original_keys

    def test_does_not_mutate_original_list(self):
        """Should not modify the original list."""
        users = [
            {'id': 1, 'status': 'active'},
            {'id': 2, 'status': 'inactive'},
        ]
        original_length = len(users)
        process_users(users)
        assert len(users) == original_length

    def test_returns_new_dict_objects(self):
        """Should return new dict objects, not references to originals."""
        users = [{'id': 1, 'status': 'active'}]
        result = process_users(users)
        assert result[0] is not users[0]


class TestProcessUsersEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_list(self):
        """Should return empty list for empty input."""
        assert process_users([]) == []

    def test_no_active_users(self):
        """Should return empty list when no users are active."""
        users = [
            {'id': 1, 'status': 'inactive'},
            {'id': 2, 'status': 'pending'},
        ]
        assert process_users(users) == []

    def test_all_active_users(self):
        """Should return all users when all are active."""
        users = [
            {'id': 1, 'status': 'active'},
            {'id': 2, 'status': 'active'},
        ]
        result = process_users(users)
        assert len(result) == 2

    def test_missing_status_key(self):
        """Should treat users without 'status' key as inactive."""
        users = [
            {'id': 1, 'name': 'No Status'},
            {'id': 2, 'status': 'active'},
        ]
        result = process_users(users)
        assert len(result) == 1
        assert result[0]['id'] == 2

    def test_none_status_value(self):
        """Should treat None status as inactive."""
        users = [{'id': 1, 'status': None}]
        assert process_users(users) == []

    def test_status_case_sensitive(self):
        """Should treat status comparison as case-sensitive."""
        users = [
            {'id': 1, 'status': 'Active'},
            {'id': 2, 'status': 'ACTIVE'},
            {'id': 3, 'status': 'active'},
        ]
        result = process_users(users)
        assert len(result) == 1
        assert result[0]['id'] == 3


# =============================================================================
# Tests for get_user_by_email()
# =============================================================================

class TestGetUserByEmailBasicFunctionality:
    """Test basic search behavior."""

    def test_finds_existing_user(self):
        """Should return user when email matches."""
        users = [
            {'email': 'alice@example.com', 'name': 'Alice'},
            {'email': 'bob@example.com', 'name': 'Bob'},
        ]
        result = get_user_by_email(users, 'bob@example.com')
        assert result is not None
        assert result['name'] == 'Bob'

    def test_returns_first_match(self):
        """Should return first matching user when duplicates exist."""
        users = [
            {'email': 'dupe@example.com', 'name': 'First'},
            {'email': 'dupe@example.com', 'name': 'Second'},
        ]
        result = get_user_by_email(users, 'dupe@example.com')
        assert result['name'] == 'First'

    def test_returns_reference_not_copy(self):
        """Should return reference to original dict."""
        users = [{'email': 'test@example.com', 'name': 'Test'}]
        result = get_user_by_email(users, 'test@example.com')
        assert result is users[0]


class TestGetUserByEmailNotFound:
    """Test behavior when user is not found."""

    def test_returns_none_when_not_found(self):
        """Should return None when email doesn't match any user."""
        users = [{'email': 'alice@example.com'}]
        result = get_user_by_email(users, 'nobody@example.com')
        assert result is None

    def test_empty_list_returns_none(self):
        """Should return None for empty user list."""
        result = get_user_by_email([], 'test@example.com')
        assert result is None

    def test_missing_email_key_skipped(self):
        """Should skip users without 'email' key."""
        users = [
            {'name': 'No Email'},
            {'email': 'found@example.com', 'name': 'Has Email'},
        ]
        result = get_user_by_email(users, 'found@example.com')
        assert result['name'] == 'Has Email'

    def test_all_missing_email_returns_none(self):
        """Should return None if no users have 'email' key."""
        users = [{'name': 'Alice'}, {'name': 'Bob'}]
        result = get_user_by_email(users, 'test@example.com')
        assert result is None


class TestGetUserByEmailEdgeCases:
    """Test edge cases."""

    def test_case_sensitive_search(self):
        """Should perform case-sensitive email comparison."""
        users = [{'email': 'Alice@Example.com'}]
        assert get_user_by_email(users, 'alice@example.com') is None
        assert get_user_by_email(users, 'Alice@Example.com') is not None

    def test_empty_email_search(self):
        """Should handle empty string email search."""
        users = [
            {'email': '', 'name': 'Empty'},
            {'email': 'test@example.com', 'name': 'Normal'},
        ]
        result = get_user_by_email(users, '')
        assert result['name'] == 'Empty'

    def test_none_email_value(self):
        """Should handle None email values in users."""
        users = [
            {'email': None, 'name': 'None Email'},
            {'email': 'test@example.com', 'name': 'Normal'},
        ]
        result = get_user_by_email(users, 'test@example.com')
        assert result['name'] == 'Normal'

    def test_special_characters_in_email(self):
        """Should handle special characters in email."""
        users = [{'email': 'user+tag@example.com'}]
        result = get_user_by_email(users, 'user+tag@example.com')
        assert result is not None


# =============================================================================
# Tests for calculate_total()
# =============================================================================

class TestCalculateTotalBasicFunctionality:
    """Test basic calculation behavior."""

    def test_calculates_single_item(self):
        """Should calculate price * quantity for single item."""
        items = [{'price': 10, 'quantity': 2}]
        assert calculate_total(items) == 20

    def test_calculates_multiple_items(self):
        """Should sum all items' price * quantity."""
        items = [
            {'price': 10, 'quantity': 2},  # 20
            {'price': 5, 'quantity': 3},   # 15
            {'price': 8, 'quantity': 1},   # 8
        ]
        assert calculate_total(items) == 43

    def test_handles_float_prices(self):
        """Should handle floating point prices."""
        items = [
            {'price': 10.50, 'quantity': 2},
            {'price': 3.25, 'quantity': 4},
        ]
        assert calculate_total(items) == 34.0

    def test_handles_float_quantities(self):
        """Should handle floating point quantities."""
        items = [{'price': 10, 'quantity': 2.5}]
        assert calculate_total(items) == 25.0


class TestCalculateTotalZeroValues:
    """Test behavior with zero values."""

    def test_empty_list(self):
        """Should return 0 for empty list."""
        assert calculate_total([]) == 0

    def test_zero_price(self):
        """Should handle zero price."""
        items = [{'price': 0, 'quantity': 5}]
        assert calculate_total(items) == 0

    def test_zero_quantity(self):
        """Should handle zero quantity."""
        items = [{'price': 10, 'quantity': 0}]
        assert calculate_total(items) == 0

    def test_mixed_zero_and_nonzero(self):
        """Should correctly sum when some items are zero."""
        items = [
            {'price': 10, 'quantity': 0},  # 0
            {'price': 0, 'quantity': 5},   # 0
            {'price': 5, 'quantity': 2},   # 10
        ]
        assert calculate_total(items) == 10


class TestCalculateTotalMissingKeys:
    """Test handling of missing keys."""

    def test_missing_price_treated_as_zero(self):
        """Should treat missing 'price' as 0."""
        items = [{'quantity': 5}]
        assert calculate_total(items) == 0

    def test_missing_quantity_treated_as_zero(self):
        """Should treat missing 'quantity' as 0."""
        items = [{'price': 10}]
        assert calculate_total(items) == 0

    def test_missing_both_keys(self):
        """Should treat missing both keys as 0."""
        items = [{'name': 'Empty Item'}]
        assert calculate_total(items) == 0

    def test_some_items_missing_keys(self):
        """Should handle mix of complete and incomplete items."""
        items = [
            {'price': 10, 'quantity': 2},  # 20
            {'price': 5},                   # 0 (missing quantity)
            {'quantity': 3},                # 0 (missing price)
            {'price': 8, 'quantity': 1},   # 8
        ]
        assert calculate_total(items) == 28


class TestCalculateTotalEdgeCases:
    """Test edge cases."""

    def test_negative_price(self):
        """Should handle negative prices (discounts)."""
        items = [
            {'price': 100, 'quantity': 1},
            {'price': -10, 'quantity': 1},  # discount
        ]
        assert calculate_total(items) == 90

    def test_negative_quantity(self):
        """Should handle negative quantities (returns)."""
        items = [
            {'price': 10, 'quantity': 5},
            {'price': 10, 'quantity': -2},  # return
        ]
        assert calculate_total(items) == 30

    def test_large_numbers(self):
        """Should handle large numbers."""
        items = [{'price': 1_000_000, 'quantity': 1_000_000}]
        assert calculate_total(items) == 1_000_000_000_000

    def test_small_decimals(self):
        """Should handle small decimal values."""
        items = [{'price': 0.01, 'quantity': 0.01}]
        assert calculate_total(items) == pytest.approx(0.0001)

    def test_preserves_extra_fields(self):
        """Should ignore extra fields in item dicts."""
        items = [
            {'name': 'Widget', 'sku': 'W001', 'price': 10, 'quantity': 2}
        ]
        assert calculate_total(items) == 20


# =============================================================================
# Integration / Doctest verification
# =============================================================================

class TestDoctests:
    """Verify examples from docstrings work correctly."""

    def test_process_users_docstring_example(self):
        """Verify process_users docstring example."""
        users = [
            {'id': 1, 'name': 'Alice', 'status': 'active'},
            {'id': 2, 'name': 'Bob', 'status': 'inactive'},
            {'id': 3, 'name': 'Charlie', 'status': 'active'},
        ]
        result = process_users(users)
        assert len(result) == 2
        assert result[0]['processed'] is True
        assert 'processed' not in users[0]

    def test_get_user_by_email_docstring_example(self):
        """Verify get_user_by_email docstring example."""
        users = [
            {'email': 'alice@example.com', 'name': 'Alice'},
            {'email': 'bob@example.com', 'name': 'Bob'},
        ]
        user = get_user_by_email(users, 'bob@example.com')
        assert user['name'] == 'Bob'
        assert get_user_by_email(users, 'nobody@example.com') is None

    def test_calculate_total_docstring_example(self):
        """Verify calculate_total docstring example."""
        items = [
            {'name': 'Apple', 'price': 1.50, 'quantity': 4},
            {'name': 'Banana', 'price': 0.75, 'quantity': 6},
        ]
        assert calculate_total(items) == 10.5


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
