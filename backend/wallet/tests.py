from decimal import Decimal

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Transaction, Wallet


class WalletSignalTests(APITestCase):
    def test_wallet_is_created_for_new_user(self):
        user = User.objects.create_user(
            username="wallettest",
            email="wallettest@example.com",
            password="password123",
        )

        wallet = Wallet.objects.get(user=user)

        self.assertEqual(wallet.balance, Decimal("1000.00"))

    def test_starting_bonus_transaction_is_created_for_new_user(self):
        user = User.objects.create_user(
            username="bonustest",
            email="bonustest@example.com",
            password="password123",
        )

        transaction = Transaction.objects.get(
            user=user,
            transaction_type="bonus",
        )

        self.assertEqual(transaction.amount, Decimal("1000.00"))
        self.assertEqual(transaction.balance_after, Decimal("1000.00"))


class WalletAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="apitest",
            email="apitest@example.com",
            password="password123",
        )
        self.client.force_authenticate(user=self.user)

    def test_get_wallet(self):
        response = self.client.get("/api/wallet/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["balance"], "1000.00")

    def test_get_transactions(self):
        response = self.client.get("/api/wallet/transactions/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["transaction_type"], "bonus")

    def test_claim_daily_bonus_once(self):
        response = self.client.post("/api/wallet/daily-bonus/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["amount"], "250.00")
        self.assertEqual(response.data["balance"], "1250.00")

        wallet = Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.balance, Decimal("1250.00"))

    def test_cannot_claim_daily_bonus_twice_same_day(self):
        first_response = self.client.post("/api/wallet/daily-bonus/")
        second_response = self.client.post("/api/wallet/daily-bonus/")

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 400)
        self.assertEqual(
            second_response.data["error"],
            "Daily bonus already claimed today.",
        )

    def test_reset_demo_account(self):
        self.client.post("/api/wallet/daily-bonus/")

        response = self.client.post("/api/wallet/reset-demo/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["balance"], "1000.00")

        wallet = Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.balance, Decimal("1000.00"))

        transactions = Transaction.objects.filter(user=self.user)
        self.assertEqual(transactions.count(), 1)
        self.assertEqual(transactions.first().description, "Demo account reset")
    
    def test_filter_transactions_by_type(self):
        self.client.post("/api/wallet/daily-bonus/")

        response = self.client.get("/api/wallet/transactions/?type=daily_bonus")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
        response.data["results"][0]["transaction_type"],
        "daily_bonus",
    )
