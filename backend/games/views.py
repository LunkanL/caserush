import hashlib
import hmac
import secrets
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Sum
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from wallet.models import Transaction, Wallet

from .models import Bet, Case, InventoryItem
from .serializers import (
    ActivityFeedBetSerializer,
    BetSerializer,
    CaseOpenSerializer,
    CaseSerializer,
    CoinflipBetSerializer,
    InventoryItemSerializer,
    RouletteBetSerializer,
)

PAYOUT_MULTIPLIER = Decimal("1.90")
ROULETTE_CT_T_MULTIPLIER = Decimal("2.00")
ROULETTE_GREEN_MULTIPLIER = Decimal("14.00")


def calculate_roulette_result(server_seed, client_seed, nonce):
    message = f"roulette:{client_seed}:{nonce}"

    digest = hmac.new(
        server_seed.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    number = int(digest[:8], 16)
    slot = number % 15

    if slot == 0:
        return {
            "slot": slot,
            "result": "green",
            "label": "Green",
        }

    if slot % 2 == 1:
        return {
            "slot": slot,
            "result": "ct",
            "label": "CT",
        }

    return {
        "slot": slot,
        "result": "t",
        "label": "T",
    }


def get_roulette_multiplier(choice):
    if choice == "green":
        return ROULETTE_GREEN_MULTIPLIER

    return ROULETTE_CT_T_MULTIPLIER

def calculate_case_roll(server_seed, client_seed, nonce):
    message = f"case_opening:{client_seed}:{nonce}"

    digest = hmac.new(
        server_seed.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    number = int(digest[:8], 16)

    return number


def pick_case_item(case, server_seed, client_seed, nonce):
    items = list(case.items.all())

    if not items:
        return None

    total_weight = sum(item.weight for item in items)

    if total_weight <= 0:
        return None

    number = calculate_case_roll(
        server_seed=server_seed,
        client_seed=client_seed,
        nonce=nonce,
    )

    roll = number % total_weight
    current = 0

    for item in items:
        current += item.weight

        if roll < current:
            return item

    return items[-1]


def create_server_seed():
    return secrets.token_hex(32)


def hash_server_seed(server_seed):
    return hashlib.sha256(server_seed.encode()).hexdigest()


def get_next_nonce(user):
    latest_bet = Bet.objects.filter(user=user).order_by("-id").first()

    if latest_bet is None:
        return 1

    return latest_bet.nonce + 1


def calculate_coinflip_result(server_seed, client_seed, nonce):
    message = f"{client_seed}:{nonce}"

    digest = hmac.new(
        server_seed.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    number = int(digest[:8], 16)

    if number % 2 == 0:
        return "heads"

    return "tails"


class CoinflipBetView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = CoinflipBetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        choice = serializer.validated_data["choice"]
        amount = serializer.validated_data["amount"]
        client_seed = serializer.validated_data["client_seed"]

        wallet, _created = Wallet.objects.select_for_update().get_or_create(
            user=request.user
        )

        if wallet.balance < amount:
            return Response(
                {"error": "Insufficient balance."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        server_seed = create_server_seed()
        server_seed_hash = hash_server_seed(server_seed)
        nonce = get_next_nonce(request.user)

        result = calculate_coinflip_result(
            server_seed=server_seed,
            client_seed=client_seed,
            nonce=nonce,
        )

        won = choice == result
        payout = Decimal("0.00")

        wallet.balance -= amount

        Transaction.objects.create(
            user=request.user,
            amount=-amount,
            transaction_type="bet",
            description=f"Coinflip bet: {choice}",
            balance_after=wallet.balance,
        )

        if won:
            payout = amount * PAYOUT_MULTIPLIER
            wallet.balance += payout

            Transaction.objects.create(
                user=request.user,
                amount=payout,
                transaction_type="win",
                description=f"Coinflip win: {result}",
                balance_after=wallet.balance,
            )

        wallet.save(update_fields=["balance", "updated_at"])

        bet = Bet.objects.create(
            user=request.user,
            game_type="coinflip",
            choice=choice,
            result=result,
            amount=amount,
            payout=payout,
            won=won,
            metadata={
                "choice": choice,
                "result": result,
                "payout_multiplier": str(PAYOUT_MULTIPLIER),
            },
            server_seed=server_seed,
            server_seed_hash=server_seed_hash,
            client_seed=client_seed,
            nonce=nonce,
        )

        return Response(
            {
                "message": "Bet placed successfully.",
                "bet": BetSerializer(bet).data,
                "balance": str(wallet.balance),
            },
            status=status.HTTP_201_CREATED,
        )
    
class RouletteBetView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = RouletteBetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        choice = serializer.validated_data["choice"]
        amount = serializer.validated_data["amount"]
        client_seed = serializer.validated_data["client_seed"]

        wallet, _created = Wallet.objects.select_for_update().get_or_create(
            user=request.user
        )

        if wallet.balance < amount:
            return Response(
                {"error": "Insufficient balance."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        server_seed = create_server_seed()
        server_seed_hash = hash_server_seed(server_seed)
        nonce = get_next_nonce(request.user)

        roulette_result = calculate_roulette_result(
            server_seed=server_seed,
            client_seed=client_seed,
            nonce=nonce,
        )

        result = roulette_result["result"]
        won = choice == result
        multiplier = get_roulette_multiplier(choice)
        payout = Decimal("0.00")

        wallet.balance -= amount

        Transaction.objects.create(
            user=request.user,
            amount=-amount,
            transaction_type="bet",
            description=f"Roulette bet: {choice}",
            balance_after=wallet.balance,
        )

        if won:
            payout = amount * multiplier
            wallet.balance += payout

            Transaction.objects.create(
                user=request.user,
                amount=payout,
                transaction_type="win",
                description=f"Roulette win: {result}",
                balance_after=wallet.balance,
            )

        wallet.save(update_fields=["balance", "updated_at"])

        bet = Bet.objects.create(
            user=request.user,
            game_type="roulette",
            choice=choice,
            result=result,
            amount=amount,
            payout=payout,
            won=won,
            metadata={
                "choice": choice,
                "result": result,
                "slot": roulette_result["slot"],
                "label": roulette_result["label"],
                "payout_multiplier": str(multiplier),
                "rules": {
                    "layout": "green at slot 0, CT on odd slots, T on even slots",
                    "ct_slots": 7,
                    "t_slots": 7,
                    "green_slots": 1,
                    "total_slots": 15,
                },
            },
            server_seed=server_seed,
            server_seed_hash=server_seed_hash,
            client_seed=client_seed,
            nonce=nonce,
        )

        return Response(
            {
                "message": "Roulette bet placed successfully.",
                "bet": BetSerializer(bet).data,
                "balance": str(wallet.balance),
            },
            status=status.HTTP_201_CREATED,
        )


class BetHistoryView(ListAPIView):
    serializer_class = BetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Bet.objects.filter(user=self.request.user)

        result = self.request.query_params.get("result")
        game_type = self.request.query_params.get("game_type")

        if result == "won":
            queryset = queryset.filter(won=True)

        if result == "lost":
            queryset = queryset.filter(won=False)

        if game_type in ["coinflip", "roulette", "case_opening"]:
            queryset = queryset.filter(game_type=game_type)

        return queryset


class BetDetailView(RetrieveAPIView):
    serializer_class = BetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bet.objects.filter(user=self.request.user)


class ProfileStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bets = Bet.objects.filter(user=request.user)

        total_bets = bets.count()
        total_wins = bets.filter(won=True).count()
        total_losses = bets.filter(won=False).count()

        total_wagered = bets.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        total_payout = bets.aggregate(total=Sum("payout"))["total"] or Decimal("0.00")

        win_rate = 0

        if total_bets > 0:
            win_rate = round((total_wins / total_bets) * 100, 2)

        return Response(
            {
                "total_bets": total_bets,
                "total_wins": total_wins,
                "total_losses": total_losses,
                "total_wagered": str(total_wagered),
                "total_payout": str(total_payout),
                "win_rate": win_rate,
            }
        )

class CaseListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CaseSerializer

    def get_queryset(self):
        return Case.objects.filter(is_active=True).prefetch_related("items")


class CaseOpenView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        serializer = CaseOpenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client_seed = serializer.validated_data["client_seed"]

        try:
            case = Case.objects.prefetch_related("items").get(
                pk=pk,
                is_active=True,
            )
        except Case.DoesNotExist:
            return Response(
                {"error": "Case not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        wallet, _created = Wallet.objects.select_for_update().get_or_create(
            user=request.user
        )

        if wallet.balance < case.price:
            return Response(
                {"error": "Insufficient balance."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        server_seed = create_server_seed()
        server_seed_hash = hash_server_seed(server_seed)
        nonce = get_next_nonce(request.user)

        selected_item = pick_case_item(
            case=case,
            server_seed=server_seed,
            client_seed=client_seed,
            nonce=nonce,
        )

        if selected_item is None:
            return Response(
                {"error": "This case has no items."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wallet.balance -= case.price

        Transaction.objects.create(
            user=request.user,
            amount=-case.price,
            transaction_type="bet",
            description=f"Opened case: {case.name}",
            balance_after=wallet.balance,
        )

        item_value = selected_item.demo_value
        won = item_value >= case.price

        items_snapshot = [
            {
                "id": item.id,
                "name": item.name,
                "rarity": item.rarity,
                "demo_value": str(item.demo_value),
                "weight": item.weight,
                "image_path": item.image_path,
            }
            for item in case.items.all()
        ]

        bet = Bet.objects.create(
            user=request.user,
            game_type="case_opening",
            choice=case.name,
            result=selected_item.name,
            amount=case.price,
            payout=item_value,
            won=won,
            metadata={
                "case_id": case.id,
                "case_name": case.name,
                "case_price": str(case.price),
                "item_id": selected_item.id,
                "item_name": selected_item.name,
                "rarity": selected_item.rarity,
                "item_value": str(selected_item.demo_value),
                "image_path": selected_item.image_path,
                "profit": str(selected_item.demo_value - case.price),
                "payout_multiplier": str(
                    selected_item.demo_value / case.price
                ),
                "items_snapshot": items_snapshot,
            },
            server_seed=server_seed,
            server_seed_hash=server_seed_hash,
            client_seed=client_seed,
            nonce=nonce,
        )

        inventory_item = InventoryItem.objects.create(
            user=request.user,
            case=case,
            item=selected_item,
            bet=bet,
            acquired_value=selected_item.demo_value,
        )

        wallet.save(update_fields=["balance", "updated_at"])

        return Response(
            {
                "message": "Case opened successfully.",
                "bet": BetSerializer(bet).data,
                "inventory_item": InventoryItemSerializer(inventory_item).data,
                "balance": str(wallet.balance),
            },
            status=status.HTTP_201_CREATED,
        )


class InventoryListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InventoryItemSerializer

    def get_queryset(self):
        return (
            InventoryItem.objects.filter(user=self.request.user)
            .select_related("case", "item", "bet")
            .order_by("-created_at")
        )


class SellInventoryItemView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            inventory_item = (
                InventoryItem.objects.select_for_update()
                .select_related("item", "case")
                .get(
                    pk=pk,
                    user=request.user,
                )
            )
        except InventoryItem.DoesNotExist:
            return Response(
                {"error": "Inventory item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if inventory_item.status == "sold":
            return Response(
                {"error": "Item is already sold."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wallet, _created = Wallet.objects.select_for_update().get_or_create(
            user=request.user
        )

        sell_value = inventory_item.item.demo_value

        wallet.balance += sell_value
        wallet.save(update_fields=["balance", "updated_at"])

        inventory_item.status = "sold"
        inventory_item.sold_value = sell_value
        inventory_item.sold_at = timezone.now()
        inventory_item.save(
            update_fields=[
                "status",
                "sold_value",
                "sold_at",
            ]
        )

        Transaction.objects.create(
            user=request.user,
            amount=sell_value,
            transaction_type="win",
            description=f"Sold item: {inventory_item.item.name}",
            balance_after=wallet.balance,
        )

        return Response(
            {
                "message": "Item sold successfully.",
                "inventory_item": InventoryItemSerializer(inventory_item).data,
                "balance": str(wallet.balance),
            }
        )
    
class ActivityFeedView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ActivityFeedBetSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Bet.objects.select_related("user")
            .order_by("-created_at")[:20]
        )
    
class CaseStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        inventory_items = (
            InventoryItem.objects.filter(user=request.user)
            .select_related("item", "case")
        )

        case_bets = Bet.objects.filter(
            user=request.user,
            game_type="case_opening",
        )

        active_items = inventory_items.filter(status="active")
        sold_items = inventory_items.filter(status="sold")

        active_value = (
            active_items.aggregate(total=Sum("acquired_value"))["total"] or Decimal("0.00")
        )

        sold_value = (
            sold_items.aggregate(total=Sum("sold_value"))["total"] or Decimal("0.00")
        )

        rarity_counts = {
            "common": 0,
            "rare": 0,
            "epic": 0,
            "legendary": 0,
        }

        rarity_rows = (
            inventory_items.values("item__rarity")
            .annotate(total=Count("id"))
            .order_by()
        )

        for row in rarity_rows:
            rarity = row["item__rarity"]

            if rarity in rarity_counts:
                rarity_counts[rarity] = row["total"]

        best_item = (
            inventory_items.order_by("-acquired_value", "-created_at").first()
        )

        return Response(
            {
                "cases_opened": case_bets.count(),
                "inventory_items": inventory_items.count(),
                "active_items": active_items.count(),
                "sold_items": sold_items.count(),
                "active_value": str(active_value),
                "sold_value": str(sold_value),
                "total_item_value": str(active_value + sold_value),
                "rarity_counts": rarity_counts,
                "best_item": {
                    "name": best_item.item.name,
                    "rarity": best_item.item.rarity,
                    "value": str(best_item.acquired_value),
                    "case_name": best_item.case.name if best_item.case else None,
                    "image_path": best_item.item.image_path,
                }
                if best_item
                else None,
            }
        )