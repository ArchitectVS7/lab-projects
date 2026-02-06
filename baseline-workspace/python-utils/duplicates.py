"""Find duplicate elements in a list."""


def find_duplicates(arr: list) -> list:
    """Return a list of elements that appear more than once.
    
    Args:
        arr: Input list of elements
        
    Returns:
        List of duplicate elements (each appearing once in result)
    """
    seen = set()
    duplicates = set()
    
    for item in arr:
        if item in seen:
            duplicates.add(item)
        else:
            seen.add(item)
    
    return list(duplicates)
