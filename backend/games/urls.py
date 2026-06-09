from django.urls import path

from .views import (
    ActivityFeedView,
    BetDetailView,
    BetHistoryView,
    CaseListView,
    CaseOpenView,
    CaseStatsView,
    CoinflipBetView,
    InventoryListView,
    ProfileStatsView,
    RouletteBetView,
    SellInventoryItemView,
)


urlpatterns = [
    path("coinflip/bet/", CoinflipBetView.as_view(), name="coinflip-bet"),
    path("roulette/bet/", RouletteBetView.as_view(), name="roulette-bet"),
    path("bets/", BetHistoryView.as_view(), name="bet-history"),
    path("bets/<int:pk>/", BetDetailView.as_view(), name="bet-detail"),
    path("profile-stats/", ProfileStatsView.as_view(), name="profile-stats"),
    path("cases/", CaseListView.as_view(), name="case-list"),
    path("cases/<int:pk>/open/", CaseOpenView.as_view(), name="case-open"),
    path("inventory/", InventoryListView.as_view(), name="inventory-list"),
    path(
        "inventory/<int:pk>/sell/",
        SellInventoryItemView.as_view(),
        name="inventory-sell",
    ),
    path("activity-feed/", ActivityFeedView.as_view(), name="activity-feed"),
    path("case-stats/", CaseStatsView.as_view(), name="case-stats"),
]