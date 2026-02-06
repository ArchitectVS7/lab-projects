"""Unit tests for find_duplicates."""

import pytest
from duplicates import find_duplicates


class TestFindDuplicates:
    """Tests for find_duplicates function."""

    def test_basic_duplicates(self):
        """Should find duplicates in a list with repeated elements."""
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

    def test_duplicate_not_repeated_in_result(self):
        """Duplicate should appear only once in result, not multiple times."""
        result = find_duplicates([1, 1, 1, 1, 1])
        assert result == [1]
        assert len(result) == 1

    def test_element_not_compared_to_itself(self):
        """Each element should NOT be reported as duplicate of itself."""
        # This was the original bug - every element was a "duplicate"
        result = find_duplicates([1, 2, 3, 4])
        assert result == []
        # If the bug existed, this would return [1, 2, 3, 4]

    def test_strings(self):
        """Should work with strings."""
        result = find_duplicates(['a', 'b', 'a', 'c', 'b'])
        assert set(result) == {'a', 'b'}

    def test_mixed_types(self):
        """Should work with mixed hashable types."""
        result = find_duplicates([1, 'a', 1, 'a', 2])
        assert set(result) == {1, 'a'}

    def test_preserves_original_list(self):
        """Should not modify the original list."""
        original = [1, 2, 3, 2]
        original_copy = original.copy()
        find_duplicates(original)
        assert original == original_copy


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
