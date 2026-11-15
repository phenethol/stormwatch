

# Register your models here.
from django.contrib import admin

from .models import FetchStatus, Measurement, Station


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ("name", "lat", "lon", "automatic", "latest_measurement")
    search_fields = ("name",)
    raw_id_fields = ("latest_measurement",)


@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ("station", "measured_at", "temperature_c", "wind_speed_ms", "wind_direction")
    list_filter = ("measured_at",)
    search_fields = ("station__name",)


@admin.register(FetchStatus)
class FetchStatusAdmin(admin.ModelAdmin):
    list_display = ("source", "last_status", "last_attempt_at", "last_success_at")
    readonly_fields = ("last_attempt_at", "last_success_at", "last_status", "last_error")