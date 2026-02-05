"""Example usage of UserRepository."""

from database import get_session, init_db
from models import User
from repositories import UserRepository


def main():
    # Initialize database tables
    init_db()

    # Use repository within a session context
    with get_session() as session:
        repo = UserRepository(session)

        # Create a user
        user = User(
            email="alice@example.com",
            password_hash="hashed_password_here",
            name="Alice Smith",
        )
        saved_user = repo.save(user)
        print(f"Created user: {saved_user.id}")

        # Find by email
        found = repo.find_by_email("alice@example.com")
        print(f"Found by email: {found.name}")

        # Check if email exists (for registration validation)
        if repo.email_exists("bob@example.com"):
            print("Email taken!")
        else:
            print("Email available!")

        # Update user
        found.name = "Alice Johnson"
        repo.save(found)
        print(f"Updated name to: {found.name}")

        # Pagination
        page = repo.find_paginated(page=1, per_page=10)
        print(f"Page 1: {len(page['items'])} of {page['total']} users")

        # Soft delete (deactivate)
        repo.deactivate(saved_user.id)
        print(f"User active: {repo.find_by_id(saved_user.id).is_active}")

        # Count
        print(f"Total users: {repo.count()}")
        print(f"Active users: {repo.count_active()}")

        # Session auto-commits on context exit


if __name__ == "__main__":
    main()
