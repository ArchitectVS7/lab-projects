"""
Example usage of the Notification System.
"""

import asyncio
from src import (
    # Core
    NotificationService,
    NotificationWorker,
    Channel,
    Urgency,
    # Services
    PreferencesService,
    QuietHoursService,
    TemplateService,
    # Repositories (in-memory for demo)
    InMemoryNotificationRepository,
    InMemoryDeliveryRepository,
    InMemoryPreferencesRepository,
    InMemoryTemplateRepository,
    InMemoryQueue,
    # Channels
    EmailChannel,
    PushChannel,
)


async def main():
    # ==========================================================================
    # Setup
    # ==========================================================================
    
    # Repositories (use real DB implementations in production)
    notification_repo = InMemoryNotificationRepository()
    delivery_repo = InMemoryDeliveryRepository()
    preferences_repo = InMemoryPreferencesRepository()
    template_repo = InMemoryTemplateRepository()
    
    # Queue (use Redis/BullMQ in production)
    queue = InMemoryQueue()
    
    # Services
    preferences_service = PreferencesService(preferences_repo)
    quiet_hours_service = QuietHoursService()
    template_service = TemplateService(template_repo)
    
    # Channel providers (use real credentials in production)
    channels = {
        Channel.EMAIL: EmailChannel(
            api_key="sg_test_key",
            from_email="noreply@example.com",
        ),
        Channel.PUSH: PushChannel(
            credentials_path="firebase-credentials.json",
        ),
    }
    
    # Main notification service
    notification_service = NotificationService(
        preferences_service=preferences_service,
        quiet_hours_service=quiet_hours_service,
        template_service=template_service,
        queue=queue,
        notification_repo=notification_repo,
        delivery_repo=delivery_repo,
    )
    
    # ==========================================================================
    # Setup user preferences
    # ==========================================================================
    
    user_id = "user_123"
    
    preferences_service.update_preferences(user_id, {
        "channels": {
            "email": {"enabled": True, "address": "user@example.com"},
            "sms": {"enabled": False},
            "push": {"enabled": True},
        },
        "quiet_hours": {
            "enabled": True,
            "start": "22:00",
            "end": "08:00",
            "timezone": "America/New_York",
            "bypass_for_urgent": True,
        },
        "push_tokens": ["fcm_token_abc123"],
    })
    
    print("✓ User preferences configured")
    
    # ==========================================================================
    # Send notifications
    # ==========================================================================
    
    # Example 1: Normal notification
    result = await notification_service.notify(
        user_id=user_id,
        notification_type="order_shipped",
        data={
            "order_id": "ORD-12345",
            "tracking_url": "https://track.example.com/12345",
        },
        urgency=Urgency.NORMAL,
    )
    
    print(f"\n✓ Notification sent:")
    print(f"  ID: {result.notification_id}")
    print(f"  Queued channels: {[c.value for c in result.queued_channels]}")
    if result.delayed_until:
        print(f"  Delayed until: {result.delayed_until}")
    
    # Example 2: Urgent notification (bypasses quiet hours)
    result2 = await notification_service.notify(
        user_id=user_id,
        notification_type="security_alert",
        data={
            "alert_type": "New login",
            "timestamp": "2024-01-15 10:30:00",
            "location": "New York, USA",
        },
        urgency=Urgency.CRITICAL,
    )
    
    print(f"\n✓ Security alert sent:")
    print(f"  ID: {result2.notification_id}")
    print(f"  Queued channels: {[c.value for c in result2.queued_channels]}")
    
    # ==========================================================================
    # Check delivery status
    # ==========================================================================
    
    status = await notification_service.get_delivery_status(result.notification_id)
    
    print(f"\n📊 Delivery status for {result.notification_id}:")
    for delivery in status.deliveries:
        print(f"  - {delivery.channel.value}: {delivery.status.value}")
        print(f"    Recipient: {delivery.recipient}")
    
    # ==========================================================================
    # Process queue (normally this runs as a separate worker process)
    # ==========================================================================
    
    print("\n🔄 Processing queued notifications...")
    
    worker = NotificationWorker(
        queue=queue,
        template_service=template_service,
        delivery_repo=delivery_repo,
        channels=channels,
    )
    
    # Process a few jobs (in production, worker.start() runs continuously)
    for _ in range(5):
        await worker._process_next()
    
    # Check status after processing
    status = await notification_service.get_delivery_status(result.notification_id)
    
    print(f"\n📊 Updated delivery status:")
    for delivery in status.deliveries:
        print(f"  - {delivery.channel.value}: {delivery.status.value}")
    
    print("\n✅ Done!")


if __name__ == "__main__":
    asyncio.run(main())
