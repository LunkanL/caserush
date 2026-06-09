from django.urls import path

from .views import (
    ClaimDailyBonusView,
    LeaderboardView,
    ResetDemoAccountView,
    TransactionListView,
    WalletDetailView,
)


urlpatterns = [
    path("", WalletDetailView.as_view(), name="wallet-detail"),
    path("transactions/", TransactionListView.as_view(), name="transaction-list"),
    path("daily-bonus/", ClaimDailyBonusView.as_view(), name="claim-daily-bonus"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
    path("reset-demo/", ResetDemoAccountView.as_view(), name="reset-demo-account"),
]