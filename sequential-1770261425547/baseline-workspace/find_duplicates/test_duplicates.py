"""Unit tests for find_duplicates function."""

import pytest
from duplicates import find_duplicates


class TestFindDuplicates:
    """Tests for find_duplicates function."""

    def test_basic_duplicates(self):
        """Should find duplicates in a simple list."""
        result = find_duplicates([1, 2, 3, 2, 4, 3])
        assert set(result) == {2, 3}

    def test_no_duplicates(self):
        """Should return empty list when no duplicates exist."""
        result = find_duplicates([1, 2, 3, 4, 5])
        assert result == []

    def test_empty_list(self):
        """Should handle empty list."""
        result = find_duplicates([])
        assert result == []

    def test_single_element(self):
        """Should handle single element list."""
        result = find_duplicates([1])
        assert result == []

    def test_all_same(self):
        """Should return single element when all elements are the same."""
        result = find_duplicates([5, 5, 5, 5])
        assert result == [5]

    def test_multiple_occurrences(self):
        """Should only return duplicate once even if it appears many times."""
        result = find_duplicates([1, 1, 1, 2, 2, 2, 3])
        assert set(result) == {1, 2}

    def test_strings(self):
        """Should work with strings."""
        result = find_duplicates(['a', 'b', 'a', 'c', 'b'])
        assert set(result) == {'a', 'b'}

    def test_mixed_types(self):
        """Should work with mixed hashable types."""
        result = find_duplicates([1, 'a', 1, 'a', 2])
        assert set(result) == {1, 'a'}

    def test_consecutive_duplicates(self):
        """Should find consecutive duplicates."""
        result = find_duplicates([1, 1, 2, 2, 3, 3])
        assert set(result) == {1, 2, 3}

    def test_element_not_duplicate_of_itself(self):
        """
        Regression test: An element appearing once should NOT be a duplicate.
        This catches the original bug where j started at i instead of i+1.
        """
        result = find_duplicates([1, 2, 3])
        assert result == [], "Unique elements should not be reported as duplicates"

    def test_adjacent_different_elements(self):
        """
        Regression test: Adjacent different elements are not duplicates.
        """
        result = find_duplicates([1, 2, 1])
        assert result == [1] or set(result) == {1}


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
