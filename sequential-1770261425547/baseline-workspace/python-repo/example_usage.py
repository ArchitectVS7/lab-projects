"""Example usage of UserRepository."""

from models.base import SessionLocal
from models.user import UserStatus
from repositories.user_repository import UserRepository


def main():
    # Create session and repository
    session = SessionLocal()
    user_repo = UserRepository(session)

    try:
        # ============ Create ============
        user = user_repo.create(
            email="alice@example.com",
            username="alice",
            password_hash="hashed_password_here",
            name="Alice Smith",
        )
        print(f"Created user: {user.id}")

        # ============ Read ============
        # By ID
        found = user_repo.find_by_id(user.id)

        # By email (for login)
        found = user_repo.find_by_email("alice@example.com")

        # By email or username (flexible login)
        found = user_repo.find_by_email_or_username("alice")

        # Check existence before creating
        if user_repo.exists_by_email("bob@example.com"):
            print("Email already registered")

        # ============ Query ============
        # Get all active users
        active_users = user_repo.find_active()

        # Find inactive users (no login in 90 days)
        inactive = user_repo.find_inactive_since(90)

        # Search with pagination
        results = user_repo.search("alice", page=1, limit=10)
        print(f"Found {results.total} users, page {results.page}/{results.pages}")
        for u in results.items:
            print(f"  - {u.name} ({u.email})")

        # Paginated list
        page = user_repo.find_paginated(page=1, limit=20, status=UserStatus.ACTIVE)

        # ============ Update ============
        # Generic update
        user_repo.update(user.id, name="Alice Jones")

        # Domain-specific operations
        user_repo.verify_user(user.id)
        user_repo.record_login(user.id)
        user_repo.suspend_user(user.id)

        # ============ Bulk Operations ============
        # Deactivate multiple users
        count = user_repo.update_status_many(
            ids=[user.id],
            status=UserStatus.INACTIVE
        )
        print(f"Deactivated {count} users")

        # ============ Delete ============
        deleted = user_repo.delete(user.id)
        print(f"Deleted: {deleted}")

        # ============ Counts ============
        total = user_repo.count()
        active = user_repo.count_active()
        print(f"Total: {total}, Active: {active}")

    finally:
        session.close()


if __name__ == "__main__":
    main()
