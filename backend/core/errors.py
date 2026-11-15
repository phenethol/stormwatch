class ApiError(Exception):
    def __init__(self, status_code: int, detail: str, code: str | None = None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.code = code

    def body(self) -> dict:
        body = {"detail": self.detail}
        if self.code:
            body["code"] = self.code
        return body
