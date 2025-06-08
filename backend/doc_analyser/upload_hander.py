from langchain.document_loaders import PyPDFLoader
import os
from typing import List, Optional
import uuid
import time

temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_docs")
os.makedirs(temp_dir, exist_ok=True)


def save_uploaded_file(uploaded_file, filename: Optional[str] = None) -> str:
    """
    Saves an uploaded file (from an API request) to the temp_dir and returns the saved file path.
    If filename is not provided, a unique one will be generated.
    """
    if not filename:
        # Attempt to get original filename and extension
        original_name = getattr(uploaded_file, "name", "unknown_file")
        name, ext = os.path.splitext(original_name)

        # Sanitize the name part to be filesystem-friendly
        safe_name = "".join(
            c if c.isalnum() or c in (" ", ".", "_") else "_" for c in name
        ).rstrip()

        timestamp = int(time.time())
        unique_id = uuid.uuid4().hex[:8]
        filename = f"{safe_name}_{timestamp}_{unique_id}{ext if ext else '.dat'}"

    file_path = os.path.join(temp_dir, filename)
    with open(file_path, "wb") as f:
        f.write(uploaded_file.read())

    return file_path


def load_uploaded_file(uploaded_file, filename: Optional[str] = None):
    """
    Handles an uploaded file: saves it, loads its content using PyPDFLoader,
    and deletes the file after loading.
    If filename is not provided, a unique one will be generated during save.
    """
    file_path = save_uploaded_file(uploaded_file, filename)

    try:
        loader = PyPDFLoader(file_path)
        docs = loader.load()

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    return docs
