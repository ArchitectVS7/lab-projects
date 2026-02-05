"""Comprehensive tests for user processing utilities.

Run with: pytest test_user_processing.py -v
"""

import pytest
from decimal import Decimal
from user_processing import process_users, get_user_by_email, calculate_total


# =============================================================================
# Tests for process_users
# =============================================================================

class TestProcessUsersBasicFunctionality:
    """Test core filtering and processing behavior."""

    def test_returns_only_active_users(self):
        """Should include only users with status='active'."""
        users = [
            {'name': 'Alice', 'status': 'active'},
            {'name': 'Bob', 'status': 'inactive'},
            {'name': 'Carol', 'status': 'active'},
            {'name': 'Dave', 'status': 'pending'},
        ]
        result = process_users(users)
        
        assert len(result) == 2
        names = [u['name'] for u in result]
        assert names == ['Alice', 'Carol']

    def test_adds_processed_flag_to_each_result(self):
        """Should add processed=True to all returned users."""
        users = [
            {'name': 'Alice', 'status': 'active'},
            {'name': 'Bob', 'status': 'active'},
        ]
        result = process_users(users)
        
        assert all(u.get('processed') is True for u in result)

    def test_preserves_all_original_fields(self):
        """Should keep all original fields in the result."""
        users = [{
            'id': 123,
            'name': 'Alice',
            'email': 'alice@example.com',
            'status': 'active',
            'role': 'admin',
        }]
        result = process_users(users)
        
        assert result[0]['id'] == 123
        assert result[0]['name'] == 'Alice'
        assert result[0]['email'] == 'alice@example.com'
        assert result[0]['role'] == 'admin'


class TestProcessUsersNoMutation:
    """Verify that input data is never modified."""

    def test_does_not_mutate_original_dicts(self):
        """Original user dicts should remain unchanged."""
        users = [{'name': 'Alice', 'status': 'active'}]
        original_keys = set(users[0].keys())
        
        process_users(users)
        
        assert set(users[0].keys()) == original_keys
        assert 'processed' not in users[0]

    def test_does_not_mutate_original_list(self):
        """Original list should remain unchanged."""
        users = [
            {'name': 'Alice', 'status': 'active'},
            {'name': 'Bob', 'status': 'inactive'},
        ]
        original_length = len(users)
        
        process_users(users)
        
        assert len(users) == original_length

    def test_result_is_independent_of_input(self):
        """Modifying result should not affect input."""
        users = [{'name': 'Alice', 'status': 'active'}]
        result = process_users(users)
        
        result[0]['name'] = 'Modified'
        
        assert users[0]['name'] == 'Alice'


class TestProcessUsersEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_empty_list_returns_empty_list(self):
        """Should return empty list for empty input."""
        assert process_users([]) == []

    def test_no_active_users_returns_empty_list(self):
        """Should return empty list when no users are active."""
        users = [
            {'name': 'Bob', 'status': 'inactive'},
            {'name': 'Carol', 'status': 'pending'},
        ]
        assert process_users(users) == []

    def test_missing_status_field_excluded(self):
        """Users without status field should be excluded."""
        users = [
            {'name': 'Alice'},  # no status
            {'name': 'Bob', 'status': 'active'},
        ]
        result = process_users(users)
        
        assert len(result) == 1
        assert result[0]['name'] == 'Bob'

    def test_none_status_excluded(self):
        """Users with status=None should be excluded."""
        users = [{'name': 'Alice', 'status': None}]
        assert process_users(users) == []

    def test_status_is_case_sensitive(self):
        """Status comparison should be case-sensitive."""
        users = [
            {'name': 'Alice', 'status': 'Active'},  # capital A
            {'name': 'Bob', 'status': 'ACTIVE'},    # all caps
            {'name': 'Carol', 'status': 'active'},  # correct
        ]
        result = process_users(users)
        
        assert len(result) == 1
        assert result[0]['name'] == 'Carol'

    def test_all_users_active(self):
        """Should return all users when all are active."""
        users = [
            {'name': 'Alice', 'status': 'active'},
            {'name': 'Bob', 'status': 'active'},
            {'name': 'Carol', 'status': 'active'},
        ]
        result = process_users(users)
        
        assert len(result) == 3


# =============================================================================
# Tests for get_user_by_email
# =============================================================================

class TestGetUserByEmailBasicFunctionality:
    """Test core search behavior."""

    def test_finds_user_with_matching_email(self):
        """Should return user when email matches."""
        users = [
            {'name': 'Alice', 'email': 'alice@example.com'},
            {'name': 'Bob', 'email': 'bob@example.com'},
        ]
        result = get_user_by_email(users, 'bob@example.com')
        
        assert result is not None
        assert result['name'] == 'Bob'

    def test_returns_none_when_email_not_found(self):
        """Should return None when no email matches."""
        users = [{'name': 'Alice', 'email': 'alice@example.com'}]
        result = get_user_by_email(users, 'notfound@example.com')
        
        assert result is None

    def test_returns_first_match_when_duplicates_exist(self):
        """Should return the first matching user."""
        users = [
            {'name': 'Alice1', 'email': 'shared@example.com'},
            {'name': 'Alice2', 'email': 'shared@example.com'},
        ]
        result = get_user_by_email(users, 'shared@example.com')
        
        assert result['name'] == 'Alice1'

    def test_returns_complete_user_dict(self):
        """Should return the entire user dict, not just name."""
        users = [{
            'id': 42,
            'name': 'Alice',
            'email': 'alice@example.com',
            'role': 'admin',
        }]
        result = get_user_by_email(users, 'alice@example.com')
        
        assert result['id'] == 42
        assert result['role'] == 'admin'


class TestGetUserByEmailEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_empty_list_returns_none(self):
        """Should return None for empty input list."""
        result = get_user_by_email([], 'test@example.com')
        assert result is None

    def test_missing_email_field_skipped(self):
        """Users without email field should be skipped."""
        users = [
            {'name': 'Alice'},  # no email
            {'name': 'Bob', 'email': 'bob@example.com'},
        ]
        result = get_user_by_email(users, 'bob@example.com')
        
        assert result['name'] == 'Bob'

    def test_none_email_field_skipped(self):
        """Users with email=None should be skipped."""
        users = [
            {'name': 'Alice', 'email': None},
            {'name': 'Bob', 'email': 'bob@example.com'},
        ]
        result = get_user_by_email(users, 'bob@example.com')
        
        assert result['name'] == 'Bob'

    def test_email_comparison_is_case_sensitive(self):
        """Email comparison should be case-sensitive."""
        users = [{'name': 'Alice', 'email': 'Alice@Example.COM'}]
        
        assert get_user_by_email(users, 'alice@example.com') is None
        assert get_user_by_email(users, 'Alice@Example.COM') is not None

    def test_empty_email_search(self):
        """Should handle searching for empty string."""
        users = [
            {'name': 'Empty', 'email': ''},
            {'name': 'Alice', 'email': 'alice@example.com'},
        ]
        result = get_user_by_email(users, '')
        
        assert result['name'] == 'Empty'

    def test_email_with_special_characters(self):
        """Should handle emails with special characters."""
        users = [{'name': 'Test', 'email': 'test+tag@sub.example.com'}]
        result = get_user_by_email(users, 'test+tag@sub.example.com')
        
        assert result['name'] == 'Test'


# =============================================================================
# Tests for calculate_total
# =============================================================================

class TestCalculateTotalBasicFunctionality:
    """Test core calculation behavior."""

    def test_calculates_sum_of_price_times_quantity(self):
        """Should correctly multiply and sum."""
        items = [
            {'name': 'Apple', 'price': 10, 'quantity': 2},   # 20
            {'name': 'Banana', 'price': 5, 'quantity': 3},   # 15
        ]
        result = calculate_total(items)
        
        assert result == Decimal('35')

    def test_returns_decimal_type(self):
        """Result should always be a Decimal."""
        items = [{'price': 10, 'quantity': 1}]
        result = calculate_total(items)
        
        assert isinstance(result, Decimal)

    def test_single_item(self):
        """Should work with a single item."""
        items = [{'price': 25, 'quantity': 4}]
        result = calculate_total(items)
        
        assert result == Decimal('100')


class TestCalculateTotalPrecision:
    """Test decimal precision for monetary calculations."""

    def test_float_precision_is_maintained(self):
        """Should avoid float precision errors (0.1 + 0.2 = 0.3)."""
        items = [
            {'price': 0.1, 'quantity': 1},
            {'price': 0.2, 'quantity': 1},
        ]
        result = calculate_total(items)
        
        assert result == Decimal('0.3')

    def test_handles_many_decimal_places(self):
        """Should handle prices with many decimal places."""
        items = [{'price': 19.99, 'quantity': 3}]
        result = calculate_total(items)
        
        assert result == Decimal('59.97')

    def test_large_quantities(self):
        """Should handle large quantities without overflow."""
        items = [{'price': 0.01, 'quantity': 1000000}]
        result = calculate_total(items)
        
        assert result == Decimal('10000')

    def test_string_prices_converted_correctly(self):
        """Should accept string prices."""
        items = [{'price': '19.99', 'quantity': 2}]
        result = calculate_total(items)
        
        assert result == Decimal('39.98')


class TestCalculateTotalEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_empty_list_returns_zero(self):
        """Should return Decimal('0') for empty list."""
        result = calculate_total([])
        
        assert result == Decimal('0')
        assert isinstance(result, Decimal)

    def test_missing_price_treated_as_zero(self):
        """Items without price should contribute 0."""
        items = [
            {'name': 'No Price', 'quantity': 5},
            {'name': 'Has Price', 'price': 10, 'quantity': 1},
        ]
        result = calculate_total(items)
        
        assert result == Decimal('10')

    def test_missing_quantity_treated_as_zero(self):
        """Items without quantity should contribute 0."""
        items = [
            {'name': 'No Qty', 'price': 100},
            {'name': 'Has Qty', 'price': 10, 'quantity': 2},
        ]
        result = calculate_total(items)
        
        assert result == Decimal('20')

    def test_zero_price(self):
        """Should handle zero price correctly."""
        items = [{'price': 0, 'quantity': 100}]
        result = calculate_total(items)
        
        assert result == Decimal('0')

    def test_zero_quantity(self):
        """Should handle zero quantity correctly."""
        items = [{'price': 100, 'quantity': 0}]
        result = calculate_total(items)
        
        assert result == Decimal('0')

    def test_negative_price(self):
        """Should handle negative prices (discounts/refunds)."""
        items = [
            {'name': 'Item', 'price': 100, 'quantity': 1},
            {'name': 'Discount', 'price': -10, 'quantity': 1},
        ]
        result = calculate_total(items)
        
        assert result == Decimal('90')

    def test_invalid_price_string_treated_as_zero(self):
        """Invalid price strings should be treated as 0."""
        items = [
            {'price': 'invalid', 'quantity': 5},
            {'price': 10, 'quantity': 1},
        ]
        result = calculate_total(items)
        
        assert result == Decimal('10')

    def test_decimal_price_input(self):
        """Should accept Decimal as price input."""
        items = [{'price': Decimal('19.99'), 'quantity': 2}]
        result = calculate_total(items)
        
        assert result == Decimal('39.98')

    def test_float_quantity(self):
        """Should handle float quantities (e.g., weight-based items)."""
        items = [{'price': 5, 'quantity': 2.5}]
        result = calculate_total(items)
        
        assert result == Decimal('12.5')


class TestCalculateTotalIntegration:
    """Integration tests with realistic data."""

    def test_shopping_cart_scenario(self):
        """Simulate a realistic shopping cart."""
        cart = [
            {'sku': 'APPLE-001', 'name': 'Organic Apples', 'price': 4.99, 'quantity': 2},
            {'sku': 'MILK-002', 'name': 'Whole Milk', 'price': 3.49, 'quantity': 1},
            {'sku': 'BREAD-003', 'name': 'Sourdough', 'price': 5.99, 'quantity': 1},
            {'sku': 'COUPON', 'name': '10% Discount', 'price': -1.95, 'quantity': 1},
        ]
        result = calculate_total(cart)
        
        # 4.99*2 + 3.49 + 5.99 - 1.95 = 17.51
        assert result == Decimal('17.51')


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
