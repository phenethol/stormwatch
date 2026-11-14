from django.core.validators import RegexValidator

# Pravilo iz docs/api/openapi.yaml
username_validators = [
    RegexValidator(
        r"^[A-Za-z0-9_.-]{3,30}$",
        "Korisničko ime ima 3–30 znakova: slova bez dijakritika, brojke, _, točka i crtica.",
    )
]