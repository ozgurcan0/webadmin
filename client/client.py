import asyncio
import json
import os
import platform
import psutil
import uuid
import websockets
import base64
from datetime import datetime
from PIL import Image
import io
from pynput.keyboard import Controller as KeyboardController
from pynput.mouse import Controller as MouseController
from cryptography.fernet import Fernet
import winreg
import ctypes
import signal
import shutil
import logging
import mss
from file_manager import FileManager
from remote_control import RemoteControl

class RemoteDesktopClient:
    def __init__(self):
        self.client_id = str(uuid.uuid4())
        self.keyboard = KeyboardController()
        self.mouse = MouseController()
        self.ws = None
        self.blocked_apps = set()
        self.file_manager = FileManager()
        self.remote_control = RemoteControl(
            os.getenv('REMOTE_SERVER_URL', 'ws://localhost:3002'),
            os.getenv('ENCRYPTION_KEY', 'default-key')
        )
        self.settings = {
            'monitoring': {
                'updateInterval': 5,
                'enableNotifications': True,
                'cpuThreshold': 80,
                'memoryThreshold': 80,
            },
            'security': {
                'encryptionEnabled': False,
                'logLevel': 'info',
                'autoBlockSuspicious': True,
            }
        }
        self.setup_logging()
        # Generate encryption key - in production this should be securely distributed
        self.key = Fernet.generate_key()
        self.cipher = Fernet(self.key)

    def setup_logging(self):
        log_levels = {
            'debug': logging.DEBUG,
            'info': logging.INFO,
            'warn': logging.WARNING,
            'error': logging.ERROR
        }
        logging.basicConfig(
            level=log_levels.get(self.settings['security']['logLevel'], logging.INFO),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            filename=f'remote_desktop_client_{self.client_id}.log'
        )
        self.logger = logging.getLogger(__name__)

    async def connect(self):
        while True:
            try:
                self.ws = await websockets.connect('ws://localhost:3002')
                await self.register()
                await self.message_loop()
            except Exception as e:
                print(f"Connection error: {e}")
                await asyncio.sleep(5)  # Wait before reconnecting

    async def register(self):
        message = {
            'type': 'register',
            'client_id': self.client_id,
            'system_info': self.get_system_info()
        }
        await self.ws.send(json.dumps(message))

    async def message_loop(self):
        try:
            while True:
                message = await self.ws.recv()
                data = json.loads(message)
                await self.handle_command(data)
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed")

    async def handle_command(self, data):
        command = data.get('command')
        response = {'type': 'response', 'client_id': self.client_id}

        try:
            if command == 'start_stream':
                settings = data.get('settings', {})
                self.remote_control.update_stream_settings(settings)
                self.remote_control.start_screen_stream(
                    lambda frame: asyncio.create_task(self.ws.send(json.dumps(frame)))
                )
                response['data'] = {'success': True}
            
            elif command == 'stop_stream':
                self.remote_control.stop_screen_stream()
                response['data'] = {'success': True}
            
            elif command == 'mouse_event':
                response['data'] = self.remote_control.handle_mouse_event(
                    data.get('event_type'),
                    data.get('x'),
                    data.get('y'),
                    data.get('button')
                )
            
            elif command == 'keyboard_event':
                response['data'] = self.remote_control.handle_keyboard_event(
                    data.get('event_type'),
                    data.get('key'),
                    data.get('modifiers')
                )
            
            elif command == 'take_screenshot':
                response['data'] = self.remote_control.take_screenshot()
            
            # ... existing command handlers ...
            elif command == 'update_settings':
                response['data'] = self.update_settings(data.get('settings', {}))
            elif command == 'get_settings':
                response['data'] = self.settings
            elif command == 'list_directory':
                response['data'] = self.file_manager.list_directory(data.get('path', '/'))
            elif command == 'download_file':
                file_path = data.get('path')
                async for chunk_data in self.file_manager.read_file_chunks(file_path):
                    # Send chunk data with progress
                    chunk_response = {
                        'type': 'file_chunk',
                        'client_id': self.client_id,
                        'file_path': file_path,
                        **chunk_data
                    }
                    await self.ws.send(json.dumps(chunk_response))
                return  # Skip normal response
            elif command == 'delete_file':
                response['data'] = self.file_manager.delete_item(data.get('path'))
            elif command == 'create_directory':
                response['data'] = self.file_manager.create_directory(data.get('path'))
            else:
                # Handle other existing commands
                response['data'] = await self.handle_system_command(command, data)

            if self.settings['security']['encryptionEnabled']:
                response = self.encrypt_response(response)
            
            self.logger.info(f"Handled command: {command}")
        except Exception as e:
            self.logger.error(f"Error handling command {command}: {str(e)}")
            response['error'] = str(e)

        await self.ws.send(json.dumps(response))

    async def handle_system_command(self, command, data):
        """Handle system-related commands separately"""
        if command == 'shutdown':
            if platform.system() == 'Windows':
                os.system('shutdown /s /t 0')
            else:
                os.system('shutdown -h now')
            return {'success': True}
        elif command == 'restart':
            if platform.system() == 'Windows':
                os.system('shutdown /r /t 0')
            else:
                os.system('reboot')
            return {'success': True}
        elif command == 'screenshot':
            return self.take_screenshot()
        elif command == 'get_system_info':
            return self.get_system_info()
        elif command == 'block_website':
            return self.block_website(data.get('website'))
        elif command == 'process_list':
            return self.get_process_list()
        elif command == 'block_application':
            return self.block_application(data.get('app_name'))
        elif command == 'unblock_application':
            return self.unblock_application(data.get('app_name'))
        elif command == 'get_blocked_apps':
            return list(self.blocked_apps)
        elif command == 'terminate_process':
            return self.terminate_process(data.get('pid'))
        
        return {'error': 'Unknown command'}

    def update_settings(self, new_settings):
        try:
            # Update monitoring settings
            if 'monitoring' in new_settings:
                self.settings['monitoring'].update(new_settings['monitoring'])
            
            # Update security settings
            if 'security' in new_settings:
                self.settings['security'].update(new_settings['security'])
                # Reconfigure logging if log level changed
                self.setup_logging()

            return {'success': True, 'message': 'Settings updated successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def encrypt_response(self, response):
        if not self.settings['security']['encryptionEnabled']:
            return response
        
        try:
            data = json.dumps(response).encode()
            encrypted_data = self.cipher.encrypt(data)
            return {
                'type': 'encrypted',
                'data': base64.b64encode(encrypted_data).decode('utf-8')
            }
        except Exception as e:
            self.logger.error(f"Encryption error: {str(e)}")
            return response

    async def monitor_system(self):
        while True:
            try:
                if not self.ws:
                    break

                system_info = self.get_system_info()
                cpu_percent = system_info['cpu_percent']
                memory_percent = (system_info['memory_used'] / system_info['memory_total']) * 100

                # Check thresholds
                if self.settings['monitoring']['enableNotifications']:
                    if cpu_percent > self.settings['monitoring']['cpuThreshold']:
                        self.logger.warning(f"CPU usage above threshold: {cpu_percent}%")
                        await self.send_alert('cpu', cpu_percent)
                    
                    if memory_percent > self.settings['monitoring']['memoryThreshold']:
                        self.logger.warning(f"Memory usage above threshold: {memory_percent}%")
                        await self.send_alert('memory', memory_percent)

                await asyncio.sleep(self.settings['monitoring']['updateInterval'])
            except Exception as e:
                self.logger.error(f"Monitoring error: {str(e)}")
                await asyncio.sleep(5)

    async def send_alert(self, alert_type, value):
        alert = {
            'type': 'alert',
            'alert_type': alert_type,
            'value': value,
            'timestamp': datetime.now().isoformat()
        }
        await self.ws.send(json.dumps(alert))

    def get_system_info(self):
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            'hostname': platform.node(),
            'os': platform.system(),
            'os_version': platform.version(),
            'cpu_percent': cpu_percent,
            'memory_total': memory.total,
            'memory_used': memory.used,
            'disk_total': disk.total,
            'disk_used': disk.used,
            'timestamp': datetime.now().isoformat()
        }

    def take_screenshot(self):
        """Take a screenshot and save it to disk"""
        with mss.mss() as sct:
            # Capture the primary monitor
            screen = sct.grab(sct.monitors[1])
            
            # Convert to PIL Image
            img = Image.frombytes('RGB', screen.size, screen.rgb)
            
            # Save the screenshot
            screenshot_path = f"screenshot_{self.client_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            img.save(screenshot_path)
            return {'path': screenshot_path}

    def get_process_list(self):
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'create_time']):
            try:
                pinfo = proc.info
                pinfo['running_time'] = datetime.now().timestamp() - pinfo['create_time']
                processes.append(pinfo)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return processes

    def block_website(self, website):
        hosts_path = "/etc/hosts" if platform.system() != "Windows" else r"C:\Windows\System32\drivers\etc\hosts"
        try:
            with open(hosts_path, 'a') as hosts_file:
                hosts_file.write(f"\n127.0.0.1 {website}\n")
        except PermissionError:
            print("Permission denied - Run as administrator to modify hosts file")

    async def download_file(self, file_path):
        try:
            if not os.path.isfile(file_path):
                return {'error': 'File not found'}

            # Read file in chunks to handle large files
            chunk_size = 1024 * 1024  # 1MB chunks
            chunks = []
            
            with open(file_path, 'rb') as file:
                while True:
                    chunk = file.read(chunk_size)
                    if not chunk:
                        break
                    chunks.append(base64.b64encode(chunk).decode('utf-8'))

            return {
                'success': True,
                'name': os.path.basename(file_path),
                'size': os.path.getsize(file_path),
                'chunks': chunks
            }
        except Exception as e:
            return {'error': str(e)}

    def delete_file(self, path):
        try:
            if os.path.isfile(path):
                os.remove(path)
            elif os.path.isdir(path):
                shutil.rmtree(path)
            return {'success': True, 'message': f'Successfully deleted {path}'}
        except Exception as e:
            return {'error': str(e)}

    def block_application(self, app_name):
        if platform.system() == 'Windows':
            try:
                self.blocked_apps.add(app_name.lower())
                # Add to Windows Registry to persist blocks
                key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, 
                    r"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer\DisallowRun")
                winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, app_name)
                winreg.CloseKey(key)
                return {'success': True, 'message': f'Application {app_name} blocked'}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        return {'success': False, 'error': 'Feature only supported on Windows'}

    def unblock_application(self, app_name):
        if platform.system() == 'Windows':
            try:
                self.blocked_apps.remove(app_name.lower())
                # Remove from Windows Registry
                key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, 
                    r"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer\DisallowRun")
                try:
                    winreg.DeleteValue(key, app_name)
                except WindowsError:
                    pass
                winreg.CloseKey(key)
                return {'success': True, 'message': f'Application {app_name} unblocked'}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        return {'success': False, 'error': 'Feature only supported on Windows'}

    def terminate_process(self, pid):
        try:
            if not pid:
                return {'success': False, 'error': 'No PID provided'}
            
            process = psutil.Process(pid)
            process_name = process.name()
            
            # Check if process exists and terminate it
            if platform.system() == 'Windows':
                process.terminate()
            else:
                os.kill(pid, signal.SIGTERM)
            
            return {
                'success': True,
                'message': f'Process {process_name} (PID: {pid}) terminated successfully'
            }
        except psutil.NoSuchProcess:
            return {'success': False, 'error': f'Process with PID {pid} not found'}
        except psutil.AccessDenied:
            return {'success': False, 'error': f'Access denied when trying to terminate process {pid}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

async def main():
    client = RemoteDesktopClient()
    await client.connect()

if __name__ == "__main__":
    asyncio.run(main())
