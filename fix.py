import sys
content = open('api/index.py', 'r', encoding='utf-8').read()
idx = content.find('def build_keaslian_pdf(variables: dict, label: str) -> bytes:')
if idx != -1:
    content = content[:idx]
    
route_code = '''
@api.post("/admin-documents/pdf")
async def admin_document_pdf(payload: dict, user: dict = Depends(require_role("admin", "master_admin"))):
    label = str(payload.get("label") or "Dokumen Administrasi").strip()
    variables = payload.get("variables") or {}
    safe_name = re.sub(r"[^a-zA-Z0-9_-]+", "-", label.lower()).strip("-") or "dokumen"
    template_data = payload.get("template") or {}
    
    pdf_bytes = b""
    label_lower = label.lower()
    
    if "spk" in label_lower or "perjanjian" in label_lower:
        pdf_bytes = build_spk_contract_pdf(label, variables, template_data, user)
    elif "keaslian" in label_lower or label == "Keaslian Naskah":
        pdf_bytes = build_keaslian_pdf(variables, label)
    elif "isbn" in label_lower or label == "Permohonan ISBN":
        pdf_bytes = build_isbn_pdf(variables, label)
    elif "loa" in label_lower or label == "LoA" or label == "Letter of Acceptance (LoA)":
        pdf_bytes = build_loa_sktt_pdf(variables, label, False)
    elif "sktt" in label_lower or "terbit" in label_lower or label == "SKTT" or label == "Surat Keterangan Telah Terbit (SKTT)":
        pdf_bytes = build_loa_sktt_pdf(variables, label, True)
    else:
        pdf_bytes = build_generic_admin_doc(label, variables, user)
        
    return RawResponse(
        pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.pdf", "Cache-Control": "no-store"},
    )

app.include_router(api, prefix="/api")
'''
with open('api/index.py', 'w', encoding='utf-8') as f:
    f.write(content + route_code)
