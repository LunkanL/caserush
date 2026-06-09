from decimal import Decimal

from django.core.management.base import BaseCommand

from games.models import Case, CaseItem


class Command(BaseCommand):
    help = "Seed demo cases and case items"

    def handle(self, *args, **options):
        cases = [
            {
                "slug": "starter-case",
                "name": "Starter Case",
                "price": Decimal("100.00"),
                "description": "A low-cost demo case with mostly common items.",
                "items": [
                    {
                        "name": "Dusty Pistol",
                        "rarity": "common",
                        "demo_value": Decimal("50.00"),
                        "weight": 7000,
                        "image_path": "/items/dusty-pistol.png",
                    },
                    {
                        "name": "Blue Phantom Rifle",
                        "rarity": "rare",
                        "demo_value": Decimal("150.00"),
                        "weight": 2500,
                        "image_path": "/items/blue-phantom-rifle.png",
                    },
                    {
                        "name": "Crimson Ghost Knife",
                        "rarity": "epic",
                        "demo_value": Decimal("500.00"),
                        "weight": 450,
                        "image_path": "/items/crimson-ghost-knife.png",
                    },
                    {
                        "name": "Emerald Dragon AWP",
                        "rarity": "legendary",
                        "demo_value": Decimal("2000.00"),
                        "weight": 50,
                        "image_path": "/items/emerald-dragon-awp.png",
                    },
                ],
            },
            {
                "slug": "premium-case",
                "name": "Premium Case",
                "price": Decimal("250.00"),
                "description": "A mid-tier demo case with better rewards and higher variance.",
                "items": [
                    {
                        "name": "Carbon SMG",
                        "rarity": "common",
                        "demo_value": Decimal("100.00"),
                        "weight": 6200,
                        "image_path": "/items/carbon-smg.png",
                    },
                    {
                        "name": "Azure Burst M4",
                        "rarity": "rare",
                        "demo_value": Decimal("350.00"),
                        "weight": 3000,
                        "image_path": "/items/azure-burst-m4.png",
                    },
                    {
                        "name": "Ruby Fang Gloves",
                        "rarity": "epic",
                        "demo_value": Decimal("1200.00"),
                        "weight": 700,
                        "image_path": "/items/ruby-fang-gloves.png",
                    },
                    {
                        "name": "Golden Hydra Blade",
                        "rarity": "legendary",
                        "demo_value": Decimal("4000.00"),
                        "weight": 100,
                        "image_path": "/items/golden-hydra-blade.png",
                    },
                ],
            },
            {
                "slug": "high-roller-case",
                "name": "High Roller Case",
                "price": Decimal("750.00"),
                "description": "A high-risk demo case with expensive fake rewards.",
                "items": [
                    {
                        "name": "Midnight Deagle",
                        "rarity": "common",
                        "demo_value": Decimal("250.00"),
                        "weight": 5600,
                        "image_path": "/items/midnight-deagle.png",
                    },
                    {
                        "name": "Neon Tiger AK",
                        "rarity": "rare",
                        "demo_value": Decimal("900.00"),
                        "weight": 3300,
                        "image_path": "/items/neon-tiger-ak.png",
                    },
                    {
                        "name": "Violet Storm Karambit",
                        "rarity": "epic",
                        "demo_value": Decimal("3000.00"),
                        "weight": 950,
                        "image_path": "/items/violet-storm-karambit.png",
                    },
                    {
                        "name": "Diamond Phoenix AWP",
                        "rarity": "legendary",
                        "demo_value": Decimal("10000.00"),
                        "weight": 150,
                        "image_path": "/items/diamond-phoenix-awp.png",
                    },
                ],
            },
        ]

        for case_data in cases:
            case, _created = Case.objects.update_or_create(
                slug=case_data["slug"],
                defaults={
                    "name": case_data["name"],
                    "price": case_data["price"],
                    "description": case_data["description"],
                    "is_active": True,
                },
            )

            for item_data in case_data["items"]:
                CaseItem.objects.update_or_create(
                    case=case,
                    name=item_data["name"],
                    defaults={
                        "rarity": item_data["rarity"],
                        "demo_value": item_data["demo_value"],
                        "weight": item_data["weight"],
                        "image_path": item_data["image_path"],
                    },
                )

        self.stdout.write(
            self.style.SUCCESS("Demo cases seeded successfully.")
        )