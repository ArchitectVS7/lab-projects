"""Find duplicate elements in a list."""

from typing import List, TypeVar

T = TypeVar('T')


def find_duplicates(arr: List[T]) -> List[T]:
    """
    Return a list of elements that appear more than once in arr.
    
    Each duplicate is returned only once, regardless of how many times
    it appears in the input.
    
    Args:
        arr: Input list of elements
        
    Returns:
        List of duplicate elements (order not guaranteed)
    """
    seen: set[T] = set()
    duplicates: set[T] = set()
    
    for item in arr:
        if item in seen:
            duplicates.add(item)
        seen.add(item)
    
    return list(duplicates)
