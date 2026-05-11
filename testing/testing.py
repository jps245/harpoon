import sys
import json
import requests
from pathlib import Path

TEST_DIR = Path(r"C:\Users\jps24\OneDrive\Desktop\Projects\Harpoon\harpoon\testing")
INPUT_DIR = TEST_DIR / "input"
OUTPUT_DIR = TEST_DIR / "output"

sys.path.append(r"C:\Users\jps24\OneDrive\Desktop\Projects\Harpoon\harpoon\backend")

def send_file_to_api(input_file: Path, url: str = "http://localhost:8000/analyze"):
    file_path = INPUT_DIR / input_file
    with open(file_path, "rb") as f:
        files = {"file": (str(file_path), f, get_mime_type(str(file_path)))}
        response = requests.post(url, files=files)
    return response.json()

def get_mime_type(file_path: str) -> str:
    if file_path.endswith(".pdf"):
        return "application/pdf"
    elif file_path.endswith(".png"):
        return "image/png"
    raise ValueError(f"Unsupported file type: {file_path}")

def save_results(input_file: Path, results: str):
    output_file = str(input_file).replace(".", "_") + ".json"
    file_path = OUTPUT_DIR / output_file
    with open(file_path , "w") as file:
        json.dump(results, file, indent=4)    

def run_test():
    for _ext in ["png", "pdf"]:
        for input_file in INPUT_DIR.glob(f'*.{_ext}'):
            print(f"processing {input_file}")
            results = send_file_to_api(input_file)
            save_results(input_file, results)

run_test()
