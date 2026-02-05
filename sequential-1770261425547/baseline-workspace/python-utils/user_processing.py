"""User processing utilities.

This module provides functions for filtering, searching, and calculating
totals from collections of user and item dictionaries.

Example:
    >>> users = [
    ...     {'name': 'Alice', 'email': 'alice@example.com', 'status': 'active'},
    ...     {'name': 'Bob', 'email': 'bob@example.com', 'status': 'inactive'},
    ... ]
    >>> active = process_users(users)
    >>> len(active)
    1
    >>> active[0]['name']
    'Alice'
"""

from decimal import Decimal, InvalidOperation
from typing import Any


def process_users(users: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Filter users by active status and mark them as processed.
    
    Iterates through the provided list of user dictionaries, selects those
    with status='active', and returns copies with an added 'processed': True
    field. The original dictionaries are never modified.
    
    Args:
        users: A list of user dictionaries. Each dict may contain a 'status'
            field. Users without a 'status' field or with status != 'active'
            are excluded from the result.
    
    Returns:
        A new list containing shallow copies of active user dicts, each with
        'processed': True added. Returns an empty list if no active users
        are found or if the input is empty.
    
    Raises:
        TypeError: If users is not iterable or contains non-dict items.
    
    Example:
        >>> users = [
        ...     {'id': 1, 'name': 'Alice', 'status': 'active'},
        ...     {'id': 2, 'name': 'Bob', 'status': 'inactive'},
        ...     {'id': 3, 'name': 'Carol', 'status': 'active'},
        ... ]
        >>> result = process_users(users)
        >>> len(result)
        2
        >>> result[0]
        {'id': 1, 'name': 'Alice', 'status': 'active', 'processed': True}
        >>> 'processed' in users[0]  # Original unchanged
        False
    
    Note:
        This function performs a shallow copy. If user dicts contain nested
        mutable objects, those will still be shared with the original.
    """
    return [
        {**user, 'processed': True}
        for user in users
        if user.get('status') == 'active'
    ]


def get_user_by_email(
    users: list[dict[str, Any]], 
    email: str
) -> dict[str, Any] | None:
    """Find the first user with a matching email address.
    
    Performs a case-sensitive search through the list of user dictionaries
    and returns the first one where the 'email' field matches the provided
    email address.
    
    Args:
        users: A list of user dictionaries to search. Each dict may contain
            an 'email' field. Dicts without an 'email' field are skipped.
        email: The email address to search for. Comparison is case-sensitive.
    
    Returns:
        The first user dict with a matching email, or None if no match is
        found or if the input list is empty.
    
    Raises:
        TypeError: If users is not iterable.
    
    Example:
        >>> users = [
        ...     {'name': 'Alice', 'email': 'alice@example.com'},
        ...     {'name': 'Bob', 'email': 'bob@example.com'},
        ... ]
        >>> user = get_user_by_email(users, 'bob@example.com')
        >>> user['name']
        'Bob'
        >>> get_user_by_email(users, 'notfound@example.com') is None
        True
    
    Note:
        If multiple users share the same email, only the first is returned.
        For case-insensitive search, normalize emails before calling.
    """
    return next(
        (user for user in users if user.get('email') == email),
        None
    )


def calculate_total(items: list[dict[str, Any]]) -> Decimal:
    """Calculate the total price of all items (price × quantity).
    
    Computes the sum of (price * quantity) for each item in the list.
    Uses Python's Decimal type for precise monetary calculations,
    avoiding floating-point precision errors.
    
    Args:
        items: A list of item dictionaries. Each dict should contain:
            - 'price': The unit price (int, float, str, or Decimal).
                      Defaults to 0 if missing or invalid.
            - 'quantity': The quantity (int or float).
                         Defaults to 0 if missing.
    
    Returns:
        The total as a Decimal. Returns Decimal('0') for empty lists
        or if all items have missing/zero values.
    
    Raises:
        TypeError: If items is not iterable.
    
    Example:
        >>> items = [
        ...     {'name': 'Apple', 'price': 1.50, 'quantity': 4},
        ...     {'name': 'Banana', 'price': 0.75, 'quantity': 6},
        ... ]
        >>> calculate_total(items)
        Decimal('10.50')
        
        >>> # Handles float precision correctly
        >>> items = [{'price': 0.1, 'quantity': 1}, {'price': 0.2, 'quantity': 1}]
        >>> calculate_total(items)
        Decimal('0.3')
    
    Note:
        String prices are supported: {'price': '19.99', 'quantity': 2}
        Invalid price values (e.g., 'abc') are treated as 0.
    """
    total = Decimal('0')
    
    for item in items:
        # Safely convert price to Decimal
        raw_price = item.get('price', 0)
        try:
            price = Decimal(str(raw_price))
        except (InvalidOperation, ValueError):
            price = Decimal('0')
        
        # Get quantity with default
        quantity = item.get('quantity', 0)
        
        total += price * quantity
    
    return total
