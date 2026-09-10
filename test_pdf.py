from api.index import build_keaslian_pdf
import sys

def main():
    try:
        pdf_bytes = build_keaslian_pdf({"nama_penulis": "Andi Saputra"}, "Keaslian Naskah")
        with open("test_keaslian.pdf", "wb") as f:
            f.write(pdf_bytes)
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
