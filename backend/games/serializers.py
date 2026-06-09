from decimal import Decimal, ROUND_DOWN

from rest_framework import serializers

from .models import Bet, Case, CaseItem, InventoryItem


MIN_BET_AMOUNT = Decimal("1.00")
MAX_BET_AMOUNT = Decimal("1000.00")


class BetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bet
        fields = [
            "id",
            "game_type",
            "choice",
            "result",
            "amount",
            "payout",
            "won",
            "metadata",
            "server_seed",
            "server_seed_hash",
            "client_seed",
            "nonce",
            "created_at",
        ]


class CoinflipBetSerializer(serializers.Serializer):
    choice = serializers.ChoiceField(choices=["heads", "tails"])
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    client_seed = serializers.CharField(
        max_length=128,
        required=False,
        allow_blank=True,
    )

    def validate_amount(self, value):
        value = value.quantize(Decimal("0.01"), rounding=ROUND_DOWN)

        if value < MIN_BET_AMOUNT:
            raise serializers.ValidationError("Minimum bet amount is 1.00.")

        if value > MAX_BET_AMOUNT:
            raise serializers.ValidationError("Maximum bet amount is 1000.00.")

        return value

    def validate_client_seed(self, value):
        value = value.strip()

        if not value:
            return "default-client-seed"

        return value

class RouletteBetSerializer(serializers.Serializer):
    choice = serializers.ChoiceField(choices=["ct", "t", "green"])
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    client_seed = serializers.CharField(
        max_length=128,
        required=False,
        allow_blank=True,
    )

    def validate_amount(self, value):
        value = value.quantize(Decimal("0.01"), rounding=ROUND_DOWN)

        if value < MIN_BET_AMOUNT:
            raise serializers.ValidationError("Minimum bet amount is 1.00.")

        if value > MAX_BET_AMOUNT:
            raise serializers.ValidationError("Maximum bet amount is 1000.00.")

        return value

    def validate_client_seed(self, value):
        value = value.strip()

        if not value:
            return "default-client-seed"

        return value
class CaseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseItem
        fields = [
            "id",
            "name",
            "rarity",
            "demo_value",
            "weight",
            "image_path",
        ]


class CaseSerializer(serializers.ModelSerializer):
    items = CaseItemSerializer(many=True, read_only=True)

    class Meta:
        model = Case
        fields = [
            "id",
            "name",
            "slug",
            "price",
            "description",
            "is_active",
            "items",
            "created_at",
        ]


class CaseOpenSerializer(serializers.Serializer):
    client_seed = serializers.CharField(
        max_length=128,
        required=False,
        allow_blank=True,
    )

    def validate_client_seed(self, value):
        value = value.strip()

        if not value:
            return "default-case-seed"

        return value


class InventoryItemSerializer(serializers.ModelSerializer):
    item = CaseItemSerializer(read_only=True)
    case_name = serializers.CharField(source="case.name", read_only=True)
    bet_id = serializers.IntegerField(source="bet.id", read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "case_name",
            "item",
            "bet_id",
            "status",
            "acquired_value",
            "sold_value",
            "created_at",
            "sold_at",
        ]

class ActivityFeedBetSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Bet
        fields = [
            "id",
            "username",
            "game_type",
            "choice",
            "result",
            "amount",
            "payout",
            "won",
            "metadata",
            "created_at",
        ]