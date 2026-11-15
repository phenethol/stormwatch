from django.db.models import Q

from core.models import ReportState

VOTABLE_STATES = (ReportState.PENDING, ReportState.CONFIRMED)


def is_admin(user):
    return user.is_authenticated and (user.is_staff or user.is_superuser)


def visible_reports(queryset, user):
    if is_admin(user):
        return queryset
    if user.is_authenticated:
        return queryset.filter(Q(state__in=VOTABLE_STATES) | Q(author=user))
    return queryset.filter(state=ReportState.CONFIRMED)
