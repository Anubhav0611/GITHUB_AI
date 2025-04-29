import secrets

# Generate a 32-character (or longer) random string
secret_key = secrets.token_hex(32)
print(secret_key)