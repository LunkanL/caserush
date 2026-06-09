from decimal import Decimal

from django.conf import settings
from django.db import models


class Bet(models.Model):
    GAME_TYPES = [
        ("coinflip", "Coinflip"),
        ("roulette", "Roulette"),
        ("case_opening", "Case Opening"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bets",
    )

    game_type = models.CharField(
        max_length=30,
        choices=GAME_TYPES,
        default="coinflip",
    )

    choice = models.CharField(max_length=100)
    result = models.CharField(max_length=100)

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payout = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    won = models.BooleanField(default=False)

    # Flexible extra data for different games
    metadata = models.JSONField(default=dict, blank=True)

    # Provably fair fields
    server_seed = models.CharField(max_length=128)
    server_seed_hash = models.CharField(max_length=128)
    client_seed = models.CharField(max_length=128)
    nonce = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        status = "won" if self.won else "lost"
        return f"{self.user.username} {self.game_type} {status} {self.amount}"


class Case(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["price", "name"]

    def __str__(self):
        return self.name


class CaseItem(models.Model):
    RARITIES = [
        ("common", "Common"),
        ("rare", "Rare"),
        ("epic", "Epic"),
        ("legendary", "Legendary"),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="items",
    )
    name = models.CharField(max_length=120)
    rarity = models.CharField(max_length=30, choices=RARITIES)
    demo_value = models.DecimalField(max_digits=12, decimal_places=2)
    image_path = models.CharField(max_length=255, blank=True)
    # Weight-based odds. Higher number = more common.
    weight = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["case", "rarity", "demo_value"]

    def __str__(self):
        return f"{self.name} ({self.rarity})"


class InventoryItem(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("sold", "Sold"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inventory_items",
    )
    case = models.ForeignKey(
        Case,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_items",
    )
    item = models.ForeignKey(
        CaseItem,
        on_delete=models.PROTECT,
        related_name="inventory_items",
    )
    bet = models.OneToOneField(
        Bet,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_item",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
    )

    acquired_value = models.DecimalField(max_digits=12, decimal_places=2)
    sold_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    sold_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.item.name}"