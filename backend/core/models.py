from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    bio = models.CharField(max_length=300, blank=True)
    reputation = models.IntegerField(default=0)
    # Kada je korisnik pri prvoj prijavi potvrdio obavijest o privatnosti
    privacy_accepted_at = models.DateTimeField(null=True, blank=True)