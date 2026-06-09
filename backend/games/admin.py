import csv

from django.contrib import admin
from django.http import HttpResponse

from .models import Bet, Case, CaseItem, InventoryItem


def export_bets_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="bets.csv"'

    writer = csv.writer(response)

    writer.writerow([
        "ID",
        "Username",
        "Email",
        "Game Type",
        "Choice",
        "Result",
        "Amount",
        "Payout",
        "Won",
        "Metadata",
        "Client Seed",
        "Nonce",
        "Created At",
    ])

    for bet in queryset.select_related("user"):
        writer.writerow([
            bet.id,
            bet.user.username,
            bet.user.email,
            bet.game_type,
            bet.choice,
            bet.result,
            bet.amount,
            bet.payout,
            bet.won,
            bet.metadata,
            bet.client_seed,
            bet.nonce,
            bet.created_at,
        ])

    return response


export_bets_csv.short_description = "Export selected bets as CSV"


@admin.register(Bet)
class BetAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "user_email",
        "game_type",
        "choice",
        "result",
        "amount",
        "payout",
        "net_result",
        "won",
        "nonce",
        "created_at",
    ]
    search_fields = [
        "user__username",
        "user__email",
        "game_type",
        "choice",
        "result",
        "client_seed",
        "metadata",
    ]
    list_filter = [
        "game_type",
        "choice",
        "result",
        "won",
        "created_at",
    ]
    readonly_fields = [
        "user",
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
    date_hierarchy = "created_at"
    actions = [
        export_bets_csv,
    ]

    def user_email(self, obj):
        return obj.user.email

    def net_result(self, obj):
        return obj.payout - obj.amount

    user_email.short_description = "Email"
    net_result.short_description = "Net"


class CaseItemInline(admin.TabularInline):
    model = CaseItem
    extra = 1
    fields = [
        "name",
        "rarity",
        "demo_value",
        "weight",
        "estimated_chance",
    ]
    readonly_fields = [
        "estimated_chance",
    ]

    def estimated_chance(self, obj):
        if not obj.pk or not obj.case_id:
            return "-"

        total_weight = sum(item.weight for item in obj.case.items.all())

        if total_weight <= 0:
            return "0%"

        chance = (obj.weight / total_weight) * 100
        return f"{chance:.2f}%"

    estimated_chance.short_description = "Chance"


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "name",
        "slug",
        "price",
        "item_count",
        "total_weight",
        "is_active",
        "created_at",
    ]
    search_fields = [
        "name",
        "slug",
        "description",
    ]
    list_filter = [
        "is_active",
        "created_at",
    ]
    prepopulated_fields = {
        "slug": ["name"],
    }
    inlines = [
        CaseItemInline,
    ]

    def item_count(self, obj):
        return obj.items.count()

    def total_weight(self, obj):
        return sum(item.weight for item in obj.items.all())

    item_count.short_description = "Items"
    total_weight.short_description = "Total Weight"


@admin.register(CaseItem)
class CaseItemAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "case",
        "name",
        "rarity",
        "demo_value",
        "weight",
        "estimated_chance",
        "created_at",
    ]
    search_fields = [
        "case__name",
        "name",
        "rarity",
    ]
    list_filter = [
        "case",
        "rarity",
        "created_at",
    ]

    def estimated_chance(self, obj):
        total_weight = sum(item.weight for item in obj.case.items.all())

        if total_weight <= 0:
            return "0%"

        chance = (obj.weight / total_weight) * 100
        return f"{chance:.2f}%"

    estimated_chance.short_description = "Chance"


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "user_email",
        "case",
        "item",
        "rarity",
        "status",
        "acquired_value",
        "sold_value",
        "profit_if_sold",
        "created_at",
        "sold_at",
    ]
    search_fields = [
        "user__username",
        "user__email",
        "case__name",
        "item__name",
    ]
    list_filter = [
        "status",
        "item__rarity",
        "case",
        "created_at",
        "sold_at",
    ]
    readonly_fields = [
        "user",
        "case",
        "item",
        "bet",
        "status",
        "acquired_value",
        "sold_value",
        "created_at",
        "sold_at",
    ]
    date_hierarchy = "created_at"

    def user_email(self, obj):
        return obj.user.email

    def rarity(self, obj):
        return obj.item.rarity

    def profit_if_sold(self, obj):
        if obj.status == "sold":
            return obj.sold_value - obj.acquired_value

        return obj.item.demo_value - obj.acquired_value

    user_email.short_description = "Email"
    rarity.short_description = "Rarity"
    profit_if_sold.short_description = "Profit"