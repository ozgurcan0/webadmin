import asyncio
import base64
import json
import logging
import pyautogui
from PIL import Image
import io
import mss
import keyboard
import mouse
from secure_connection import SecureConnection

class RemoteControl:
    def __init__(self, server_url, encryption_key):
        self.logger = logging.getLogger(__name__)
        self.connection = SecureConnection(server_url, encryption_key)
        self.stream_settings = {
            'quality': 80,
            'scale': 1.0
        }
        self.sct = mss.mss()
        self.running = False
        
        # Disable pyautogui safety features for remote control
        pyautogui.FAILSAFE = False
        
    async def start(self):
        """Start the remote control session"""
        if await self.connection.connect():
            self.running = True
            await asyncio.gather(
                self.keep_alive(),
                self.handle_messages()
            )

    async def stop(self):
        """Stop the remote control session"""
        self.running = False
        await self.connection.disconnect()

    async def keep_alive(self):
        """Keep the connection alive with periodic pings"""
        while self.running:
            try:
                await self.connection.send_message({"type": "ping"})
                await asyncio.sleep(30)
            except Exception as e:
                self.logger.error(f"Keep-alive error: {e}")
                break

    async def handle_messages(self):
        """Handle incoming messages from the server"""
        while self.running:
            try:
                message = await self.connection.receive_message()
                await self.process_message(message)
            except Exception as e:
                self.logger.error(f"Message handling error: {e}")
                break

    async def process_message(self, message):
        """Process received messages based on their action type"""
        action = message.get('action')
        if action == 'start_stream':
            self.stream_settings.update(message.get('settings', {}))
            asyncio.create_task(self.stream_screen())
        elif action == 'stop_stream':
            self.running = False
        elif action == 'mouse_event':
            await self.handle_mouse_event(message)
        elif action == 'keyboard_event':
            await self.handle_keyboard_event(message)
        elif action == 'update_stream_settings':
            self.stream_settings.update(message.get('settings', {}))

    async def stream_screen(self):
        """Capture and stream screen to the server"""
        while self.running:
            try:
                # Capture the primary monitor
                screen = self.sct.grab(self.sct.monitors[1])
                
                # Convert to PIL Image
                img = Image.frombytes('RGB', screen.size, screen.rgb)
                
                # Apply scaling if needed
                if self.stream_settings['scale'] != 1.0:
                    new_size = tuple(int(dim * self.stream_settings['scale']) for dim in img.size)
                    img = img.resize(new_size, Image.LANCZOS)

                # Encode image with quality setting
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=self.stream_settings['quality'])
                buffer = buffer.getvalue()
                
                # Convert to base64
                img_base64 = base64.b64encode(buffer).decode()

                # Send frame to server
                await self.connection.send_message({
                    'type': 'screen_frame',
                    'data': img_base64,
                    'width': img.shape[1],
                    'height': img.shape[0]
                })

                # Control frame rate based on quality
                delay = max(1.0 / 30, 1.0 - (self.stream_settings['quality'] / 100))
                await asyncio.sleep(delay)

            except Exception as e:
                self.logger.error(f"Screen streaming error: {e}")
                await asyncio.sleep(1)  # Prevent rapid retries on error

    async def handle_mouse_event(self, event):
        """Handle mouse events from the client"""
        try:
            event_type = event['event_type']
            x = int(event['x'] * pyautogui.size()[0])
            y = int(event['y'] * pyautogui.size()[1])

            if event_type == 'mousedown':
                mouse.press(button='left')
            elif event_type == 'mouseup':
                mouse.release(button='left')
            elif event_type == 'mousemove':
                mouse.move(x, y)
            elif event_type == 'contextmenu':
                mouse.click(button='right')

        except Exception as e:
            self.logger.error(f"Mouse event error: {e}")

    async def handle_keyboard_event(self, event):
        """Handle keyboard events from the client"""
        try:
            key = event['key']
            event_type = event['event_type']
            modifiers = event.get('modifiers', [])

            # Handle modifier keys
            for mod in modifiers:
                keyboard.press(mod)

            if event_type == 'keydown':
                keyboard.press(key)
            elif event_type == 'keyup':
                keyboard.release(key)

            # Release modifier keys
            for mod in modifiers:
                keyboard.release(mod)

        except Exception as e:
            self.logger.error(f"Keyboard event error: {e}")

if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    
    # Load environment variables
    load_dotenv()
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Get configuration from environment
    server_url = os.getenv('REMOTE_SERVER_URL', 'wss://localhost:3000/remote')
    encryption_key = os.getenv('ENCRYPTION_KEY', 'default-key')
    
    # Create and start remote control
    remote = RemoteControl(server_url, encryption_key)
    
    try:
        asyncio.run(remote.start())
    except KeyboardInterrupt:
        print("Shutting down remote control...")
