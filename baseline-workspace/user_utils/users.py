"""
User processing utilities.

This module provides functions for filtering, searching, and calculating
totals from collections of user and item dictionaries.

Example:
    >>> users = [
    ...     {'id': 1, 'email': 'alice@example.com', 'status': 'active'},
    ...     {'id': 2, 'email': 'bob@example.com', 'status': 'inactive'},
    ... ]
    >>> active = process_users(users)
    >>> len(active)
    1
    >>> active[0]['processed']
    True
"""

from typing import Optional, Any


def process_users(users: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Filter active users and mark them as processed.
    
    Takes a list of user dictionaries, filters to only those with
    status='active', and returns copies with 'processed': True added.
    
    Important: This function does NOT mutate the original dictionaries.
    Each returned dict is a shallow copy of the original with the
    'processed' key added.
    
    Args:
        users: List of user dictionaries. Each dict should have a 'status'
            key. Users missing the 'status' key are treated as inactive.
    
    Returns:
        List of shallow-copied user dicts for active users, each with
        'processed': True added. Returns empty list if no active users.
    
    Examples:
        Basic usage:
        
        >>> users = [
        ...     {'id': 1, 'name': 'Alice', 'status': 'active'},
        ...     {'id': 2, 'name': 'Bob', 'status': 'inactive'},
        ...     {'id': 3, 'name': 'Charlie', 'status': 'active'},
        ... ]
        >>> result = process_users(users)
        >>> len(result)
        2
        >>> result[0]['processed']
        True
        
        Original is not mutated:
        
        >>> 'processed' in users[0]
        False
        
        Handles missing status gracefully:
        
        >>> process_users([{'id': 1}])
        []
        
        Empty input:
        
        >>> process_users([])
        []
    
    Note:
        Only shallow copies are made. If user dicts contain nested
        mutable objects, those will still be shared references.
    """
    return [
        {**user, 'processed': True}
        for user in users
        if user.get('status') == 'active'
    ]


def get_user_by_email(
    users: list[dict[str, Any]], 
    email: str
) -> Optional[dict[str, Any]]:
    """
    Find a user by their email address.
    
    Performs a linear search through the users list and returns the
    first user dict whose 'email' key matches the provided email.
    
    Args:
        users: List of user dictionaries. Each dict should have an 'email'
            key. Users missing the 'email' key are skipped.
        email: Email address to search for. Comparison is case-sensitive.
    
    Returns:
        The first matching user dict, or None if no match is found.
        Returns the original dict reference, not a copy.
    
    Examples:
        Find existing user:
        
        >>> users = [
        ...     {'email': 'alice@example.com', 'name': 'Alice'},
        ...     {'email': 'bob@example.com', 'name': 'Bob'},
        ... ]
        >>> user = get_user_by_email(users, 'bob@example.com')
        >>> user['name']
        'Bob'
        
        User not found:
        
        >>> get_user_by_email(users, 'nobody@example.com') is None
        True
        
        Case sensitivity:
        
        >>> get_user_by_email(users, 'ALICE@EXAMPLE.COM') is None
        True
        
        Empty list:
        
        >>> get_user_by_email([], 'test@example.com') is None
        True
    
    Note:
        For large datasets, consider using a dict keyed by email for O(1)
        lookups instead of this O(n) linear search.
    """
    return next(
        (user for user in users if user.get('email') == email),
        None
    )


def calculate_total(items: list[dict[str, Any]]) -> float:
    """
    Calculate the total price of all items.
    
    Computes the sum of (price * quantity) for each item in the list.
    Missing 'price' or 'quantity' keys are treated as 0.
    
    Args:
        items: List of item dictionaries. Each dict should have 'price'
            (numeric) and 'quantity' (numeric) keys. Missing keys
            default to 0.
    
    Returns:
        Total price as a float. Returns 0.0 for empty list or if all
        items have missing/zero prices or quantities.
    
    Examples:
        Basic usage:
        
        >>> items = [
        ...     {'name': 'Apple', 'price': 1.50, 'quantity': 4},
        ...     {'name': 'Banana', 'price': 0.75, 'quantity': 6},
        ... ]
        >>> calculate_total(items)
        10.5
        
        Integer prices:
        
        >>> calculate_total([{'price': 10, 'quantity': 2}])
        20
        
        Missing keys treated as zero:
        
        >>> calculate_total([{'price': 10}])  # missing quantity
        0
        >>> calculate_total([{'quantity': 5}])  # missing price
        0
        
        Empty list:
        
        >>> calculate_total([])
        0
    
    Warning:
        Uses floating point arithmetic. For financial calculations
        requiring exact decimal precision, consider using the `decimal`
        module instead.
    
    See Also:
        decimal.Decimal: For precise monetary calculations.
    """
    return sum(
        item.get('price', 0) * item.get('quantity', 0)
        for item in items
    )
