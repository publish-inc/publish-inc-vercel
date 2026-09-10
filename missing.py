    pages: int = 0
    year: str = ""
    featured: bool = False


class NamePrice(BaseModel):
    name: str
    price: int = 0


class PackageInput(BaseModel):
    name: str
    price: int = 0
    publisher: str = "Publish Inc."


class CustomerInput(BaseModel):
    name: str
    phone: str = ""
    instansi: str = ""
    city: str = ""


def slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "buku"


def is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False


def unique_slug(title: str, exclude_id: Optional[str] = None) -> str:
    base = slugify(title)
    slug = base
    i = 2
    while True:
        found = db.one("books", slug=slug)
        if not found or (exclude_id and found["id"] == exclude_id):
            return slug
        slug = f"{base}-{i}"
        i += 1


def public_book(b: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": b["id"],
        "title": b.get("title", ""),
        "author": b.get("author", ""),
        "description": b.get("description", ""),
        "price": b.get("price") or 0,
        "category": b.get("category") or "Umum",
        "cover_url": b.get("cover_url") or "",
        "slug": b.get("slug") or "",
        "isbn": b.get("isbn") or "",
        "pages": b.get("pages") or 0,
        "year": b.get("year") or "",
        "featured": bool(b.get("featured")),
        "is_takedown": bool(b.get("is_takedown")),
        "created_at": b.get("created_at"),
    }


def list_paginated(rows: list[dict[str, Any]], page: int, limit: int) -> dict[str, Any]:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)
    total = len(rows)
    start = (page - 1) * limit
    return {"items": rows[start : start + limit], "total": total, "page": page, "pages": max((total + limit - 1) // limit, 1), "limit": limit}


def compute_totals(data: dict[str, Any]) -> dict[str, Any]:
    service_type = str(data.get("service_type") or "terbit").lower()
    if service_type not in ("terbit", "cetak", "lainnya"):
        service_type = "terbit"
    data["service_type"] = service_type
    pkg = data.get("package") or {}
    jumlah = int(pkg.get("jumlah") or 1) or 1
    pkg_total = int(pkg.get("price") or 0) * jumlah
    fac_total = 0
    facilities = data.get("facilities") or []
    for f in facilities:
        vol = int(f.get("volume") or 0)
        eks = int(f.get("eks") or 0)
        price = int(f.get("price") or 0)
        if vol and eks:
            f["total"] = vol * price * eks
        elif vol:
            f["total"] = vol * price
        elif eks:
            f["total"] = eks * price
        else:
            f["total"] = price
        fac_total += f["total"]
    adj = data.get("adjustments") or {}

    def amount(key: str) -> int:
        item = adj.get(key) or {}
        return int(item.get("amount") or 0) if item.get("on") else 0

    if service_type in ("cetak", "lainnya"):
        facilities = []
        fac_total = 0
    subtotal = pkg_total + fac_total
    data["facilities"] = facilities
    data["package_total"] = pkg_total
    data["facilities_total"] = fac_total
    data["subtotal"] = subtotal
    data["grand_total"] = max(subtotal + amount("ppn") + amount("ongkir") - amount("diskon"), 0)
    return data


def attach_customer(data: dict[str, Any]) -> dict[str, Any]:
    customer_id = data.get("customer_id")
    if customer_id:
        c = db.one("customers", id=customer_id)
        if c:
            data["customer"] = {"name": c.get("name"), "phone": c.get("phone"), "instansi": c.get("instansi"), "city": c.get("city")}
    return data


def next_seq(name: str) -> int:
    counter = db.one("counters", name=name)
    if not counter:
        counter = db.insert("counters", {"name": name, "seq": 999})
    seq = int(counter["seq"]) + 1
    db.update("counters", {"seq": seq}, name=name)
    return seq


def doc_number(prefix: str, seq: int) -> str:
    now = datetime.now(timezone.utc)
    return f"{seq}/{prefix}/Publish-Inc/{now.month:02d}/{now.year}"


def display_doc_number(number: Any, prefix: str) -> str:
    text = str(number or "").strip()
    if not text:
        return ""
    old = re.match(r"^(PNW|INV)/Publish-Inc/(\d{2})/(\d{4})/(\d+)$", text)
    if old:
        return f"{old.group(4)}/{prefix}/Publish-Inc/{old.group(2)}/{old.group(3)}"
    current = re.match(r"^(\d+)/(PNW|INV)/Publish-Inc/(\d{2})/(\d{4})$", text)
    if current:
        return f"{current.group(1)}/{prefix}/Publish-Inc/{current.group(3)}/{current.group(4)}"
    return text


@api.get("/")
async def root():
    return {"message": "Publish Inc. API"}


@api.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower().strip()
    user = db.one("app_users", email=email)
    if not user or not verify_password(payload.password, user.get("password_hash") or ""):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    access = create_access_token(user["id"], email)
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    out = clean_user(user)
    out["token"] = access
    return out


@api.post("/auth/logout")
async def logout(response: Response, user: dict[str, Any] = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logout berhasil"}


@api.get("/auth/me")
async def me(user: dict[str, Any] = Depends(get_current_user)):
    return user


@api.get("/users")
async def list_users(user: dict[str, Any] = Depends(require_role("master_admin", "hrd"))):
    return [clean_user(u) for u in db.list("app_users", {"order": "created_at.asc"})]


@api.post("/users")
async def create_user(payload: UserInput, user: dict[str, Any] = Depends(require_role("master_admin", "hrd"))):
    email = payload.email.lower().strip()
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Role tidak valid")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    if db.one("app_users", email=email):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    doc = db.insert("app_users", {"name": payload.name, "email": email, "password_hash": hash_password(payload.password), "role": payload.role, "created_at": now_iso()})
    return clean_user(doc)


@api.put("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, user: dict[str, Any] = Depends(require_role("master_admin", "hrd"))):
    updates: dict[str, Any] = {}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.email is not None:
        email = payload.email.lower().strip()
        existing = db.one("app_users", email=email)
        if existing and existing["id"] != user_id:
            raise HTTPException(status_code=400, detail="Email sudah digunakan akun lain")
        updates["email"] = email
    if payload.role is not None:
        if payload.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail="Role tidak valid")
        updates["role"] = payload.role
    if payload.password:
        if len(payload.password) < 6:
            raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
        updates["password_hash"] = hash_password(payload.password)
    doc = db.update("app_users", updates, id=user_id) if updates else db.one("app_users", id=user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    return clean_user(doc)


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict[str, Any] = Depends(require_role("master_admin", "hrd"))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus akun Anda sendiri")
    if not db.one("app_users", id=user_id):
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    db.delete("app_users", id=user_id)
    return {"message": "User dihapus"}


def signature_to_transparent_png(data: bytes) -> bytes:
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    out = []
    for r, g, b, a in im.getdata():
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        if lum >= 200:
            out.append((r, g, b, 0))
        elif lum >= 150:
            out.append((r, g, b, int(a * (200 - lum) / 50)))
        else:
            out.append((r, g, b, a))
    im.putdata(out)
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


@api.post("/users/{user_id}/signature")
async def upload_user_signature(user_id: str, file: UploadFile = File(...), user: dict[str, Any] = Depends(require_role("master_admin", "hrd"))):
    if not db.one("app_users", id=user_id):
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    data = await file.read()
    try:
        png = signature_to_transparent_png(data)
    except Exception:
        raise HTTPException(status_code=400, detail="File gambar tidak valid")
    path = f"{APP_NAME}/signatures/user-{user_id}-{uuid.uuid4()}.png"
    url = db.upload(path, png, "image/png")
    db.insert("files", {"storage_path": path, "public_url": url, "original_filename": file.filename, "content_type": "image/png", "size": len(png), "created_at": now_iso()})
    db.update("app_users", {"signature_path": path, "signature_url": url}, id=user_id)
    return {"url": url, "path": path}


@api.get("/content")
async def get_content():
    row = db.one("site_content", key="landing")
    if not row:
        row = db.insert("site_content", {"key": "landing", "content": DEFAULT_CONTENT, "updated_at": now_iso()})
    return deep_merge(DEFAULT_CONTENT, row.get("content") or {})

@api.get("/books")
async def list_books(category: Optional[str] = None, featured: Optional[bool] = None):
    books = [public_book(b) for b in db.list("books", {"order": "created_at.desc"}) if not b.get("is_takedown")]
    if category and category != "Semua":
        books = [b for b in books if b.get("category") == category]
    if featured is not None:
        books = [b for b in books if b.get("featured") is featured]
    return books[:500]


@api.get("/admin/books")
async def admin_list_books(page: int = 1, limit: int = 10, category: Optional[str] = None, q: Optional[str] = None, show_takedown: bool = False, user: dict[str, Any] = Depends(require_role("admin"))):
    books = [public_book(b) for b in db.list("books", {"order": "created_at.desc"}) if bool(b.get("is_takedown")) is show_takedown]
    if category and category != "Semua":
        books = [b for b in books if b.get("category") == category]
    if q:
        needle = q.lower()
        books = [b for b in books if needle in b["title"].lower() or needle in b["author"].lower()]
    return list_paginated(books, page, limit)


@api.get("/books/categories")
async def list_categories():
    return sorted({b.get("category") for b in db.list("books") if b.get("category")})


@api.get("/books/{identifier}")
async def get_book(identifier: str):
    book = db.one("books", id=identifier) if is_uuid(identifier) else None
    book = book or db.one("books", slug=identifier)
    if not book or book.get("is_takedown"):
        raise HTTPException(status_code=404, detail="Buku tidak ditemukan")
    return public_book(book)


@api.post("/books")
async def create_book(payload: BookInput, user: dict[str, Any] = Depends(require_role("admin"))):
    doc = payload.model_dump()
    doc["slug"] = unique_slug(payload.title)
    doc["created_at"] = now_iso()
    return public_book(db.insert("books", doc))


@api.put("/books/{book_id}")
async def update_book(book_id: str, payload: BookInput, user: dict[str, Any] = Depends(require_role("admin"))):
    doc = payload.model_dump()
    doc["slug"] = unique_slug(payload.title, exclude_id=book_id)
    updated = db.update("books", doc, id=book_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Buku tidak ditemukan")
    return public_book(updated)


@api.put("/books/{book_id}/takedown")
async def toggle_book_takedown(book_id: str, payload: dict[str, Any], user: dict[str, Any] = Depends(require_role("admin"))):
    updated = db.update("books", {"is_takedown": bool(payload.get("is_takedown"))}, id=book_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Buku tidak ditemukan")
    return public_book(updated)


@api.delete("/books/{book_id}")
async def delete_book(book_id: str, user: dict[str, Any] = Depends(require_role("admin"))):
    db.delete("books", id=book_id)
    return {"message": "Buku dihapus"}


@api.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict[str, Any] = Depends(require_role("admin", "master_admin"))):
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "png"
    if ext not in MIME_TYPES:
        raise HTTPException(status_code=400, detail="Format harus JPG, PNG, WEBP, atau GIF")
    data = await file.read()
    path = f"{APP_NAME}/covers/{uuid.uuid4()}.{ext}"
    url = db.upload(path, data, MIME_TYPES[ext])
    db.insert("files", {"storage_path": path, "public_url": url, "original_filename": file.filename, "content_type": MIME_TYPES[ext], "size": len(data), "created_at": now_iso()})
    return {"url": url, "path": path}


@api.get("/files/{path:path}")
async def serve_file(path: str):
    row = db.one("files", storage_path=path)
    if not row or row.get("is_deleted"):
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    data, content_type = db.download(path)
    return RawResponse(content=data, media_type=row.get("content_type") or content_type)


@api.get("/cs/packages")
async def cs_packages(user: dict[str, Any] = Depends(require_role("master_admin", "cs"))):
    return db.list("cs_packages", {"order": "name.asc"})


@api.post("/cs/packages")
async def cs_create_package(p: PackageInput, user: dict[str, Any] = Depends(require_role("master_admin"))):
    return db.insert("cs_packages", p.model_dump())


@api.put("/cs/packages/{pid}")
async def cs_update_package(pid: str, p: PackageInput, user: dict[str, Any] = Depends(require_role("master_admin"))):
    updated = db.update("cs_packages", p.model_dump(), id=pid)
    if not updated:
        raise HTTPException(status_code=404, detail="Paket tidak ditemukan")
    return updated
