import json
from pathlib import Path

from django.core.management.base import BaseCommand

from perfumes.models import Perfume

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "fixtures" / "perfumes.json"


class Command(BaseCommand):
    help = "Load the real Velora Fragrances products into MySQL."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing Perfume rows before seeding.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = Perfume.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} existing perfumes."))

        with open(DATA_FILE, encoding="utf-8") as f:
            products = json.load(f)

        created = 0
        updated = 0
        for item in products:
            obj, was_created = Perfume.objects.update_or_create(
                name=item["name"],
                defaults={
                    "category": item["category"],
                    "description": item["description"],
                    "notes": item.get("notes", ""),
                    "price": item["price"],
                    "image": item["image"],
                    "is_bestseller": item.get("is_bestseller", False),
                },
            )
            created += was_created
            updated += not was_created

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(products)} perfumes ({created} created, {updated} updated)."
            )
        )
