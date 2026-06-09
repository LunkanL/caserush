from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from wallet.models import Transaction, Wallet

from .models import Bet


class CoinflipAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="gametest",
            email="gametest@example.com",
            password="password123",
        )
        self.client.force_authenticate(user=self.user)

    def test_coinflip_creates_bet(self):
        response = self.client.post(
            "/api/games/coinflip/bet/",
            {
                "choice": "heads",
                "amount": "100.00",
                "client_seed": "test-seed",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Bet.objects.filter(user=self.user).count(), 1)

        bet = Bet.objects.get(user=self.user)

        self.assertEqual(bet.choice, "heads")
        self.assertEqual(bet.game_type, "coinflip")
        self.assertEqual(bet.metadata["choice"], "heads")
        self.assertEqual(bet.metadata["payout_multiplier"], "1.90")
        self.assertEqual(bet.amount, Decimal("100.00"))
        self.assertIn(bet.result, ["heads", "tails"])
        self.assertTrue(bet.server_seed)
        self.assertTrue(bet.server_seed_hash)
        self.assertEqual(bet.client_seed, "test-seed")
        self.assertEqual(bet.nonce, 1)

    def test_coinflip_updates_wallet_balance(self):
        starting_balance = Wallet.objects.get(user=self.user).balance

        response = self.client.post(
            "/api/games/coinflip/bet/",
            {
                "choice": "heads",
                "amount": "100.00",
                "client_seed": "test-seed",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        wallet = Wallet.objects.get(user=self.user)

        # If user loses: 1000 - 100 = 900
        # If user wins: 1000 - 100 + 190 = 1090
        self.assertIn(wallet.balance, [Decimal("900.00"), Decimal("1090.00")])
        self.assertNotEqual(wallet.balance, starting_balance)

    def test_coinflip_creates_transactions(self):
        response = self.client.post(
            "/api/games/coinflip/bet/",
            {
                "choice": "heads",
                "amount": "100.00",
                "client_seed": "test-seed",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        transactions = Transaction.objects.filter(user=self.user)

        self.assertGreaterEqual(transactions.count(), 2)

        bet_transaction = transactions.filter(transaction_type="bet").first()
        self.assertIsNotNone(bet_transaction)
        self.assertEqual(bet_transaction.amount, Decimal("-100.00"))

    def test_cannot_bet_more_than_balance(self):
        response = self.client.post(
            "/api/games/coinflip/bet/",
            {
                "choice": "heads",
                "amount": "2000.00",
                "client_seed": "test-seed",
            },
            format="json",
        )

        # This hits max bet validation first because max bet is 1000.
        self.assertEqual(response.status_code, 400)
        self.assertIn("amount", response.data)

    def test_cannot_bet_less_than_minimum(self):
        response = self.client.post(
            "/api/games/coinflip/bet/",
            {
                "choice": "heads",
                "amount": "0.50",
                "client_seed": "test-seed",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("amount", response.data)

    def test_bet_history_only_shows_current_users_bets(self):
        other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="password123",
        )

        Bet.objects.create(
            user=self.user,
            choice="heads",
            result="heads",
            amount=Decimal("100.00"),
            payout=Decimal("190.00"),
            won=True,
            server_seed="server-seed-1",
            server_seed_hash="server-seed-hash-1",
            client_seed="client-seed-1",
            nonce=1,
        )

        Bet.objects.create(
            user=other_user,
            choice="tails",
            result="tails",
            amount=Decimal("100.00"),
            payout=Decimal("190.00"),
            won=True,
            server_seed="server-seed-2",
            server_seed_hash="server-seed-hash-2",
            client_seed="client-seed-2",
            nonce=1,
        )

        response = self.client.get("/api/games/bets/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["choice"], "heads")

    def test_profile_stats(self):
        Bet.objects.create(
            user=self.user,
            choice="heads",
            result="heads",
            amount=Decimal("100.00"),
            payout=Decimal("190.00"),
            won=True,
            server_seed="server-seed-1",
            server_seed_hash="server-seed-hash-1",
            client_seed="client-seed-1",
            nonce=1,
        )

        Bet.objects.create(
            user=self.user,
            choice="heads",
            result="tails",
            amount=Decimal("50.00"),
            payout=Decimal("0.00"),
            won=False,
            server_seed="server-seed-2",
            server_seed_hash="server-seed-hash-2",
            client_seed="client-seed-2",
            nonce=2,
        )

        response = self.client.get("/api/games/profile-stats/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_bets"], 2)
        self.assertEqual(response.data["total_wins"], 1)
        self.assertEqual(response.data["total_losses"], 1)
        self.assertEqual(response.data["total_wagered"], "150")
        self.assertEqual(response.data["total_payout"], "190")
        self.assertEqual(response.data["win_rate"], 50.0)
    
    def test_filter_bets_by_result(self):
        Bet.objects.create(
            user=self.user,
            choice="heads",
            result="heads",
            amount=Decimal("100.00"),
            payout=Decimal("190.00"),
            won=True,
            server_seed="server-seed-1",
            server_seed_hash="server-seed-hash-1",
            client_seed="client-seed-1",
            nonce=1,
        )

        Bet.objects.create(
            user=self.user,
            choice="tails",
            result="heads",
            amount=Decimal("50.00"),
            payout=Decimal("0.00"),
            won=False,
            server_seed="server-seed-2",
            server_seed_hash="server-seed-hash-2",
            client_seed="client-seed-2",
            nonce=2,
        )

        response = self.client.get("/api/games/bets/?result=won")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["won"], True)