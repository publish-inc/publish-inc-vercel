import os
import re

def main():
    filepath = r'c:\publish-inc-vercel\api\index.py'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Define the new PDF builders
    new_builders = """
def build_keaslian_pdf(variables: dict, label: str) -> bytes:
    styles = {
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=14, leading=20, alignment=TA_CENTER),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=11, leading=16),
        "body_center": ParagraphStyle("body_center", fontName="Helvetica", fontSize=11, leading=16, alignment=TA_CENTER),
    }
    story = [
        Paragraph("SURAT PERNYATAAN KEASLIAN KARYA", styles["title"]),
        Spacer(1, 20),
        Paragraph("Yang bertandatangan di bawah ini :", styles["body"]),
        Spacer(1, 8),
    ]
    t1_data = [
        ["Nama", ":", variables.get("nama_penulis") or "..........................................................."],
        ["Alamat", ":", variables.get("alamat_penulis") or "..........................................................."],
        ["NIK", ":", variables.get("no_ktp") or "..........................................................."],
        ["Telp/HP", ":", variables.get("nomor_wa") or "..........................................................."],
    ]
    t1 = Table(t1_data, colWidths=[25*mm, 5*mm, 130*mm])
    t1.setStyle(TableStyle([("FONT", (0,0), (-1,-1), "Helvetica", 11), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(t1)
    story.extend([
        Spacer(1, 15),
        Paragraph("Menyatakan dengan sesungguhnya, bahwa :", styles["body"]),
        Spacer(1, 8),
    ])
    t2_data = [
        ["Judul", ":", variables.get("judul_buku") or variables.get("judul_naskah") or "..........................................................."],
        ["Penulis", ":", variables.get("nama_penulis") or "..........................................................."],
        ["Editor", ":", variables.get("nama_editor") or "..........................................................."],
    ]
    t2 = Table(t2_data, colWidths=[25*mm, 5*mm, 130*mm])
    t2.setStyle(TableStyle([("FONT", (0,0), (-1,-1), "Helvetica", 11), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(t2)
    story.extend([
        Spacer(1, 15),
        Paragraph("Adalah benar merupakan karya asli yang dibuat untuk diterbitkan dan disebarluaskan secara umum, melalui:", styles["body"]),
        Spacer(1, 8),
    ])
    t3_data = [
        ["Penerbit", ":", "CV. Publish Inc"],
        ["Alamat", ":", "Perum. Mitra Berdikari Asri Blok C1 No 6, Kel. Bulurokeng, Kec. Biringkanaya, Kota Makassar"],
    ]
    t3 = Table(t3_data, colWidths=[25*mm, 5*mm, 130*mm])
    t3.setStyle(TableStyle([("FONT", (0,0), (-1,-1), "Helvetica", 11), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(t3)
    story.extend([
        Spacer(1, 15),
        Paragraph("Demikian surat ini dibuat dengan sebenar-benarnya serta akan menjadi pertanggungjawaban kami jika terdapat penyalahgunaan dan akibat yang ditimbulkannya.", styles["body"]),
        Spacer(1, 40),
    ])
    sig_data = [
        ["Penanggung Jawab Penerbit\\nCV. Publish Inc.", "Penulis"],
        ["", ""],
        ["", ""],
        ["", "Materai 10.000"],
        ["", ""],
        ["Muh Kahfli\\nCEO / Founder", f"({variables.get('nama_penulis') or '................................'})"]
    ]
    sig_table = Table(sig_data, colWidths=[80*mm, 80*mm])
    sig_table.setStyle(TableStyle([("FONT", (0,0), (-1,-1), "Helvetica", 11), ("ALIGN", (0,0), (-1,-1), "CENTER"), ("VALIGN", (0,0), (-1,-1), "BOTTOM")]))
    story.append(sig_table)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=25*mm, bottomMargin=25*mm, title=label)
    doc.build(story)
    return buf.getvalue()


def build_isbn_pdf(variables: dict, label: str) -> bytes:
    styles = {
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=11, leading=16),
        "body_right": ParagraphStyle("body_right", fontName="Helvetica", fontSize=11, leading=16, alignment=TA_RIGHT),
        "body_center": ParagraphStyle("body_center", fontName="Helvetica", fontSize=11, leading=16, alignment=TA_CENTER),
    }
    story = []
    head_data = [
        [f"No.         : {variables.get('no_permohonan') or '...........................'}", f"Makassar, {variables.get('tanggal') or '...........................'}"],
        ["Lamp.        : 1 Bundel", ""],
        ["Perihal        : Permohonan ISBN/Barcode untuk Buku", ""],
    ]
    ht = Table(head_data, colWidths=[100*mm, 60*mm])
    ht.setStyle(TableStyle([("FONT", (0,0), (-1,-1), "Helvetica", 11)]))
    story.append(ht)
    story.extend([
        Spacer(1, 20),
        Paragraph("Kepada :", styles["body"]),
        Paragraph("Yth. Kepala Pusat Bibliografi dan Pengolahan Bahan Perpustakaan<br/>Perpustakaan Nasional RI", styles["body"]),
        Spacer(1, 20),
        Paragraph("Bersama ini kami atas nama,", styles["body"]),
        Spacer(1, 10),
    ])
    t1_data = [
        ["Penerbit", ":", "CV. Publish Inc"],
        ["Penganggung Jawab", ":", "Muh Kahfli"],
        ["Admin", ":", "Aulia"],
    ]
    t1 = Table(t1_data, colWidths=[40*mm, 5*mm, 100*mm])
    t1.setStyle(TableStyle([("FONT", (0,0), (-1,-1), "Helvetica", 11)]))
    story.append(t1)
    story.extend([
        Spacer(1, 10),
        Paragraph("Mengajukan permohonan ISBN untuk,", styles["body"]),
        Spacer(1, 10),
    ])
    t2_data = [
        ["Judul", ":", variables.get("judul_buku") or variables.get("judul_naskah") or "..........................."],
        ["Penulis", ":", variables.get("nama_penulis") or "..........................."],
        ["Link Katalog", ":", "https://publishinc.id/toko"],
        ["Link Akses Penjualan", ":", variables.get("link_penjualan") or "..........................."],
    ]
    t2 = Table(t2_data, colWidths=[40*mm, 5*mm, 115*mm])
    t2.setStyle(TableStyle([("FONT", (0,0), (-1,-1), "Helvetica", 11)]))
    story.append(t2)
    story.extend([
        Spacer(1, 15),
        Paragraph("Bersama ini kami lampirkan dummy buku dan Surat Pernyataan Keaslian Karya dari Penulis.", styles["body"]),
        Spacer(1, 15),
        Paragraph("Demikian permohonan ini kami ajukan, atas perhatian dan kerja samanya diucapkan terima kasih.", styles["body"]),
        Spacer(1, 40),
        Paragraph("Hormat kami,", styles["body_center"]),
        Spacer(1, 60),
        Paragraph("Muh Kahfli<br/>Founder", styles["body_center"]),
    ])
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=25*mm, bottomMargin=25*mm, title=label)
    doc.build(story)
    return buf.getvalue()


def build_loa_sktt_pdf(variables: dict, label: str, is_sktt: bool) -> bytes:
    styles = {
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=14, leading=20, alignment=TA_CENTER),
        "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=12, leading=16, alignment=TA_CENTER),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=11, leading=16),
        "body_right": ParagraphStyle("body_right", fontName="Helvetica", fontSize=11, leading=16, alignment=TA_RIGHT),
    }
    title_text = "Surat Keterangan Telah Terbit Buku" if is_sktt else "Surat Keterangan Proses Terbit Buku"
    nomor = variables.get("no_sktt") if is_sktt else variables.get("no_loa")
    story = [
        Paragraph(title_text, styles["title"]),
        Paragraph(nomor or "...........................", styles["subtitle"]),
        Spacer(1, 20),
        Paragraph("Yang Bertanda tangan di bawah ini :", styles["body"]),
        Spacer(1, 8),
    ]
    t1_data = [
        ["Nama Lengkap", ":", "Lulu Anugrawati"],
        ["Jabatan", ":", "Pimpinan Redaksi"],
        ["Bertindak untuk", ":", "CV. Publish Inc."],
        ["dan Atas nama", "", ""],
    ]
    if is_sktt:
        t1_data.append(["Anggota IKAPI", ":", ""])
    t1_data.extend([
        ["Office", ":", "Perum. Mitra Berdikari Asri Blok C1 No 6, Kel. Bulurokeng, Kec. Biringkanaya, Kota Makassar"],
        ["Phone", ":", "+62 85128071504"],
        ["Website", ":", "www.publishinc.id"],
        ["E-mail", ":", "redaksi@publishinc.id"],
    ])
    t1 = Table(t1_data, colWidths=[35*mm, 5*mm, 120*mm])
    t1.setStyle(TableStyle([("FONT", (0,0), (-1,-1), "Helvetica", 11), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(t1)
    story.extend([
        Spacer(1, 15),
        Paragraph("Menerangkan bahwa telah menerbitkan buku ISBN dengan keterangan sebagai berikut :", styles["body"]),
        Spacer(1, 8),
    ])
    t2_data = [
        ["Judul", ":", variables.get("judul_buku") or variables.get("judul_naskah") or "..........................."],
        ["Penulis", ":", variables.get("nama_penulis") or "..........................."],
        ["ISBN", ":", variables.get("no_isbn") or "..........................."],
        ["Ukuran", ":", variables.get("ukuran") or "..........................."],
    ]
    t2 = Table(t2_data, colWidths=[35*mm, 5*mm, 120*mm])
    t2.setStyle(TableStyle([("FONT", (0,0), (-1,-1), "Helvetica", 11), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(t2)
    story.extend([
        Spacer(1, 15),
        Paragraph("Demikian surat keterangan ini kami buat untuk dapat digunakan sebagaimana mestinya.", styles["body"]),
        Spacer(1, 20),
        Paragraph(f"Makassar, {variables.get('tanggal') or '...........................'}", styles["body"]),
        Spacer(1, 15),
        Paragraph("Best Regard’s<br/>CV. Publish Inc", styles["body"]),
        Spacer(1, 50),
        Paragraph("Lulu Anugrawati<br/>Pimpinan Redaksi", styles["body"]),
    ])
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=25*mm, bottomMargin=25*mm, title=label)
    doc.build(story)
    return buf.getvalue()

def build_generic_admin_doc(label: str, variables: dict, user: dict) -> bytes:
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    margin = 18 * mm
    y = height - 22 * mm
    c.drawImage(get_logo_reader(), margin, y - 12 * mm, width=14 * mm, height=14 * mm, mask="auto", preserveAspectRatio=True)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin + 19 * mm, y - 4 * mm, "Publish Inc.")
    c.setFont("Helvetica", 9)
    c.drawString(margin + 19 * mm, y - 10 * mm, "Dokumen administrasi naskah")
    y -= 30 * mm
    c.setFont("Helvetica-Bold", 20)
    c.drawString(margin, y, label)
    y -= 12 * mm
    rows = [
        ("Nama Penulis", variables.get("nama_penulis")),
        ("Nomor WA", variables.get("nomor_wa")),
        ("Judul Naskah", variables.get("judul_buku") or variables.get("judul_naskah")),
        ("Penerbit", variables.get("penerbit")),
        ("Paket", variables.get("paket")),
        ("Kota Penulis", variables.get("kota_penulis")),
        ("Profesi Penulis", variables.get("profesi_penulis")),
        ("Kode Tracking", variables.get("kode_tracking")),
        ("Tanggal", variables.get("tanggal")),
    ]
    for key, value in rows:
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor("#4B5563"))
        c.drawString(margin, y, key)
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.black)
        for idx, line in enumerate(split_lines(str(value or "-"), "Helvetica", 10, width - margin * 2 - 45 * mm)[:3]):
            c.drawString(margin + 45 * mm, y - (idx * 4.5 * mm), line)
        y -= 10 * mm
    y -= 8 * mm
    c.setStrokeColor(colors.HexColor("#D1D5DB"))
    c.line(margin, y, width - margin, y)
    y -= 10 * mm
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#4B5563"))
    c.drawString(margin, y, "File PDF ini digenerate dari sistem berdasarkan data naskah dan variabel administrasi.")
    y -= 24 * mm
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.black)
    c.drawRightString(width - margin, y, f"Admin: {user.get('name') or user.get('email') or '-'}")
    c.showPage()
    c.save()
    return buf.getvalue()


@api.post("/admin-documents/pdf")
async def admin_document_pdf(payload: dict, user: dict = Depends(require_role("admin", "master_admin"))):
    label = str(payload.get("label") or "Dokumen Administrasi").strip()
    variables = payload.get("variables") or {}
    safe_name = re.sub(r"[^a-zA-Z0-9_-]+", "-", label.lower()).strip("-") or "dokumen"
    template_data = payload.get("template") or {}
    
    pdf_bytes = b""
    label_lower = label.lower()
    
    if label_lower.startswith("spk"):
        pdf_bytes = build_spk_contract_pdf(label, variables, template_data, user)
    elif "keaslian" in label_lower:
        pdf_bytes = build_keaslian_pdf(variables, label)
    elif "isbn" in label_lower:
        pdf_bytes = build_isbn_pdf(variables, label)
    elif "loa" in label_lower:
        pdf_bytes = build_loa_sktt_pdf(variables, label, False)
    elif "sktt" in label_lower:
        pdf_bytes = build_loa_sktt_pdf(variables, label, True)
    else:
        pdf_bytes = build_generic_admin_doc(label, variables, user)
        
    return RawResponse(
        pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.pdf", "Cache-Control": "no-store"},
    )
"""
    
    target_start = '@api.post("/admin-documents/pdf")'
    idx1 = content.find(target_start)
    
    # We want to replace from @api.post("/admin-documents/pdf") until the end of its function definition.
    # We can find the NEXT function definition
    idx2 = content.find('@api.post("/spk/tasks', idx1)
    if idx2 == -1:
        # fallback
        idx2 = content.find('@api.post("/naskah', idx1)
        if idx2 == -1:
             idx2 = len(content)
             
    new_content = content[:idx1] + new_builders + "\n\n" + content[idx2:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Patched index.py successfully")

if __name__ == "__main__":
    main()
