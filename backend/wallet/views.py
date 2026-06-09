from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from games.models import Bet

from .models import Transaction, Wallet
from .serializers import (
    LeaderboardWalletSerializer,
    TransactionSerializer,
    WalletSerializer,
)


STARTING_BALANCE = Decimal("1000.00")
DAILY_BONUS_AMOUNT = Decimal("250.00")


class WalletDetailView(RetrieveAPIView):
    serializer_class = WalletSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        wallet, _created = Wallet.objects.get_or_create(user=self.request.user)
        return wallet


class TransactionListView(ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user)

        transaction_type = self.request.query_params.get("type")

        allowed_types = [
            "bonus",
            "daily_bonus",
            "bet",
            "win",
            "refund",
        ]

        if transaction_type in allowed_types:
            queryset = queryset.filter(transaction_type=transaction_type)

        return queryset


class ClaimDailyBonusView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        wallet, _created = Wallet.objects.select_for_update().get_or_create(
            user=request.user
        )

        now = timezone.now()

        if wallet.last_daily_bonus_claimed_at:
            last_claim_date = timezone.localtime(
                wallet.last_daily_bonus_claimed_at
            ).date()
            today = timezone.localtime(now).date()

            if last_claim_date == today:
                return Response(
                    {
                        "error": "Daily bonus already claimed today.",
                        "balance": str(wallet.balance),
                        "last_daily_bonus_claimed_at": wallet.last_daily_bonus_claimed_at,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        wallet.balance += DAILY_BONUS_AMOUNT
        wallet.last_daily_bonus_claimed_at = now
        wallet.save(
            update_fields=[
                "balance",
                "last_daily_bonus_claimed_at",
                "updated_at",
            ]
        )

        Transaction.objects.create(
            user=request.user,
            amount=DAILY_BONUS_AMOUNT,
            transaction_type="daily_bonus",
            description="Daily demo bonus",
            balance_after=wallet.balance,
        )

        return Response(
            {
                "message": "Daily bonus claimed.",
                "amount": str(DAILY_BONUS_AMOUNT),
                "balance": str(wallet.balance),
                "last_daily_bonus_claimed_at": wallet.last_daily_bonus_claimed_at,
            },
            status=status.HTTP_200_OK,
        )


class LeaderboardView(ListAPIView):
    serializer_class = LeaderboardWalletSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Wallet.objects.select_related("user").order_by("-balance")[:10]


class ResetDemoAccountView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        wallet, _created = Wallet.objects.select_for_update().get_or_create(
            user=request.user
        )

        Bet.objects.filter(user=request.user).delete()
        Transaction.objects.filter(user=request.user).delete()

        wallet.balance = STARTING_BALANCE
        wallet.last_daily_bonus_claimed_at = None
        wallet.save(
            update_fields=[
                "balance",
                "last_daily_bonus_claimed_at",
                "updated_at",
            ]
        )

        Transaction.objects.create(
            user=request.user,
            amount=STARTING_BALANCE,
            transaction_type="bonus",
            description="Demo account reset",
            balance_after=wallet.balance,
        )

        return Response(
            {
                "message": "Demo account reset successfully.",
                "balance": str(wallet.balance),
            },
            status=status.HTTP_200_OK,
        )