from decimal import Decimal

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Wallet, Transaction


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_wallet_for_new_user(sender, instance, created, **kwargs):
    if not created:
        return

    wallet = Wallet.objects.create(
        user=instance,
        balance=Decimal("1000.00"),
    )

    Transaction.objects.create(
        user=instance,
        amount=Decimal("1000.00"),
        transaction_type="bonus",
        description="Starting demo balance",
        balance_after=wallet.balance,
    )