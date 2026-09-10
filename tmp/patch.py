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
