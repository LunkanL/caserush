import csv
from decimal import Decimal

from django.contrib import admin, messages
from django.http import HttpResponse

from .models import Wallet, Transaction


def export_transactions_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="transactions.csv"'

    writer = csv.writer(response)

    writer.writerow([
        "ID",
        "Username",
        "Email",
        "Type",
        "Amount",
        "Balance After",
        "Description",
        "Created At",
    ])

    for transaction in queryset.select_related("user"):
        writer.writerow([
            transaction.id,
            transaction.user.username,
            transaction.user.email,
            transaction.transaction_type,
            transaction.amount,
            transaction.balance_after,
            transaction.description,
            transaction.created_at,
        ])

    return response


export_transactions_csv.short_description = "Export selected transactions as CSV"


@admin.action(description="Add 1000 demo coins to selected wallets")
def add_1000_demo_coins(modeladmin, request, queryset):
    amount = Decimal("1000.00")
    updated_count = 0

    for wallet in queryset.select_related("user"):
        wallet.balance += amount
        wallet.save(update_fields=["balance", "updated_at"])

        Transaction.objects.create(
            user=wallet.user,
            amount=amount,
            transaction_type="bonus",
            description="Admin bonus: 1000 demo coins",
            balance_after=wallet.balance,
        )

        updated_count += 1

    messages.success(
        request,
        f"Added 1000 demo coins to {updated_count} wallet(s).",
    )


@admin.action(description="Reset selected wallets to 1000 demo coins")
def reset_selected_wallets(modeladmin, request, queryset):
    starting_balance = Decimal("1000.00")
    updated_count = 0

    for wallet in queryset.select_related("user"):
        wallet.balance = starting_balance
        wallet.last_daily_bonus_claimed_at = None
        wallet.save(
            update_fields=[
                "balance",
                "last_daily_bonus_claimed_at",
                "updated_at",
            ]
        )

        Transaction.objects.create(
            user=wallet.user,
            amount=starting_balance,
            transaction_type="bonus",
            description="Admin wallet reset to 1000 demo coins",
            balance_after=wallet.balance,
        )

        updated_count += 1

    messages.success(
        request,
        f"Reset {updated_count} wallet(s) to 1000 demo coins.",
    )


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "user_email",
        "balance",
        "last_daily_bonus_claimed_at",
        "created_at",
        "updated_at",
    ]
    search_fields = [
        "user__username",
        "user__email",
    ]
    list_filter = [
        "created_at",
        "updated_at",
        "last_daily_bonus_claimed_at",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    actions = [
        add_1000_demo_coins,
        reset_selected_wallets,
    ]

    def user_email(self, obj):
        return obj.user.email

    user_email.short_description = "Email"


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "user_email",
        "transaction_type",
        "amount",
        "balance_after",
        "description",
        "created_at",
    ]
    search_fields = [
        "user__username",
        "user__email",
        "description",
    ]
    list_filter = [
        "transaction_type",
        "created_at",
    ]
    readonly_fields = [
        "user",
        "amount",
        "transaction_type",
        "description",
        "balance_after",
        "created_at",
    ]
    date_hierarchy = "created_at"
    actions = [
        export_transactions_csv,
    ]

    def user_email(self, obj):
        return obj.user.email

    user_email.short_description = "Email"