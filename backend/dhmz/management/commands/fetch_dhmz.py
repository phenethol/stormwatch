from django.core.management.base import BaseCommand, CommandError

from dhmz.models import FetchStatus, Station
from dhmz.services import fetch_measurements


class Command(BaseCommand):
    help = "Odmah preuzima mjerenja DHMZ-a, bez čekanja intervala P-10."

    def handle(self, *args, **options):
        status = fetch_measurements()
        if status.last_status != FetchStatus.Result.SUCCESS:
            raise CommandError(f"Preuzimanje nije uspjelo: {status.last_error}")
        self.stdout.write(self.style.SUCCESS(f"Preuzeto. Postaja u bazi: {Station.objects.count()}"))