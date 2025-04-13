import os
import shutil
import base64
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
from datetime import datetime

@dataclass
class FileInfo:
    name: str
    path: str
    size: int
    modified: str
    is_directory: bool
    checksum: Optional[str] = None

class FileManager:
    def __init__(self, base_path: str = None):
        self.base_path = base_path or os.path.expanduser('~')
        self.chunk_size = 1024 * 1024  # 1MB chunks
        self.transfer_progress: Dict[str, float] = {}

    def _validate_path(self, path: str) -> str:
        """Validate and normalize file path to prevent directory traversal attacks"""
        try:
            requested_path = os.path.abspath(path)
            base_path = os.path.abspath(self.base_path)
            
            if not requested_path.startswith(base_path):
                raise ValueError("Access denied: Path is outside the allowed directory")
            
            return requested_path
        except Exception as e:
            raise ValueError(f"Invalid path: {str(e)}")

    def _calculate_checksum(self, file_path: str) -> str:
        """Calculate MD5 checksum of a file"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    def list_directory(self, path: str) -> Dict[str, Union[List[FileInfo], str]]:
        """List contents of a directory with error handling"""
        try:
            full_path = self._validate_path(path)
            if not os.path.exists(full_path):
                raise FileNotFoundError(f"Path does not exist: {path}")
            
            if not os.path.isdir(full_path):
                raise NotADirectoryError(f"Path is not a directory: {path}")

            items = []
            for item in os.scandir(full_path):
                try:
                    stats = item.stat()
                    items.append(FileInfo(
                        name=item.name,
                        path=os.path.join(path, item.name),
                        size=stats.st_size if item.is_file() else 0,
                        modified=datetime.fromtimestamp(stats.st_mtime).isoformat(),
                        is_directory=item.is_dir()
                    ))
                except (PermissionError, OSError) as e:
                    continue  # Skip files we can't access

            return {
                'success': True,
                'items': sorted(items, key=lambda x: (not x.is_directory, x.name.lower())),
                'current_path': path
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    async def read_file_chunks(self, file_path: str):
        """Generator function to read file in chunks with progress tracking"""
        try:
            full_path = self._validate_path(file_path)
            if not os.path.isfile(full_path):
                raise FileNotFoundError(f"File not found: {file_path}")

            file_size = os.path.getsize(full_path)
            bytes_read = 0
            checksum = hashlib.md5()

            with open(full_path, 'rb') as file:
                while chunk := file.read(self.chunk_size):
                    checksum.update(chunk)
                    bytes_read += len(chunk)
                    progress = (bytes_read / file_size) * 100
                    self.transfer_progress[file_path] = progress
                    
                    yield {
                        'chunk': base64.b64encode(chunk).decode('utf-8'),
                        'progress': progress,
                        'total_size': file_size
                    }

            # Final response with checksum
            yield {
                'complete': True,
                'checksum': checksum.hexdigest(),
                'total_size': file_size
            }
            
            del self.transfer_progress[file_path]

        except Exception as e:
            yield {
                'error': str(e)
            }
            if file_path in self.transfer_progress:
                del self.transfer_progress[file_path]

    def delete_item(self, path: str) -> Dict[str, Union[bool, str]]:
        """Delete a file or directory with validation and error handling"""
        try:
            full_path = self._validate_path(path)
            if not os.path.exists(full_path):
                raise FileNotFoundError(f"Path does not exist: {path}")

            if os.path.isfile(full_path):
                os.remove(full_path)
            else:
                shutil.rmtree(full_path)

            return {
                'success': True,
                'message': f'Successfully deleted {path}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def create_directory(self, path: str) -> Dict[str, Union[bool, str]]:
        """Create a new directory with validation"""
        try:
            full_path = self._validate_path(path)
            if os.path.exists(full_path):
                raise FileExistsError(f"Path already exists: {path}")

            os.makedirs(full_path)
            return {
                'success': True,
                'message': f'Directory created: {path}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_transfer_progress(self, file_path: str) -> float:
        """Get the current progress of a file transfer"""
        return self.transfer_progress.get(file_path, 0.0)