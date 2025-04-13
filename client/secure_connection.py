import ssl
import json
import base64
import asyncio
import websockets
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

class SecureConnection:
    def __init__(self, server_url, encryption_key):
        self.server_url = server_url
        self.websocket = None
        self.connected = False
        self.logger = logging.getLogger(__name__)
        self._setup_encryption(encryption_key)

    def _setup_encryption(self, key):
        """Initialize encryption using provided key"""
        # Generate a secure key from the provided encryption key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'remote_desktop_salt',  # Fixed salt for key derivation
            iterations=100000,
            backend=default_backend()
        )
        key_bytes = key.encode()
        derived_key = base64.urlsafe_b64encode(kdf.derive(key_bytes))
        self.fernet = Fernet(derived_key)

    def encrypt_message(self, message):
        """Encrypt a message before sending"""
        try:
            message_bytes = json.dumps(message).encode()
            return self.fernet.encrypt(message_bytes)
        except Exception as e:
            self.logger.error(f"Encryption error: {str(e)}")
            raise

    def decrypt_message(self, encrypted_message):
        """Decrypt a received message"""
        try:
            decrypted_bytes = self.fernet.decrypt(encrypted_message)
            return json.loads(decrypted_bytes.decode())
        except Exception as e:
            self.logger.error(f"Decryption error: {str(e)}")
            raise

    async def connect(self):
        """Establish secure WebSocket connection"""
        try:
            # Create SSL context for secure connection
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False  # For development
            ssl_context.verify_mode = ssl.CERT_NONE  # For development

            self.websocket = await websockets.connect(
                self.server_url,
                ssl=ssl_context
            )
            self.connected = True
            self.logger.info("Secure connection established")
            return True
        except Exception as e:
            self.logger.error(f"Connection error: {str(e)}")
            self.connected = False
            return False

    async def disconnect(self):
        """Close the connection"""
        if self.websocket:
            await self.websocket.close()
            self.connected = False
            self.logger.info("Connection closed")

    async def send_message(self, message):
        """Send an encrypted message"""
        if not self.connected:
            raise ConnectionError("Not connected to server")

        try:
            encrypted_message = self.encrypt_message(message)
            await self.websocket.send(encrypted_message)
            return True
        except Exception as e:
            self.logger.error(f"Send error: {str(e)}")
            raise

    async def receive_message(self):
        """Receive and decrypt a message"""
        if not self.connected:
            raise ConnectionError("Not connected to server")

        try:
            encrypted_message = await self.websocket.recv()
            return self.decrypt_message(encrypted_message)
        except Exception as e:
            self.logger.error(f"Receive error: {str(e)}")
            raise

    async def keep_alive(self):
        """Send periodic keep-alive messages"""
        while self.connected:
            try:
                await self.send_message({"type": "ping"})
                await asyncio.sleep(30)  # Send ping every 30 seconds
            except Exception as e:
                self.logger.error(f"Keep-alive error: {str(e)}")
                break

    def is_connected(self):
        """Check if connection is active"""
        return self.connected